import { DAYS_PER_MONTH } from './billing.js';

/**
 * ---------------------------------------------------------------------------
 * CALIBRAGE SUR LE BOÎTIER MURAL
 * ---------------------------------------------------------------------------
 *
 * Le problème, en une phrase : l'application ESTIME, le compteur SAIT.
 *
 * Tant qu'on estime, on dérive. Un ventilateur allumé plus souvent qu'annoncé,
 * une semaine de visite, un frigo qui vieillit — et le cumul virtuel s'écarte
 * du cumul réel. Or c'est le cumul qui décide de la tranche, donc du prix du
 * kWh. Une dérive de 20 kWh peut faire croire à l'utilisateur qu'il est en
 * tranche 1 alors qu'il paye déjà la tranche 2.
 *
 * La correction ne demande aucun matériel : le boîtier Woyofal affiche en
 * permanence le crédit restant, en kWh. L'utilisateur le recopie, et ce chiffre
 * fait autorité sur toute estimation.
 *
 * Reconstitution du réel entre deux relevés :
 *
 *     consommé = crédit_avant + recharges_entre_les_deux − crédit_après
 *
 * C'est une simple conservation : ce qui est entré dans le compteur, moins ce
 * qui y reste, a été consommé. Aucune hypothèse, aucun modèle.
 *
 * Sur les périodes non couvertes par un relevé (avant le premier, après le
 * dernier), il faut bien revenir à l'estimation — mais on le dit, plutôt que
 * de présenter une estimation comme une mesure.
 */

/** Un relevé du crédit affiché sur le boîtier mural, à un instant donné. */
export interface MeterReadingInput {
  id: string;
  /** kWh restants lus sur l'écran du compteur. */
  remainingKwh: number;
  readAt: Date;
}

/** Une recharge Woyofal : des kWh entrés dans le compteur. */
export interface TopUpInput {
  id: string;
  kwh: number;
  purchasedAt: Date;
}

/** D'où vient chaque morceau du cumul du mois. */
export type CumulativeSource = 'compteur' | 'estimation' | 'mixte';

export interface CumulativeSegment {
  from: Date;
  to: Date;
  kwh: number;
  source: 'compteur' | 'estimation';
  /** Phrase prête à afficher, sans jargon. */
  explanation: string;
}

export interface CumulativeResult {
  /** kWh consommés depuis le début du mois. C'est lui qui fixe la tranche. */
  kwh: number;
  source: CumulativeSource;
  /** Part du mois réellement mesurée (0 à 1) : la confiance dans le chiffre. */
  measuredRatio: number;
  segments: CumulativeSegment[];
  /** Crédit restant sur le compteur au dernier relevé connu, s'il y en a un. */
  remainingKwh: number | null;
  lastReadingAt: Date | null;
  /**
   * Écart entre ce que l'application prévoyait et ce que le compteur a mesuré,
   * sur la période mesurée. Positif = on consomme plus que l'estimation.
   */
  driftKwh: number | null;
  driftPercent: number | null;
}

export interface CumulativeInput {
  /** Début du mois de facturation. */
  monthStart: Date;
  /** Premier instant du mois suivant. */
  monthEnd: Date;
  readings: MeterReadingInput[];
  topUps: TopUpInput[];
  /** Consommation quotidienne estimée par l'inventaire, en kWh. */
  estimatedKwhPerDay: number;
  /** Instant de référence (injectable pour les tests). */
  now?: Date;
}

const MS_PER_DAY = 86_400_000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_DAY);
}

function sortByDate<T extends { readAt?: Date; purchasedAt?: Date }>(items: T[], key: 'readAt' | 'purchasedAt'): T[] {
  return [...items].sort((a, b) => (a[key] as Date).getTime() - (b[key] as Date).getTime());
}

/** kWh rechargés strictement entre deux instants (bornes incluses côté début). */
function topUpsBetween(topUps: TopUpInput[], from: Date, to: Date): number {
  return topUps
    .filter((topUp) => topUp.purchasedAt >= from && topUp.purchasedAt <= to)
    .reduce((sum, topUp) => sum + Math.max(0, topUp.kwh), 0);
}

