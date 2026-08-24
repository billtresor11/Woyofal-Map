import { computeBill, findTier, kwhForAmount, roundFcfa } from './billing.js';
import { forecastCredit, type CreditForecast } from './calibration.js';
import type { TariffPlan, TariffTier } from './types.js';

/**
 * ---------------------------------------------------------------------------
 * SMART RECHARGE — LE CONSEILLER D'ACHAT
 * ---------------------------------------------------------------------------
 *
 * Le fait qui change tout, et que presque personne n'exploite :
 *
 *   En prépayé, la tranche est appliquée AU MOMENT DE L'ACHAT, sur le cumul
 *   de kWh achetés depuis le 1er du mois. Ce cumul retombe à zéro le 1er.
 *
 * Autrement dit : deux personnes qui consomment exactement pareil ne payent
 * pas pareil. Celle qui achète 30 000 F d'un coup le 5 grimpe en tranche 3 et
 * paye ses derniers kWh 159 F. Celle qui achète en deux fois, à cheval sur le
 * changement de mois, repasse en tranche 1 à 82 F. Même courant, même maison,
 * jusqu'à 40 % d'écart sur la facture.
 *
 * Ce module transforme ce fait en un conseil, en trois questions :
 *   1. Combien de courant me reste-t-il, et combien de jours ça tient ?
 *   2. Combien me faut-il pour tenir jusqu'au 1er ?
 *   3. Est-ce que ça vaut le coup d'attendre le 1er pour le reste ?
 *
 * L'utilisateur ne voit jamais ce raisonnement : il lit « achetez 2 500 F
 * aujourd'hui, le reste le 1er — vous économisez 3 200 F ».
 */

/** Montants d'achat proposés par défaut, tels qu'on les demande en boutique. */
const DEFAULT_AMOUNTS = [1_000, 2_000, 5_000, 10_000, 20_000];

export type RechargeStrategy =
  | 'rien_a_faire'
  | 'minimum_vital'
  | 'recharge_normale'
  | 'meilleur_moment';

export interface RechargeOption {
  amount: number;
  kwh: number;
  /** Nombre de jours que cette recharge couvre, au rythme actuel du foyer. */
  daysCovered: number;
  averagePricePerKwh: number;
  /** Cette recharge fait-elle basculer dans une tranche plus chère ? */
  crossesTier: boolean;
  tierLabels: string[];
}

export interface WaitPlan {
  /** À acheter aujourd'hui : le strict nécessaire pour tenir jusqu'au 1er. */
  nowKwh: number;
  nowAmount: number;
  /** À acheter le 1er, une fois les tranches remises à zéro. */
  laterKwh: number;
  laterAmount: number;
  /** Ce que coûterait le même volume acheté en une seule fois aujourd'hui. */
  allAtOnceAmount: number;
  savings: number;
}

export interface RechargeAdvice {
  strategy: RechargeStrategy;
  emoji: string;
  title: string;
  message: string;
  /** Jours restants avant la remise à zéro des tranches. */
  daysLeftInMonth: number;
  resetOn: Date;
  currentTier: TariffTier;
  purchasedKwhThisMonth: number;
  /** kWh nécessaires pour tenir jusqu'au 1er. */
  kwhNeededUntilReset: number;
  /** Ce qu'il manque, une fois le crédit restant déduit. */
  deficitKwh: number;
  recommendedKwh: number;
  recommendedAmount: number;
  waitPlan: WaitPlan | null;
  options: RechargeOption[];
  credit: CreditForecast | null;
}

export interface RechargeAdviceInput {
  plan: TariffPlan;
  /**
   * kWh déjà achetés depuis le 1er du mois. C'est ce cumul — et non la
   * consommation — qui détermine le prix du prochain kWh acheté.
   */
  purchasedKwhThisMonth: number;
  /** Crédit restant lu sur le boîtier mural. `null` si jamais relevé. */
  remainingKwh: number | null;
  estimatedKwhPerDay: number;
  now?: Date;
  amounts?: number[];
}

const MS_PER_DAY = 86_400_000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** On n'achète pas 2 347 F de courant : on demande 2 400 F au boutiquier. */
function roundUpTo(amount: number, step = 100): number {
  return Math.ceil(amount / step) * step;
}

