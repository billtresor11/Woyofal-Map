import { APPLIANCE_TEMPLATES, TARIFF_PLANS, computeConsumption, defaultSelection } from '@woyofal/core';
import { prisma } from './db.js';
import { syncApplianceTemplates, syncTariffPlans } from './services/catalog.sync.js';

/**
 * Seed : recopie le catalogue et les grilles tarifaires du moteur vers la base,
 * puis créé un foyer de démonstration pour que l’application ne soit jamais vide.
 */
async function seedDemoHousehold() {
  const existing = await prisma.household.findFirst({ where: { name: 'Maison Démo (Dakar)' } });
  if (existing) {
    console.log('  foyer de démonstration : déjà présent');
    return existing.id;
  }

  const household = await prisma.household.create({
    data: {
      name: 'Maison Démo (Dakar)',
      tariffCode: 'WOYOFAL_DPP',
      meterType: 'PREPAID',
      subscribedKva: 5,
      monthlyBudget: 35_000,
      members: {
        create: [
          { name: 'Awa', color: '#F97316' },
          { name: 'Babacar', color: '#0EA5E9' },
          { name: 'Coumba', color: '#22C55E' },
        ],
      },
      rooms: {
        create: [
          { name: 'Salon', emoji: '🛋️', kind: 'SHARED' },
          { name: 'Cuisine', emoji: '🍳', kind: 'SHARED' },
          { name: 'Chambre 1', emoji: '🛏️', kind: 'PRIVATE' },
        ],
      },
    },
    include: { members: true, rooms: true },
  });

  const salon = household.rooms.find((room) => room.name === 'Salon');
  const chambre = household.rooms.find((room) => room.name === 'Chambre 1');
  const awa = household.members.find((member) => member.name === 'Awa');

  const demoAppliances: Array<{
    templateId: string;
    options?: Record<string, string>;
    usageProfileId?: string;
    ownership: 'SHARED' | 'PRIVATE';
    ownerId?: string | null;
    roomId?: string | null;
    quantity?: number;
  }> = [
    { templateId: 'refrigerateur', options: { taille: 'moyen', etat: 'moyen' }, ownership: 'SHARED', roomId: salon?.id },
    { templateId: 'televiseur', options: { taille: 'p43' }, usageProfileId: 'soir', ownership: 'SHARED', roomId: salon?.id },
    { templateId: 'decodeur', ownership: 'SHARED', roomId: salon?.id },
    { templateId: 'box_internet', ownership: 'SHARED', roomId: salon?.id },
    { templateId: 'ampoules', options: { type: 'led' }, usageProfileId: 'soir', ownership: 'SHARED', quantity: 8 },
    { templateId: 'ventilateur', options: { type: 'pied' }, usageProfileId: 'nuit', ownership: 'SHARED', quantity: 2 },
    { templateId: 'fer_repasser', usageProfileId: 'hebdo', ownership: 'SHARED' },
    { templateId: 'machine_laver', options: { programme: 'froid', sechage: 'non' }, usageProfileId: 'deux', ownership: 'SHARED' },
    {
      templateId: 'climatiseur',
      options: { puissance: 'cv1_5', techno: 'classique', reglage: 'moyen' },
      usageProfileId: 'nuit',
      ownership: 'PRIVATE',
      ownerId: awa?.id,
      roomId: chambre?.id,
    },
  ];

  for (const item of demoAppliances) {
    const template = APPLIANCE_TEMPLATES.find((t) => t.id === item.templateId);
    if (!template) continue;
    const base = defaultSelection(template);
    const selection = {
      ...base,
      options: { ...base.options, ...(item.options ?? {}) },
      usageProfileId: item.usageProfileId ?? base.usageProfileId,
      quantity: item.quantity ?? base.quantity,
    };
    const consumption = computeConsumption(template, selection);

    await prisma.appliance.create({
      data: {
        householdId: household.id,
        templateId: template.id,
        label: template.name,
        optionsJson: JSON.stringify(selection.options),
        usageProfileId: selection.usageProfileId ?? null,
        quantity: consumption.quantity,
        ownership: item.ownership,
        ownerId: item.ownerId ?? null,
        roomId: item.roomId ?? null,
        watts: consumption.watts,
        dutyCycle: consumption.dutyCycle,
        hoursPerDay: consumption.hoursPerDay,
        daysPerWeek: consumption.daysPerWeek,
        alwaysOn: consumption.alwaysOn,
        kwhPerDay: consumption.kwhPerDay,
        kwhPerMonth: consumption.kwhPerMonth,
      },
    });
  }

  console.log(`  foyer de démonstration : ${household.id} (${demoAppliances.length} appareils)`);
  return household.id;
}

async function main() {
  console.log('Seed Woyofal Map...');
  console.log(`  grilles tarifaires : ${await syncTariffPlans()}`);
  console.log(`  appareils du catalogue : ${await syncApplianceTemplates()}`);
  await seedDemoHousehold();
  console.log('Terminé.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
