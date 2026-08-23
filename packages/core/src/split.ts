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
 * REPARTITION DE LA FACTURE (colocation / famille)
 * ---------------------------------------------------------------------------
 * Regle de justice retenue, volontairement simple a expliquer a table :
 *
 *  1. Un appareil PRIVE (le PC d une chambre, une clim de chambre) est
 *     entierement a la charge de son proprietaire.
 *  2. Un appareil COMMUN (frigo, tele du salon, pompe a eau) est partage
 *     au prorata de la PRESENCE de chacun dans le mois. Celui qui part deux
 *     semaines en voyage paie deux fois moins les charges communes.
 *  3. Les kWh sont convertis en FCFA au PRIX MOYEN du foyer, pas au prix
 *     marginal. Sinon le dernier a consommer paierait la tranche 3 pour tout
 *     le monde : injuste et incomprehensible.
 *  4. La redevance fixe eventuelle est partagee a parts egales.
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
   * Consommation reelle du mois si elle est connue (releve compteur ou somme
   * des recharges Woyofal). Elle remplace l estimation pour la repartition,
   * les parts de chacun restant calculees sur l inventaire.
   */
  actualKwh?: number;
}

export function splitHousehold(input: SplitInput): HouseholdSplit {
  const { members, appliances, plan } = input;
  const punctualUsages = input.punctualUsages ?? [];

  const byMember = new Map<string, { shared: number; private: number; punctual: number }>();
  for (const member of members) {
    byMember.set(member.id, { shared: 0, private: 0, punctual: 0 });
  }
  let unassignedKwh = 0;

  // Poids de partage des charges communes : la presence de chacun.
  const weights = new Map<string, number>();
  let totalWeight = 0;
  for (const member of members) {
    const weight = Math.max(0, member.presenceRatio ?? 1);
    weights.set(member.id, weight);
    totalWeight += weight;
  }
  if (totalWeight === 0 && members.length > 0) {
    for (const member of members) weights.set(member.id, 1);
    totalWeight = members.length;
  }

  const estimatedKwh = appliances.reduce((sum, a) => sum + a.consumption.kwhPerMonth, 0);
  const punctualKwh = punctualUsages.reduce((sum, u) => sum + u.kwh, 0);
  const inventoryKwh = estimatedKwh + punctualKwh;

  for (const appliance of appliances) {
    const kwh = appliance.consumption.kwhPerMonth;
    const owner = appliance.ownerId ? byMember.get(appliance.ownerId) : undefined;

    if (appliance.ownership === 'PRIVATE' && owner) {
      owner.private += kwh;
      continue;
    }

    // Appareil commun (ou prive sans proprietaire identifie).
    if (members.length === 0 || totalWeight === 0) {
      unassignedKwh += kwh;
      continue;
    }

    // Ponderation explicite par membre si elle est fournie, sinon la presence.
    const shares = appliance.shares;
    if (shares && Object.keys(shares).length > 0) {
      const sum = Object.values(shares).reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (const [memberId, share] of Object.entries(shares)) {
          const bucket = byMember.get(memberId);
          if (bucket) bucket.shared += (kwh * share) / sum;
        }
        continue;
      }
    }

    for (const member of members) {
      const bucket = byMember.get(member.id);
      if (bucket) bucket.shared += (kwh * (weights.get(member.id) ?? 0)) / totalWeight;
    }
  }

  for (const usage of punctualUsages) {
    const bucket = usage.memberId ? byMember.get(usage.memberId) : undefined;
    if (bucket) bucket.punctual += usage.kwh;
    else if (members.length > 0 && totalWeight > 0) {
      for (const member of members) {
        const b = byMember.get(member.id);
        if (b) b.shared += (usage.kwh * (weights.get(member.id) ?? 0)) / totalWeight;
      }
    } else unassignedKwh += usage.kwh;
  }

  // Facture du foyer : c est elle qui donne le prix moyen du kWh.
  const totalKwh = input.actualKwh ?? inventoryKwh;
  const bill = computeMonthlyBill(totalKwh, plan);
  const energyAmount = bill.totalTTC - bill.fixedFee;
  const fixedPerMember = members.length > 0 ? bill.fixedFee / members.length : 0;

  // Si un releve reel est fourni, on met les parts a l echelle de la realite.
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
