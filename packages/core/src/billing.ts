import type { BillLine, BillResult, TariffPlan, TariffTier } from './types.js';

/**
 * ---------------------------------------------------------------------------
 * ALGORITHME DE FACTURATION PAR TRANCHES (Senelec / Woyofal)
 * ---------------------------------------------------------------------------
 *
 * Principe : le prix du kWh n'est pas unique. Il augmente par paliers.
 * Chaque kWh est facture au prix de la tranche dans laquelle il tombe,
 * en fonction du CUMUL déjà consomme sur la période de référence.
 *
 *   Exemple (grille Woyofal DPP), 300 kWh dans le mois :
 *     - les 150 premiers kWh  -> 150 x 91,17  = 13 675,50 FCFA
 *     - les 100 suivants      -> 100 x 101,44 = 10 144,00 FCFA
 *     - les 50 derniers       ->  50 x 116,35 =  5 817,50 FCFA
 *   ... puis TVA (la tranche sociale en est exonérée) et frais fixes.
 *
 * Consequence produit, invisible mais decisive : le "prix d'un kWh" depend
 * du moment du mois. Une session de PlayStation le 3 du mois ne coûte pas la
 * même chose que la même session le 28. C'est pourquoi toutes les fonctions
 * acceptent `previousKwh` : les kWh déjà consommés sur la période.
 */

/** Nombre de jours moyen d'un mois (365,25 / 12). */
export const DAYS_PER_MONTH = 30.4375;

export function roundFcfa(value: number): number {
  return Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Retourne la tranche dans laquelle tombe un cumul de kWh donne. */
export function findTier(cumulativeKwh: number, plan: TariffPlan): TariffTier {
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  for (const tier of tiers) {
    if (tier.toKwh === null || cumulativeKwh < tier.toKwh) return tier;
  }
  const last = tiers[tiers.length - 1];
  if (!last) throw new Error(`La grille ${plan.code} ne contient aucune tranche.`);
  return last;
}

/**
 * Decoupe une consommation en portions, tranche par tranche.
 * C'est le coeur de l'algorithme : tout le reste n'est que mise en forme.
 */
export function sliceByTier(
  previousKwh: number,
  kwh: number,
  plan: TariffPlan,
): Array<{ tier: TariffTier; kwh: number }> {
  const slices: Array<{ tier: TariffTier; kwh: number }> = [];
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  let cursor = Math.max(0, previousKwh);
  let remaining = Math.max(0, kwh);

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const upper = tier.toKwh ?? Number.POSITIVE_INFINITY;
    if (cursor >= upper) continue; // tranche déjà dépassée par le cumul anterieur
    const room = upper - Math.max(cursor, tier.fromKwh);
    const take = Math.min(remaining, room);
    if (take > 0) {
      slices.push({ tier, kwh: take });
      cursor += take;
      remaining -= take;
    }
  }

  // Sécurité : si la dernière tranche est bornee, on facture le reliquat a son prix.
  if (remaining > 0) {
    const last = tiers[tiers.length - 1];
    if (last) slices.push({ tier: last, kwh: remaining });
  }
  return slices;
}

export interface BillOptions {
  /** kWh déjà consommés sur la période de référence (défaut : 0). */
  previousKwh?: number;
  /** Inclure la redevance / location compteur (défaut : true). */
  includeFixedFee?: boolean;
}

/**
 * Facture une quantité de kWh sur la PERIODE DE REFERENCE de la grille
 * (1 mois en prépayé Woyofal, 2 mois en postpayé).
 */
export function computeBill(kwh: number, plan: TariffPlan, options: BillOptions = {}): BillResult {
  const previousKwh = Math.max(0, options.previousKwh ?? 0);
  const includeFixedFee = options.includeFixedFee ?? true;
  const safeKwh = Math.max(0, kwh);

  const lines: BillLine[] = sliceByTier(previousKwh, safeKwh, plan).map((slice) => {
    const amountHT = slice.kwh * slice.tier.pricePerKwh;
    const vat = slice.tier.vatExempt ? 0 : amountHT * plan.vatRate;
    return {
      tierOrder: slice.tier.order,
      tierLabel: slice.tier.label,
      kwh: round2(slice.kwh),
      pricePerKwh: slice.tier.pricePerKwh,
      amountHT: round2(amountHT),
      vat: round2(vat),
      amountTTC: round2(amountHT + vat),
    };
  });

  const energyHT = lines.reduce((sum, line) => sum + line.amountHT, 0);
  const vat = lines.reduce((sum, line) => sum + line.vat, 0);
  const municipalTax = energyHT * plan.municipalTaxRate;
  const fixedFee = includeFixedFee ? plan.fixedFeePerMonth * plan.periodMonths : 0;
  const totalTTC = energyHT + vat + municipalTax + fixedFee;

  const cumulative = previousKwh + safeKwh;
  const currentTier = findTier(cumulative, plan);
  const nextTier =
    plan.tiers.find((t) => t.order === currentTier.order + 1) ?? null;
  const kwhToNextTier =
    currentTier.toKwh === null ? null : round2(Math.max(0, currentTier.toKwh - cumulative));

  return {
    kwh: round2(safeKwh),
    previousKwh: round2(previousKwh),
    lines,
    energyHT: round2(energyHT),
    vat: round2(vat),
    municipalTax: round2(municipalTax),
    fixedFee: round2(fixedFee),
    totalTTC: roundFcfa(totalTTC),
    averagePricePerKwh: safeKwh > 0 ? round2(totalTTC / safeKwh) : 0,
    currentTier,
    kwhToNextTier,
    nextTier,
    planCode: plan.code,
  };
}