/** Premier jour du mois suivant : l'instant où les tranches repartent de zéro. */
export function nextResetDate(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function daysUntilReset(now: Date): number {
  return round2((nextResetDate(now).getTime() - now.getTime()) / MS_PER_DAY);
}

/** Prix TTC d'un volume de kWh acheté maintenant, sachant le cumul du mois. */
export function costOfKwh(kwh: number, plan: TariffPlan, purchasedKwhThisMonth = 0): number {
  if (kwh <= 0) return 0;
  return computeBill(kwh, plan, {
    previousKwh: purchasedKwhThisMonth,
    includeFixedFee: false,
  }).totalTTC;
}

function buildOption(
  amount: number,
  plan: TariffPlan,
  purchased: number,
  perDay: number,
): RechargeOption {
  const result = kwhForAmount(amount, plan, purchased);
  const tierLabels = result.lines.map((line) => line.tierLabel);
  return {
    amount,
    kwh: result.kwh,
    daysCovered: perDay > 0 ? round2(result.kwh / perDay) : 0,
    averagePricePerKwh: result.kwh > 0 ? round2(amount / result.kwh) : 0,
    crossesTier: new Set(tierLabels).size > 1,
    tierLabels: [...new Set(tierLabels)],
  };
}

/**
 * Le conseil d'achat. Tout est calculé ici ; l'interface ne fait que l'afficher.
 */
export function rechargeAdvice(input: RechargeAdviceInput): RechargeAdvice {
  const now = input.now ?? new Date();
  const plan = input.plan;
  const perDay = Math.max(0, input.estimatedKwhPerDay);
  const purchased = Math.max(0, input.purchasedKwhThisMonth);
  const daysLeft = daysUntilReset(now);
  const resetOn = nextResetDate(now);
  const currentTier = findTier(purchased, plan);

  const credit =
    input.remainingKwh === null ? null : forecastCredit(input.remainingKwh, perDay, now);

  const kwhNeededUntilReset = round2(perDay * daysLeft);
  const deficitKwh = round2(Math.max(0, kwhNeededUntilReset - (input.remainingKwh ?? 0)));

  // Volume de référence pour comparer les stratégies : un mois de courant.
  const kwhForOneMonth = round2(perDay * 30);

  const options = (input.amounts ?? DEFAULT_AMOUNTS).map((amount) =>
    buildOption(amount, plan, purchased, perDay),
  );

  /**
   * Vaut-il mieux tout acheter maintenant, ou juste de quoi tenir jusqu'au 1er
   * et compléter après la remise à zéro ? On chiffre les deux, sans supposer.
   */
  const laterKwh = round2(Math.max(0, kwhForOneMonth - deficitKwh));
  const allAtOnce = costOfKwh(deficitKwh + laterKwh, plan, purchased);
  const enDeuxFois = costOfKwh(deficitKwh, plan, purchased) + costOfKwh(laterKwh, plan, 0);
  const savings = roundFcfa(allAtOnce - enDeuxFois);

  const waitPlan: WaitPlan | null =
    deficitKwh > 0 && laterKwh > 0 && savings > 0
      ? {
          nowKwh: deficitKwh,
          nowAmount: roundUpTo(costOfKwh(deficitKwh, plan, purchased)),
          laterKwh,
          laterAmount: roundUpTo(costOfKwh(laterKwh, plan, 0)),
          allAtOnceAmount: roundUpTo(allAtOnce),
          savings,
        }
      : null;

  // --- Choix de la stratégie -----------------------------------------------
  // L'ordre des tests compte : on répond d'abord à l'urgence, ensuite au prix.

  const creditSuffit = credit !== null && credit.remainingKwh >= kwhNeededUntilReset;

  if (perDay <= 0) {
    return {
      strategy: 'rien_a_faire',
      emoji: '🧺',
      title: 'Ajoutez d’abord vos appareils',
      message:
        'Sans inventaire, impossible de savoir combien de courant il vous faut. Passez par « Mes appareils », ça prend deux minutes.',
      daysLeftInMonth: daysLeft,
      resetOn,
      currentTier,
      purchasedKwhThisMonth: purchased,
      kwhNeededUntilReset: 0,
      deficitKwh: 0,
      recommendedKwh: 0,
      recommendedAmount: 0,
      waitPlan: null,
      options,
      credit,
    };
  }

  if (creditSuffit) {
    const jours = credit ? Math.floor(credit.daysLeft) : 0;
    return {
      strategy: 'rien_a_faire',
      emoji: '😎',
      title: 'Rien à acheter pour l’instant',
      message: `Votre crédit tient environ ${jours} jours, soit largement jusqu’au 1er. Attendez la remise à zéro des tranches : vos prochains kWh seront au prix le plus bas.`,
      daysLeftInMonth: daysLeft,
      resetOn,
      currentTier,
      purchasedKwhThisMonth: purchased,
      kwhNeededUntilReset,
      deficitKwh: 0,
      recommendedKwh: 0,
      recommendedAmount: 0,
      waitPlan: null,
      options,
      credit,
    };
  }

  // Fin de mois + tranche chère : c'est le cas où le conseil rapporte le plus.
  if (currentTier.order >= 2 && waitPlan !== null && daysLeft <= 12) {
    return {
      strategy: 'minimum_vital',
      emoji: '🎯',
      title: 'Achetez juste ce qu’il faut pour tenir',
      message: `Vos kWh sont chers en ce moment (${Math.round(currentTier.pricePerKwh)} F l’unité). Prenez ${waitPlan.nowAmount.toLocaleString('fr-FR')} F aujourd’hui pour tenir jusqu’au 1er, puis rechargez le reste après : le compteur repart à ${Math.round(plan.tiers[0]!.pricePerKwh)} F le kWh. Vous gardez ${waitPlan.savings.toLocaleString('fr-FR')} F dans votre poche.`,
      daysLeftInMonth: daysLeft,
      resetOn,
      currentTier,
      purchasedKwhThisMonth: purchased,
      kwhNeededUntilReset,
      deficitKwh,
      recommendedKwh: deficitKwh,
      recommendedAmount: waitPlan.nowAmount,
      waitPlan,
      options,
      credit,
    };
  }

  // Début de mois, tranche 1 : c'est le meilleur moment pour faire le plein.
  if (currentTier.order === 1 && daysLeft > 12) {
    const place = (currentTier.toKwh ?? Number.POSITIVE_INFINITY) - purchased;
    const cible = round2(Math.min(kwhForOneMonth, place));
    const montant = roundUpTo(costOfKwh(cible, plan, purchased));
    return {
      strategy: 'meilleur_moment',
      emoji: '🟢',
      title: 'C’est le bon moment pour recharger',
      message: `Vous êtes encore au prix le plus bas (${Math.round(currentTier.pricePerKwh)} F le kWh). ${montant.toLocaleString('fr-FR')} F vous donnent de quoi tenir environ ${Math.floor(cible / perDay)} jours. Au-delà de ${currentTier.toKwh} kWh achetés ce mois-ci, le prix monte.`,
      daysLeftInMonth: daysLeft,
      resetOn,
      currentTier,
      purchasedKwhThisMonth: purchased,
      kwhNeededUntilReset,
      deficitKwh,
      recommendedKwh: cible,
      recommendedAmount: montant,
      waitPlan,
      options,
      credit,
    };
  }

  const montant = roundUpTo(costOfKwh(deficitKwh, plan, purchased));
  return {
    strategy: 'recharge_normale',
    emoji: '🔋',
    title: 'Une recharge est nécessaire',
    message: `Il vous faut environ ${Math.ceil(deficitKwh)} kWh pour tenir jusqu’au 1er, soit à peu près ${montant.toLocaleString('fr-FR')} F. ${
      waitPlan
        ? `Si vous pouvez attendre le 1er pour le reste, vous économiserez ${waitPlan.savings.toLocaleString('fr-FR')} F.`
        : 'Vous êtes au meilleur prix : rien à gagner à attendre.'
    }`,
    daysLeftInMonth: daysLeft,
    resetOn,
    currentTier,
    purchasedKwhThisMonth: purchased,
    kwhNeededUntilReset,
    deficitKwh,
    recommendedKwh: deficitKwh,
    recommendedAmount: montant,
    waitPlan,
    options,
    credit,
  };
}
