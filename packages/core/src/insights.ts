import { computeMonthlyBill, marginalCost } from './billing.js';
import type { ApplianceInput, TariffPlan } from './types.js';

/**
 * Mise en forme et pédagogie : transformer un nombre de kWh en quelque chose
 * qu’on comprend sans être technicien.
 */

export function formatFcfa(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

export interface CostEquivalent {
  emoji: string;
  label: string;
  count: number;
}

/** Repères du quotidien pour donner une échelle à un montant. */
const EQUIVALENTS: Array<{ emoji: string; unit: number; singular: string; plural: string }> = [
  { emoji: '💧', unit: 50, singular: 'sachet d’eau', plural: 'sachets d’eau' },
  { emoji: '🫖', unit: 200, singular: 'verre d’ataya', plural: 'verres d’ataya' },
  { emoji: '🥖', unit: 175, singular: 'pain', plural: 'pains' },
  { emoji: '🚌', unit: 250, singular: 'trajet en bus', plural: 'trajets en bus' },
  { emoji: '📱', unit: 1000, singular: 'crédit téléphone de 1 000 F', plural: 'crédits téléphone de 1 000 F' },
  { emoji: '🍚', unit: 4500, singular: 'sac de riz de 5 kg', plural: 'sacs de riz de 5 kg' },
];

export function costEquivalents(amount: number, max = 2): CostEquivalent[] {
  return EQUIVALENTS.map((eq) => ({ ...eq, count: amount / eq.unit }))
    .filter((eq) => eq.count >= 1 && eq.count <= 60)
    .sort((a, b) => a.count - b.count)
    .slice(0, max)
    .map((eq) => ({
      emoji: eq.emoji,
      label: Math.round(eq.count) > 1 ? eq.plural : eq.singular,
      count: Math.round(eq.count),
    }));
}

export interface ApplianceCost {
  applianceId: string;
  label: string;
  templateId: string;
  alwaysOn: boolean;
  kwhPerMonth: number;
  /** Coût mensuel de cet appareil, au prix moyen du foyer. */
  amountPerMonth: number;
  sharePercent: number;
}

/**
 * Classement des appareils par coût. On valorise chaque appareil au prix MOYEN
 * du foyer : sinon le dernier appareil ajouté à la liste porterait à lui seul
 * toute la tranche 3, ce qui n’aurait aucun sens pour l’utilisateur.
 */
export function rankAppliances(appliances: ApplianceInput[], plan: TariffPlan): ApplianceCost[] {
  const totalKwh = appliances.reduce((sum, a) => sum + a.consumption.kwhPerMonth, 0);
  const bill = computeMonthlyBill(totalKwh, plan);
  const energyAmount = bill.totalTTC - bill.fixedFee;

  return appliances
    .map((appliance) => {
      const kwh = appliance.consumption.kwhPerMonth;
      return {
        applianceId: appliance.id,
        label: appliance.label,
        templateId: appliance.templateId,
        alwaysOn: appliance.consumption.alwaysOn,
        kwhPerMonth: Math.round(kwh * 10) / 10,
        amountPerMonth: totalKwh > 0 ? Math.round((kwh / totalKwh) * energyAmount) : 0,
        sharePercent: totalKwh > 0 ? Math.round((kwh / totalKwh) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.kwhPerMonth - a.kwhPerMonth);
}

export interface PunctualEstimate {
  kwh: number;
  amount: number;
  /** Prix réellement payé pour ce kWh supplementaire, tranche courante incluse. */
  pricePerKwh: number;
  tierLabel: string;
  durationMinutes: number;
  équivalents: CostEquivalent[];
  /** Même session repetee tous les jours pendant un mois. */
  monthlyIfDaily: number;
}

/**
 * Estimateur d’action ponctuelle : "combien coûte 3h de PlayStation ce soir ?"
 * Le prix depend de la tranche déjà atteinte dans le mois : c’est tout
 * l’intérêt de passer par `marginalCost`.
 */
export function estimatePunctual(
  kwh: number,
  durationMinutes: number,
  plan: TariffPlan,
  alreadyConsumedKwh = 0,
): PunctualEstimate {
  const bill = marginalCost(alreadyConsumedKwh, kwh, plan);
  const dailyMonth = marginalCost(alreadyConsumedKwh, kwh * 30.4375, plan);

  return {
    kwh: Math.round(kwh * 1000) / 1000,
    amount: bill.totalTTC,
    pricePerKwh: bill.averagePricePerKwh,
    tierLabel: bill.currentTier.label,
    durationMinutes,
    équivalents: costEquivalents(bill.totalTTC),
    monthlyIfDaily: dailyMonth.totalTTC,
  };
}