/**
 * Facture une consommation MENSUELLE, quelle que soit la périodicité de la grille.
 * En postpayé bimestriel, on raisonne sur 2 mois (les seuils portent sur le cumul
 * des deux mois) puis on ramene le résultat au mois.
 */
export function computeMonthlyBill(
  monthlyKwh: number,
  plan: TariffPlan,
  options: BillOptions = {},
): BillResult {
  if (plan.periodMonths === 1) return computeBill(monthlyKwh, plan, options);

  const periodBill = computeBill(monthlyKwh * plan.periodMonths, plan, options);
  const ratio = 1 / plan.periodMonths;
  return {
    ...periodBill,
    kwh: round2(monthlyKwh),
    lines: periodBill.lines.map((line) => ({
      ...line,
      kwh: round2(line.kwh * ratio),
      amountHT: round2(line.amountHT * ratio),
      vat: round2(line.vat * ratio),
      amountTTC: round2(line.amountTTC * ratio),
    })),
    energyHT: round2(periodBill.energyHT * ratio),
    vat: round2(periodBill.vat * ratio),
    municipalTax: round2(periodBill.municipalTax * ratio),
    fixedFee: round2(periodBill.fixedFee * ratio),
    totalTTC: roundFcfa(periodBill.totalTTC * ratio),
    kwhToNextTier:
      periodBill.kwhToNextTier === null ? null : round2(periodBill.kwhToNextTier * ratio),
  };
}

/**
 * Coût REEL d'une consommation supplementaire, sachant ce qui a déjà été
 * consomme dans le mois. C'est la fonction utilisee par l'estimateur ponctuel
 * ("combien me coûte 3h de PlayStation ce soir ?").
 */
export function marginalCost(
  previousKwh: number,
  additionalKwh: number,
  plan: TariffPlan,
): BillResult {
  return computeBill(additionalKwh, plan, { previousKwh, includeFixedFee: false });
}

/**
 * Question numéro 1 des utilisateurs Woyofal :
 * "Avec 5 000 FCFA de recharge, je reçois combien de kWh ?"
 * On parcourt les tranches en consommant le budget palier par palier.
 */
export function kwhForAmount(
  amount: number,
  plan: TariffPlan,
  previousKwh = 0,
): { kwh: number; amount: number; lines: BillLine[] } {
  let budget = Math.max(0, amount);
  let cursor = Math.max(0, previousKwh);
  let totalKwh = 0;
  const lines: BillLine[] = [];
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);

  for (const tier of tiers) {
    if (budget <= 0) break;
    const upper = tier.toKwh ?? Number.POSITIVE_INFINITY;
    if (cursor >= upper) continue;

    const unitPrice =
      tier.pricePerKwh * (1 + (tier.vatExempt ? 0 : plan.vatRate) + plan.municipalTaxRate);
    const room = upper - Math.max(cursor, tier.fromKwh);
    const affordable = budget / unitPrice;
    const take = Math.min(room, affordable);

    if (take > 0) {
      const amountHT = take * tier.pricePerKwh;
      const vatLine = tier.vatExempt ? 0 : amountHT * plan.vatRate;
      lines.push({
        tierOrder: tier.order,
        tierLabel: tier.label,
        kwh: round2(take),
        pricePerKwh: tier.pricePerKwh,
        amountHT: round2(amountHT),
        vat: round2(vatLine),
        amountTTC: round2(take * unitPrice),
      });
      totalKwh += take;
      cursor += take;
      budget -= take * unitPrice;
    }
  }

  return { kwh: round2(totalKwh), amount: roundFcfa(amount), lines };
}

export interface TierProgressSegment {
  tier: TariffTier;
  kwh: number;
  amount: number;
  /** Largeur relative (0-1) pour la jauge de l'interface. */
  ratio: number;
  reached: boolean;
}

/**
 * Alimente la jauge "Ou j'en suis dans mes tranches ?".
 * L'utilisateur ne lit pas un tableau : il voit une barre qui change de couleur.
 */
export function tierProgress(monthlyKwh: number, plan: TariffPlan): {
  segments: TierProgressSegment[];
  scaleKwh: number;
  currentTier: TariffTier;
  kwhToNextTier: number | null;
} {
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  const lastBoundary = tiers.reduce((max, t) => Math.max(max, t.toKwh ?? 0), 0);
  const scaleKwh = Math.max(lastBoundary * 1.2, monthlyKwh * 1.1, 100);
  const slices = sliceByTier(0, monthlyKwh, plan);

  const segments: TierProgressSegment[] = tiers.map((tier) => {
    const kwh = slices.filter((s) => s.tier.order === tier.order).reduce((a, s) => a + s.kwh, 0);
    const amountHT = kwh * tier.pricePerKwh;
    const amount = amountHT * (1 + (tier.vatExempt ? 0 : plan.vatRate) + plan.municipalTaxRate);
    return {
      tier,
      kwh: round2(kwh),
      amount: roundFcfa(amount),
      ratio: scaleKwh > 0 ? kwh / scaleKwh : 0,
      reached: kwh > 0,
    };
  });

  const currentTier = findTier(monthlyKwh, plan);
  return {
    segments,
    scaleKwh: round2(scaleKwh),
    currentTier,
    kwhToNextTier:
      currentTier.toKwh === null ? null : round2(Math.max(0, currentTier.toKwh - monthlyKwh)),
  };
}
