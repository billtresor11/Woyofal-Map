import { describe, expect, it } from 'vitest';
import { getTemplate } from './catalog.js';
import { computeConsumption, defaultSelection } from './consumption.js';
import { splitHousehold } from './split.js';
import { getTariffPlan } from './tariffs.js';
import type { ApplianceInput, MemberInput } from './types.js';

const plan = getTariffPlan('WOYOFAL_DPP');

function appliance(
  id: string,
  templateId: string,
  ownership: 'SHARED' | 'PRIVATE',
  ownerId?: string,
): ApplianceInput {
  const template = getTemplate(templateId);
  return {
    id,
    label: template.name,
    templateId,
    ownership,
    ownerId: ownerId ?? null,
    consumption: computeConsumption(template, defaultSelection(template)),
  };
}

const members: MemberInput[] = [
  { id: 'a', name: 'Awa', color: '#F97316' },
  { id: 'b', name: 'Babacar', color: '#0EA5E9' },
  { id: 'c', name: 'Coumba', color: '#22C55E' },
];

describe('répartition de la facture', () => {
  it('partage les appareils communs a parts egales', () => {
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances: [appliance('1', 'refrigerateur', 'SHARED')],
      plan,
    });
    const parts = result.members.map((m) => m.kwhTotal);
    expect(parts[0]).toBeCloseTo(parts[1]!, 3);
    expect(parts[1]).toBeCloseTo(parts[2]!, 3);
  });

  it('met un appareil privé entièrement a la charge de son propriétaire', () => {
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances: [appliance('1', 'climatiseur', 'PRIVATE', 'b')],
      plan,
    });
    const babacar = result.members.find((m) => m.memberId === 'b')!;
    expect(babacar.sharePercent).toBe(100);
    expect(result.members.filter((m) => m.memberId !== 'b').every((m) => m.kwhTotal === 0)).toBe(
      true,
    );
  });

  it('applique la règle : commun ÷ nombre d’occupants + appareils personnels', () => {
    const frigo = appliance('1', 'refrigerateur', 'SHARED');
    const pc = appliance('2', 'ordinateur', 'PRIVATE', 'b');
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances: [frigo, pc],
      plan,
    });

    const commun = frigo.consumption.kwhPerMonth / members.length;
    const awa = result.members.find((m) => m.memberId === 'a')!;
    const babacar = result.members.find((m) => m.memberId === 'b')!;

    expect(awa.kwhTotal).toBeCloseTo(commun, 1);
    expect(babacar.kwhTotal).toBeCloseTo(commun + pc.consumption.kwhPerMonth, 1);
  });

  it('divise un appareil commun entre les seules personnes qui le partagent', () => {
    const clim = appliance('1', 'climatiseur', 'SHARED');
    // La climatisation de la chambre partagée par Awa et Babacar uniquement.
    clim.shares = { a: 1, b: 1 };

    const result = splitHousehold({ month: '2026-08', members, appliances: [clim], plan });
    const moitie = clim.consumption.kwhPerMonth / 2;

    expect(result.members.find((m) => m.memberId === 'a')!.kwhShared).toBeCloseTo(moitie, 1);
    expect(result.members.find((m) => m.memberId === 'b')!.kwhShared).toBeCloseTo(moitie, 1);
    expect(result.members.find((m) => m.memberId === 'c')!.kwhShared).toBe(0);
  });

  it('affecte une session ponctuelle a son auteur', () => {
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances: [appliance('1', 'refrigerateur', 'SHARED')],
      punctualUsages: [{ id: 'p1', label: 'PlayStation', memberId: 'c', kwh: 10 }],
      plan,
    });
    const coumba = result.members.find((m) => m.memberId === 'c')!;
    expect(coumba.kwhPunctual).toBeCloseTo(10, 2);
    expect(coumba.kwhTotal).toBeGreaterThan(result.members.find((m) => m.memberId === 'a')!.kwhTotal);
  });

  it('la somme des parts est egale a la facture du foyer', () => {
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances: [
        appliance('1', 'refrigerateur', 'SHARED'),
        appliance('2', 'televiseur', 'SHARED'),
        appliance('3', 'climatiseur', 'PRIVATE', 'a'),
        appliance('4', 'ordinateur', 'PRIVATE', 'b'),
        appliance('5', 'ampoules', 'SHARED'),
      ],
      plan,
    });
    const sum = result.members.reduce((total, m) => total + m.amountToPay, 0);
    expect(Math.abs(sum - result.totalAmount)).toBeLessThanOrEqual(result.members.length);
  });

  it('met les parts a l’échelle du releve réel quand il est connu', () => {
    const appliances = [appliance('1', 'refrigerateur', 'SHARED')];
    const estimated = appliances[0]!.consumption.kwhPerMonth;
    const result = splitHousehold({
      month: '2026-08',
      members,
      appliances,
      plan,
      actualKwh: estimated * 2,
    });
    expect(result.totalKwh).toBeCloseTo(estimated * 2, 1);
    const total = result.members.reduce((sum, m) => sum + m.kwhTotal, 0);
    expect(total).toBeCloseTo(estimated * 2, 1);
  });

  it('ne perd aucun kWh quand il n y a aucun membre', () => {
    const result = splitHousehold({
      month: '2026-08',
      members: [],
      appliances: [appliance('1', 'refrigerateur', 'SHARED')],
      plan,
    });
    expect(result.unassignedKwh).toBeCloseTo(result.totalKwh, 2);
  });
});