/**
 * Reconstitue le cumul de kWh du mois : mesuré partout où c'est possible,
 * estimé ailleurs, et honnête sur la différence.
 */
export function computeCumulativeKwh(input: CumulativeInput): CumulativeResult {
  const now = input.now ?? new Date();
  const monthStart = input.monthStart;
  // On ne calcule jamais au-delà d'aujourd'hui : le futur n'est pas consommé.
  const horizon = now < input.monthEnd ? now : input.monthEnd;
  const perDay = Math.max(0, input.estimatedKwhPerDay);

  const readings = sortByDate(
    input.readings.filter((r) => r.readAt >= monthStart && r.readAt <= horizon),
    'readAt',
  );

  const segments: CumulativeSegment[] = [];
  const estimate = (from: Date, to: Date): number => round2(perDay * daysBetween(from, to));

  if (readings.length === 0) {
    const kwh = estimate(monthStart, horizon);
    const dernier = input.readings.length > 0 ? sortByDate(input.readings, 'readAt').at(-1)! : null;
    return {
      kwh,
      source: 'estimation',
      measuredRatio: 0,
      segments: [
        {
          from: monthStart,
          to: horizon,
          kwh,
          source: 'estimation',
          explanation: 'Estimé à partir de vos appareils : aucun relevé du compteur ce mois-ci.',
        },
      ],
      remainingKwh: dernier?.remainingKwh ?? null,
      lastReadingAt: dernier?.readAt ?? null,
      driftKwh: null,
      driftPercent: null,
    };
  }

  const first = readings[0]!;

  // 1. Du 1er du mois au premier relevé : on ne sait pas, on estime.
  if (first.readAt > monthStart) {
    segments.push({
      from: monthStart,
      to: first.readAt,
      kwh: estimate(monthStart, first.readAt),
      source: 'estimation',
      explanation: 'Avant votre premier relevé du mois : estimé à partir de vos appareils.',
    });
  }

  // 2. Entre deux relevés : la mesure, par conservation du crédit.
  let measuredKwh = 0;
  let measuredDays = 0;
  for (let index = 0; index < readings.length - 1; index += 1) {
    const avant = readings[index]!;
    const apres = readings[index + 1]!;
    const recharges = topUpsBetween(input.topUps, avant.readAt, apres.readAt);
    // Un crédit qui remonte sans recharge enregistrée = une recharge oubliée.
    // On ne facture jamais un consommé négatif : on retombe sur l'estimation.
    const consomme = avant.remainingKwh + recharges - apres.remainingKwh;
    const jours = daysBetween(avant.readAt, apres.readAt);
    if (consomme >= 0) {
      measuredKwh += consomme;
      measuredDays += jours;
      segments.push({
        from: avant.readAt,
        to: apres.readAt,
        kwh: round2(consomme),
        source: 'compteur',
        explanation:
          recharges > 0
            ? `Mesuré sur votre compteur, recharges comprises (${round2(recharges)} kWh rechargés).`
            : 'Mesuré sur votre compteur.',
      });
    } else {
      segments.push({
        from: avant.readAt,
        to: apres.readAt,
        kwh: estimate(avant.readAt, apres.readAt),
        source: 'estimation',
        explanation:
          'Le crédit a augmenté sans recharge enregistrée : estimé, pour ne pas fausser le total.',
      });
    }
  }

  // 3. Du dernier relevé à aujourd'hui : de nouveau l'estimation.
  const last = readings.at(-1)!;
  if (horizon > last.readAt) {
    segments.push({
      from: last.readAt,
      to: horizon,
      kwh: estimate(last.readAt, horizon),
      source: 'estimation',
      explanation: 'Depuis votre dernier relevé : estimé à partir de vos appareils.',
    });
  }

  const kwh = round2(segments.reduce((sum, segment) => sum + segment.kwh, 0));
  const joursDuMois = Math.max(1, daysBetween(monthStart, horizon));
  const measuredRatio = Math.min(1, round2(measuredDays / joursDuMois));

  // Dérive : sur la période mesurée seulement, sinon on comparerait
  // l'estimation avec elle-même.
  const attendu = perDay * measuredDays;
  const driftKwh = measuredDays > 0 ? round2(measuredKwh - attendu) : null;
  const driftPercent =
    measuredDays > 0 && attendu > 0 ? Math.round(((measuredKwh - attendu) / attendu) * 100) : null;

  const aDeLEstimation = segments.some((segment) => segment.source === 'estimation');
  const aDeLaMesure = segments.some((segment) => segment.source === 'compteur');

  return {
    kwh,
    source: aDeLaMesure ? (aDeLEstimation ? 'mixte' : 'compteur') : 'estimation',
    measuredRatio,
    segments,
    remainingKwh: last.remainingKwh,
    lastReadingAt: last.readAt,
    driftKwh,
    driftPercent,
  };
}

