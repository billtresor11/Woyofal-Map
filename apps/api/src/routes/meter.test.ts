import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// La configuration doit être posée AVANT l'import du serveur.
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
delete process.env.GOOGLE_CLIENT_ID; // sans compte : l'API reste ouverte

const { buildServer } = await import('../server.js');
const { prisma } = await import('../db.js');

const app = await buildServer();

/** Crée un foyer avec une ampoule, pour avoir une consommation non nulle. */
async function creerFoyer(nom = 'Foyer test compteur') {
  const creation = await app.inject({
    method: 'POST',
    url: '/api/households',
    payload: { name: nom, tariffCode: 'WOYOFAL_DPP', members: [{ name: 'Awa' }, { name: 'Moussa' }] },
  });
  expect(creation.statusCode).toBe(201);
  return creation.json() as { id: string; members: Array<{ id: string; name: string }> };
}

beforeAll(async () => {
  await prisma.meterReading.deleteMany();
  await prisma.household.deleteMany();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('relevés du compteur', () => {
  it('enregistre un relevé et le retrouve dans l’historique', async () => {
    const foyer = await creerFoyer();

    const releve = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 42.5, note: 'Relevé du soir' },
    });
    expect(releve.statusCode).toBe(201);
    expect(releve.json().remainingKwh).toBe(42.5);

    const liste = await app.inject({ method: 'GET', url: `/api/households/${foyer.id}/readings` });
    expect(liste.statusCode).toBe(200);
    expect(liste.json().readings).toHaveLength(1);
  });

  it('reconstitue la consommation entre deux relevés', async () => {
    const foyer = await creerFoyer('Foyer deux relevés');
    const hier = new Date(Date.now() - 86_400_000);

    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 60, readAt: hier.toISOString() },
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 48 },
    });

    // 60 − 48 = 12 kWh consommés, sans recharge entre les deux.
    expect(second.json().consumedKwh).toBe(12);
  });

  it('laisse le consommé vide quand le crédit remonte sans recharge connue', async () => {
    const foyer = await creerFoyer('Foyer recharge oubliée');
    const hier = new Date(Date.now() - 86_400_000);

    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 10, readAt: hier.toISOString() },
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 90 },
    });

    expect(second.json().consumedKwh).toBeNull();
  });

  it('refuse un relevé daté du futur', async () => {
    const foyer = await creerFoyer('Foyer futur');
    const demain = new Date(Date.now() + 86_400_000);
    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 20, readAt: demain.toISOString() },
    });
    expect(reponse.statusCode).toBe(400);
  });

  it('refuse un nombre de kWh absurde', async () => {
    const foyer = await creerFoyer('Foyer valeur absurde');
    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: -5 },
    });
    expect(reponse.statusCode).toBe(422);
  });

  it('remonte le crédit restant et sa source dans le tableau de bord', async () => {
    const foyer = await creerFoyer('Foyer tableau de bord');
    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances`,
      payload: { templateId: 'ampoules', quantity: 5 },
    });
    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 35 },
    });

    const resume = await app.inject({ method: 'GET', url: `/api/households/${foyer.id}/summary` });
    const corps = resume.json();
    expect(corps.consumedSoFar.remainingKwh).toBe(35);
    expect(corps.credit).not.toBeNull();
    expect(corps.credit.daysLeft).toBeGreaterThan(0);
    expect(corps.buckets).toHaveLength(3);
    expect(typeof corps.keyFact).toBe('string');
  });
});

describe('conseil de recharge', () => {
  it('demande l’inventaire quand le foyer est vide', async () => {
    const foyer = await creerFoyer('Foyer sans appareil');
    const conseil = await app.inject({
      method: 'GET',
      url: `/api/households/${foyer.id}/recharge-advice`,
    });
    expect(conseil.statusCode).toBe(200);
    expect(conseil.json().strategy).toBe('rien_a_faire');
  });

  it('propose des montants avec les kWh reçus et les jours couverts', async () => {
    const foyer = await creerFoyer('Foyer conseil');
    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances`,
      payload: { templateId: 'refrigerateur' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/readings`,
      payload: { remainingKwh: 4 },
    });

    const conseil = (await app.inject({
      method: 'GET',
      url: `/api/households/${foyer.id}/recharge-advice`,
    })).json();

    expect(conseil.options.length).toBeGreaterThan(0);
    expect(conseil.options[0].kwh).toBeGreaterThan(0);
    expect(conseil.credit).not.toBeNull();
    expect(conseil.estimatedKwhPerDay).toBeGreaterThan(0);
    expect(conseil.daysLeftInMonth).toBeGreaterThan(0);
  });
});

describe('ajout en masse avec ventilation', () => {
  it('crée une ligne par groupe : 9 ampoules en 4 + 2 + 3', async () => {
    const foyer = await creerFoyer('Foyer neuf ampoules');
    const [awa, moussa] = foyer.members;

    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances/bulk`,
      payload: {
        templateId: 'ampoules',
        total: 9,
        groups: [
          { memberId: null, quantity: 4 },
          { memberId: awa!.id, quantity: 2 },
          { memberId: moussa!.id, quantity: 3 },
        ],
      },
    });

    expect(reponse.statusCode).toBe(201);
    const { appliances } = reponse.json();
    expect(appliances).toHaveLength(3);
    expect(appliances.map((a: { quantity: number }) => a.quantity)).toEqual([4, 2, 3]);
    expect(appliances[0].ownership).toBe('SHARED');
    expect(appliances[1].ownership).toBe('PRIVATE');
    expect(appliances[1].label).toContain('Awa');
  });

  it('verse au pot commun ce que personne n’a pris', async () => {
    const foyer = await creerFoyer('Foyer reste commun');
    const [awa] = foyer.members;

    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances/bulk`,
      payload: {
        templateId: 'ampoules',
        total: 6,
        groups: [{ memberId: awa!.id, quantity: 2 }],
      },
    });

    const { appliances } = reponse.json();
    const commun = appliances.find((a: { ownership: string }) => a.ownership === 'SHARED');
    expect(commun.quantity).toBe(4);
  });

  it('refuse une ventilation qui dépasse le total annoncé', async () => {
    const foyer = await creerFoyer('Foyer trop réparti');
    const [awa, moussa] = foyer.members;

    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances/bulk`,
      payload: {
        templateId: 'ampoules',
        total: 3,
        groups: [
          { memberId: awa!.id, quantity: 3 },
          { memberId: moussa!.id, quantity: 4 },
        ],
      },
    });

    expect(reponse.statusCode).toBe(400);
    expect(reponse.json().message).toContain('de trop');
  });

  it('refuse une personne qui n’appartient pas au foyer', async () => {
    const foyer = await creerFoyer('Foyer inconnu');
    const reponse = await app.inject({
      method: 'POST',
      url: `/api/households/${foyer.id}/appliances/bulk`,
      payload: {
        templateId: 'ampoules',
        total: 2,
        groups: [{ memberId: 'personne-qui-nexiste-pas', quantity: 2 }],
      },
    });
    expect(reponse.statusCode).toBe(400);
  });
});
