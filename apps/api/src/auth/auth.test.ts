import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// La configuration doit être posée AVANT que le serveur ne soit importé :
// le client Prisma et le secret de session sont lus au chargement des modules.
process.env.DATABASE_URL = 'file:./test.db';
process.env.GOOGLE_CLIENT_ID = 'client-de-test.apps.googleusercontent.com';
process.env.SESSION_SECRET = 'secret-de-test-suffisamment-long-pour-passer';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { buildServer } = await import('../server.js');
const { prisma } = await import('../db.js');
import type { GoogleIdentity } from './google.js';

/** Fausse vérification Google : le jeton porte directement l'identité. */
async function fakeVerify(credential: string): Promise<GoogleIdentity> {
  const [googleId, email, name] = credential.split('|');
  if (!googleId || !email) throw new Error('jeton invalide');
  return { googleId, email, name: name ?? 'Testeur' };
}

const app = await buildServer({ verifyGoogle: fakeVerify });

/** Ouvre une session et renvoie le cookie à rejouer. */
async function connecter(googleId: string, email: string, name: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/google',
    payload: { credential: `${googleId}|${email}|${name}` },
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find((c) => c.name === 'woyofal_session');
  expect(cookie, 'un cookie de session doit être posé').toBeDefined();
  return { cookie: `woyofal_session=${cookie!.value}`, body: response.json() };
}

beforeAll(async () => {
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('connexion Google', () => {
  it('refuse un jeton que Google ne reconnaît pas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: { credential: 'jeton-fabrique-de-toutes-pieces' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('crée le compte à la première connexion, puis le retrouve', async () => {
    const premiere = await connecter('g-awa', 'awa@example.com', 'Awa');
    expect(premiere.body.user.email).toBe('awa@example.com');

    const seconde = await connecter('g-awa', 'awa.nouvelle@example.com', 'Awa Diop');
    // Le compte est retrouvé par son identifiant Google, pas par l'adresse.
    expect(seconde.body.user.id).toBe(premiere.body.user.id);
    expect(seconde.body.user.email).toBe('awa.nouvelle@example.com');
    expect(await prisma.user.count()).toBe(1);
  });

  it('retrouve la session ouverte au démarrage suivant', async () => {
    const { cookie, body } = await connecter('g-babacar', 'babacar@example.com', 'Babacar');

    const anonyme = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(anonyme.json().user).toBeNull();

    const connecte = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(connecte.json().user.id).toBe(body.user.id);
  });

  it('ferme la session à la déconnexion', async () => {
    const { cookie } = await connecter('g-coumba', 'coumba@example.com', 'Coumba');
    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    const efface = logout.cookies.find((c) => c.name === 'woyofal_session');
    expect(efface?.value).toBe('');
  });
});

describe('accès aux foyers', () => {
  it('rattache le foyer créé au compte connecté', async () => {
    const { cookie, body } = await connecter('g-proprio', 'proprio@example.com', 'Fatou');
    const creation = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { cookie },
      payload: { name: 'Maison Fatou', members: [{ name: 'Fatou' }] },
    });
    expect(creation.statusCode).toBe(201);
    expect(creation.json().userId).toBe(body.user.id);

    const mien = await app.inject({ method: 'GET', url: '/api/households/mine', headers: { cookie } });
    expect(mien.json().household.name).toBe('Maison Fatou');
  });

  it('exige une connexion pour lire un foyer', async () => {
    const { cookie } = await connecter('g-seul', 'seul@example.com', 'Seul');
    const creation = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { cookie },
      payload: { name: 'Maison Seule' },
    });
    const id = creation.json().id;

    const sansCookie = await app.inject({ method: 'GET', url: `/api/households/${id}/summary` });
    expect(sansCookie.statusCode).toBe(401);
  });

  it('cache le foyer d’un autre compte', async () => {
    const proprietaire = await connecter('g-alpha', 'alpha@example.com', 'Alpha');
    const creation = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { cookie: proprietaire.cookie },
      payload: { name: 'Maison A' },
    });
    const id = creation.json().id;

    const intrus = await connecter('g-beta', 'beta@example.com', 'Beta');
    const lecture = await app.inject({
      method: 'GET',
      url: `/api/households/${id}/summary`,
      headers: { cookie: intrus.cookie },
    });
    // 404 et non 403 : on ne confirme même pas que ce foyer existe.
    expect(lecture.statusCode).toBe(404);

    const ecriture = await app.inject({
      method: 'POST',
      url: `/api/households/${id}/appliances`,
      headers: { cookie: intrus.cookie },
      payload: { templateId: 'refrigerateur' },
    });
    expect(ecriture.statusCode).toBe(404);

    // Et l'intrus n'a toujours pas de foyer à lui.
    const sien = await app.inject({
      method: 'GET',
      url: '/api/households/mine',
      headers: { cookie: intrus.cookie },
    });
    expect(sien.json().household).toBeNull();
  });
});
