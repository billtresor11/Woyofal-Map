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
 *     Part d'un occupant  =  (coût de chaque appareil COMMUN / nombre de personnes
 *                              qui le partagent)
 *                          +  coût mensuel de SES appareils personnels
 *                          +  coût de SES sessions ponctuelles du mois
 *
 * Par défaut un appareil commun est partagé par tout le foyer. On peut restreindre
 * la liste (la climatisation d'une chambre partagée par deux personnes seulement) :
 * le coût est alors divisé entre ces personnes-là.
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

  let unassignedKwh = 0;

  /**
   * Qui partage cet appareil ? Les personnes explicitement désignées, ou bien
   * tout le foyer si aucune restriction n'a été posée.
   */
  function sharersOf(appliance: ApplianceInput): MemberInput[] {
    const shares = appliance.shares;
    if (!shares) return members;
    const chosen = members.filter((member) => (shares[member.id] ?? 0) > 0);
    return chosen.length > 0 ? chosen : members;
  }

  // 1. Chaque appareil est réparti entre ceux qui le concernent.
  for (const appliance of appliances) {
    const kwh = appliance.consumption.kwhPerMonth;
    const owner = appliance.ownerId ? byMember.get(appliance.ownerId) : undefined;

    if (appliance.ownership === 'PRIVATE' && owner) {
      owner.private += kwh;
      continue;
    }

    // Commun, ou personnel sans propriétaire identifié : c'est du commun.
    const sharers = sharersOf(appliance);
    if (sharers.length === 0) {
      unassignedKwh += kwh;
      continue;
    }
    const each = kwh / sharers.length;
    for (const member of sharers) {
      const bucket = byMember.get(member.id);
      if (bucket) bucket.shared += each;
    }
  }

  // 2. Les sessions ponctuelles suivent la même logique.
  for (const usage of punctualUsages) {
    const bucket = usage.memberId ? byMember.get(usage.memberId) : undefined;
    if (bucket) {
      bucket.punctual += usage.kwh;
    } else if (occupants > 0) {
      const each = usage.kwh / occupants;
      for (const member of members) {
        const shared = byMember.get(member.id);
        if (shared) shared.shared += each;
      }
    } else {
      unassignedKwh += usage.kwh;
    }
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
