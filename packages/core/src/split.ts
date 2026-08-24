import { computeMonthlyBill } from './billing.js';
import type {
  ApplianceInput,
  HouseholdSplit,
  MemberInput,
  MemberSplit,
  PunctualUsageInput,
  TariffPlan,
} from './types.js';

/**
 * ---------------------------------------------------------------------------
 * RÉPARTITION DE LA FACTURE (colocation / famille)
 * ---------------------------------------------------------------------------
 * La règle, volontairement simple à expliquer autour d'une table :
 *
 *     Part d'un occupant  =  (coût mensuel des appareils COMMUNS / nombre d'occupants)
 *                          +  coût mensuel de SES appareils personnels
 *                          +  coût de SES sessions ponctuelles du mois
 *
 * Deux précisions qui évitent les disputes :
 *
 *  - La facture du foyer est d'abord calculée EN ENTIER, tranches comprises.
 *    Les kWh de chacun sont ensuite valorisés au PRIX MOYEN du foyer. Sinon le
 *    dernier à consommer porterait à lui seul toute la tranche 3, ce qui serait
 *    injuste et incompréhensible.
 *  - La somme des parts est donc toujours égale à la facture, au franc près.
 */

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface SplitInput {
  month: string;
  members: MemberInput[];
  appliances: ApplianceInput[];
  punctualUsages?: PunctualUsageInput[];
  plan: TariffPlan;
  /**
   * Consommation réelle du mois si elle est connue (relevé compteur ou somme
   * des recharges Woyofal). Elle remplace l'estimation, les parts de chacun
   * restant calculées à partir de l'inventaire.
   */
  actualKwh?: number;
}

export function splitHousehold(input: SplitInput): HouseholdSplit {
  const { members, appliances, plan } = input;
  const punctualUsages = input.punctualUsages ?? [];
  const occupants = members.length;

  const byMember = new Map<string, { shared: number; private: number; punctual: number }>();
  for (const member of members) {
    byMember.set(member.id, { shared: 0, private: 0, punctual: 0 });
  }

  let commonKwh = 0;
  let unassignedKwh = 0;

  // 1. Séparer les appareils communs des appareils personnels.
  for (const appliance of appliances) {
    const kwh = appliance.consumption.kwhPerMonth;
    const owner = appliance.ownerId ? byMember.get(appliance.ownerId) : undefined;

    if (appliance.ownership === 'PRIVATE' && owner) {
      owner.private += kwh;
    } else {
      // Commun, ou personnel sans propriétaire identifié : c'est du commun.
      commonKwh += kwh;
    }
  }

  // 2. Les sessions ponctuelles suivent la même logique.
  for (const usage of punctualUsages) {
    const bucket = usage.memberId ? byMember.get(usage.memberId) : undefined;
    if (bucket) bucket.punctual += usage.kwh;
    else commonKwh += usage.kwh;
  }

  // 3. Le commun se divise à parts égales entre les occupants.
  if (occupants > 0) {
    const sharePerMember = commonKwh / occupants;
    for (const member of members) {
      const bucket = byMember.get(member.id);
      if (bucket) bucket.shared = sharePerMember;
    }
  } else {
    unassignedKwh = commonKwh;
  }

  const inventoryKwh =
    appliances.reduce((sum, a) => sum + a.consumption.kwhPerMonth, 0) +
    punctualUsages.reduce((sum, u) => sum + u.kwh, 0);

  // 4. La facture du foyer, tranches comprises, donne le prix moyen du kWh.
  const totalKwh = input.actualKwh ?? inventoryKwh;
  const bill = computeMonthlyBill(totalKwh, plan);
  const energyAmount = bill.totalTTC - bill.fixedFee;
  const fixedPerMember = occupants > 0 ? bill.fixedFee / occupants : 0;

  // Si un relevé réel est fourni, on met les parts à l'échelle de la réalité.
  const scale = inventoryKwh > 0 ? totalKwh / inventoryKwh : 0;

  const memberSplits: MemberSplit[] = members.map((member) => {
    const bucket = byMember.get(member.id) ?? { shared: 0, private: 0, punctual: 0 };
    const kwhShared = bucket.shared * scale;
    const kwhPrivate = bucket.private * scale;
    const kwhPunctual = bucket.punctual * scale;
    const kwhTotal = kwhShared + kwhPrivate + kwhPunctual;
    const energy = totalKwh > 0 ? (kwhTotal / totalKwh) * energyAmount : 0;

    return {
      memberId: member.id,
      name: member.name,
      emoji: member.emoji,
      color: member.color,
      kwhShared: round(kwhShared),
      kwhPrivate: round(kwhPrivate),
      kwhPunctual: round(kwhPunctual),
      kwhTotal: round(kwhTotal),
      sharePercent: totalKwh > 0 ? round((kwhTotal / totalKwh) * 100, 1) : 0,
      energyAmount: Math.round(energy),
      fixedAmount: Math.round(fixedPerMember),
      amountToPay: Math.round(energy + fixedPerMember),
    };
  });

  return {
    month: input.month,
    totalKwh: round(totalKwh),
    totalAmount: bill.totalTTC,
    averagePricePerKwh: bill.averagePricePerKwh,
    members: memberSplits.sort((a, b) => b.kwhTotal - a.kwhTotal),
    unassignedKwh: round(unassignedKwh * scale),
  };
}