export interface CreditForecast {
  remainingKwh: number;
  /** Nombre de jours que le crédit peut encore tenir. */
  daysLeft: number;
  /** Date estimée de la coupure, si rien n'est rechargé. */
  emptyOn: Date | null;
  level: 'ok' | 'bientot' | 'urgent';
  message: string;
}

/**
 * « Il me reste combien de jours ? » — la seule question qui compte quand on
 * regarde le boîtier. On répond en jours, jamais en kWh.
 */
export function forecastCredit(
  remainingKwh: number,
  estimatedKwhPerDay: number,
  from = new Date(),
): CreditForecast {
  const perDay = Math.max(0, estimatedKwhPerDay);
  const credit = Math.max(0, remainingKwh);

  if (perDay <= 0) {
    return {
      remainingKwh: round2(credit),
      daysLeft: Number.POSITIVE_INFINITY,
      emptyOn: null,
      level: 'ok',
      message: 'Ajoutez vos appareils pour savoir combien de jours ce crédit peut tenir.',
    };
  }

  const daysLeft = credit / perDay;
  const emptyOn = new Date(from.getTime() + daysLeft * MS_PER_DAY);
  const arrondi = Math.floor(daysLeft);
  const level = daysLeft < 2 ? 'urgent' : daysLeft < 5 ? 'bientot' : 'ok';

  const message =
    level === 'urgent'
      ? arrondi < 1
        ? 'Attention : le courant peut se couper aujourd’hui.'
        : 'Attention : il ne reste qu’une journée de courant.'
      : level === 'bientot'
        ? `Il reste environ ${arrondi} jours de courant. Pensez à recharger.`
        : `Il reste environ ${arrondi} jours de courant. Tout va bien.`;

  return { remainingKwh: round2(credit), daysLeft: round2(daysLeft), emptyOn, level, message };
}

/**
 * Consommation quotidienne réellement mesurée entre deux relevés.
 * C'est le chiffre qui permettra un jour de corriger l'inventaire tout seul.
 */
export function measuredKwhPerDay(result: CumulativeResult): number | null {
  const mesures = result.segments.filter((segment) => segment.source === 'compteur');
  if (mesures.length === 0) return null;
  const kwh = mesures.reduce((sum, segment) => sum + segment.kwh, 0);
  const jours = mesures.reduce((sum, segment) => sum + daysBetween(segment.from, segment.to), 0);
  return jours > 0 ? round2(kwh / jours) : null;
}

/** Projection de fin de mois à partir du cumul du jour. */
export function projectMonthEnd(
  cumulativeKwh: number,
  estimatedKwhPerDay: number,
  daysElapsed: number,
  daysInMonth = DAYS_PER_MONTH,
): number {
  const restants = Math.max(0, daysInMonth - daysElapsed);
  return round2(cumulativeKwh + Math.max(0, estimatedKwhPerDay) * restants);
}
