import { sliceByTier } from './billing.js';
import type { TariffPlan } from './types.js';

/**
 * ---------------------------------------------------------------------------
 * L'ÉCOLE WOYOFAL — LA MÉTAPHORE DES TROIS SEAUX
 * ---------------------------------------------------------------------------
 *
 * Expliquer une tarification progressive à quelqu'un qui n'a jamais vu de
 * facture détaillée est un problème de pédagogie, pas de mathématiques.
 *
 * L'image retenue : trois seaux qu'on remplit dans l'ordre.
 *   - Le premier seau est bon marché. On le remplit d'abord.
 *   - Quand il déborde, l'eau tombe dans le deuxième, plus cher.
 *   - Le troisième n'a pas de fond, et c'est le plus cher de tous.
 *   - Le 1er du mois, on vide tout et on recommence par le premier seau.
 *
 * Toute la difficulté du produit tient dans une seule idée, celle du
 * débordement : quand on passe de 145 à 160 kWh, on ne paye pas 160 kWh au
 * prix fort. On paye 5 kWh dans le premier seau et 10 dans le deuxième.
 *
 * Les chiffres de ce module sont TOUS dérivés de la grille tarifaire réelle :
 * si un prix change, la leçon change avec lui. Aucun nombre n'est écrit à la
 * main dans les textes de l'interface.
 */

export interface Bucket {
  order: number;
  label: string;
  emoji: string;
  /** Contenance du seau en kWh ; `null` = le seau sans fond. */
  capacityKwh: number | null;
  pricePerKwh: number;
  /** Ce qui est déjà dedans ce mois-ci. */
  filledKwh: number;
  /** Taux de remplissage 0-1 (le seau sans fond se remplit "visuellement"). */
  fillRatio: number;
  color: string;
  /** Phrase courte, compréhensible par un enfant de 10 ans. */
  sentence: string;
  /** Ce que coûte le remplissage complet de ce seau. */
  fullCost: number | null;
}

const BUCKET_STYLE = [
  { emoji: '🪣', color: '#22C55E', name: 'Le petit seau pas cher' },
  { emoji: '🪣', color: '#F59E0B', name: 'Le seau du milieu' },
  { emoji: '🪣', color: '#EF4444', name: 'Le seau sans fond' },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Les trois seaux du foyer, remplis à hauteur de sa consommation du mois.
 */
export function waterBuckets(monthlyKwh: number, plan: TariffPlan): Bucket[] {
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  const slices = sliceByTier(0, Math.max(0, monthlyKwh), plan);

  return tiers.map((tier, index) => {
    const style = BUCKET_STYLE[Math.min(index, BUCKET_STYLE.length - 1)]!;
    const capacityKwh = tier.toKwh === null ? null : tier.toKwh - tier.fromKwh;
    const filledKwh = round2(
      slices.filter((slice) => slice.tier.order === tier.order).reduce((sum, s) => sum + s.kwh, 0),
    );
    // Le seau sans fond n'a pas de taux de remplissage : on lui en donne un
    // lisible, plafonné, pour que la barre reste comparable aux deux autres.
    const reference = capacityKwh ?? Math.max(100, filledKwh);
    const prix = Math.round(tier.pricePerKwh);

    const sentence =
      capacityKwh === null
        ? `Une fois les deux premiers pleins, tout le reste tombe ici, à ${prix} F le kWh. Ce seau n’a pas de fond : plus on consomme, plus ça coûte cher.`
        : index === 0
          ? `Les ${capacityKwh} premiers kWh du mois sont à ${prix} F. C’est le tarif le moins cher, et tout le monde y a droit chaque mois.`
          : `Les ${capacityKwh} kWh suivants passent à ${prix} F. On ne le remplit que si le premier seau a débordé.`;

    return {
      order: tier.order,
      label: style.name,
      emoji: style.emoji,
      capacityKwh,
      pricePerKwh: tier.pricePerKwh,
      filledKwh,
      fillRatio: reference > 0 ? Math.min(1, round2(filledKwh / reference)) : 0,
      color: style.color,
      sentence,
      fullCost: capacityKwh === null ? null : Math.round(capacityKwh * tier.pricePerKwh),
    };
  });
}

export interface OverflowStep {
  tierLabel: string;
  tierOrder: number;
  kwh: number;
  pricePerKwh: number;
  amount: number;
}

export interface OverflowExample {
  fromKwh: number;
  addedKwh: number;
  toKwh: number;
  steps: OverflowStep[];
  total: number;
  /** Ce que ça aurait coûté si TOUT était facturé au prix fort (l'erreur courante). */
  naiveTotal: number;
  sentence: string;
}

/**
 * L'exemple du débordement, calculé et non écrit en dur.
 * Par défaut : le cas de 145 kWh à qui on ajoute 15 kWh.
 */
export function overflowExample(plan: TariffPlan, fromKwh = 145, addedKwh = 15): OverflowExample {
  const slices = sliceByTier(fromKwh, addedKwh, plan);
  const steps: OverflowStep[] = slices.map((slice) => ({
    tierLabel: slice.tier.label,
    tierOrder: slice.tier.order,
    kwh: round2(slice.kwh),
    pricePerKwh: slice.tier.pricePerKwh,
    amount: Math.round(slice.kwh * slice.tier.pricePerKwh),
  }));
  const total = steps.reduce((sum, step) => sum + step.amount, 0);
  const dernier = steps.at(-1);
  const naiveTotal = Math.round(addedKwh * (dernier?.pricePerKwh ?? 0));

  const detail = steps
    .map((step) => `${step.kwh} kWh à ${Math.round(step.pricePerKwh)} F`)
    .join(', puis ');

  return {
    fromKwh,
    addedKwh,
    toKwh: fromKwh + addedKwh,
    steps,
    total,
    naiveTotal,
    sentence:
      steps.length > 1
        ? `Vous étiez à ${fromKwh} kWh, vous montez à ${fromKwh + addedKwh}. On ne compte pas les ${addedKwh} kWh au prix fort : ${detail}. Total ${total.toLocaleString('fr-FR')} F, et non ${naiveTotal.toLocaleString('fr-FR')} F.`
        : `Vous étiez à ${fromKwh} kWh, vous montez à ${fromKwh + addedKwh} : tout reste dans la même tranche, ${detail}.`,
  };
}

export interface Lesson {
  id: string;
  emoji: string;
  title: string;
  /** Deux ou trois phrases, ton simple, aucune abstraction. */
  body: string;
  /** Le geste concret qui en découle. */
  action?: string;
}

/**
 * Les leçons de l'École, dans l'ordre où elles se comprennent.
 * Les montants sont recalculés depuis la grille pour ne jamais mentir.
 */
export function lessons(plan: TariffPlan): Lesson[] {
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  const t1 = tiers[0]!;
  const t2 = tiers[1] ?? t1;
  const t3 = tiers.at(-1)!;
  const ecart = Math.round(((t3.pricePerKwh - t1.pricePerKwh) / t1.pricePerKwh) * 100);

  return [
    {
      id: 'seaux',
      emoji: '🪣',
      title: 'Trois seaux, et pas un seul prix',
      body: `Le courant n’a pas un prix unique. Imaginez trois seaux qu’on remplit dans l’ordre : le premier coûte ${Math.round(t1.pricePerKwh)} F le kWh, le deuxième ${Math.round(t2.pricePerKwh)} F, le troisième ${Math.round(t3.pricePerKwh)} F. On remplit toujours le moins cher en premier.`,
    },
    {
      id: 'debordement',
      emoji: '💧',
      title: 'Quand un seau déborde',
      body: `Quand le premier seau est plein, l’eau tombe dans le deuxième — mais ce qui est déjà dans le premier reste payé au prix du premier. On ne repaye jamais en arrière. C’est pour ça qu’une grosse recharge coûte plus cher au kWh qu’une petite.`,
    },
    {
      id: 'remise-a-zero',
      emoji: '🔄',
      title: 'Le 1er du mois, on vide tout',
      body: `Chaque 1er du mois, les trois seaux sont vidés et vous repartez au tarif le moins cher. C’est la règle la plus utile de toutes : elle vous dit QUAND acheter.`,
      action: 'Regardez l’onglet Recharge avant chaque achat de fin de mois.',
    },
    {
      id: 'achat',
      emoji: '🛒',
      title: 'Le prix dépend du jour où vous achetez',
      body: `Deux voisins qui consomment pareil ne payent pas pareil. Celui qui achète tout d’un coup remplit les trois seaux et paye jusqu’à ${ecart} % plus cher le kWh. Celui qui étale ses achats de part et d’autre du 1er reste dans le premier seau.`,
      action: 'Fractionnez vos grosses recharges autour du 1er du mois.',
    },
    {
      id: 'veille',
      emoji: '🔁',
      title: 'Ce qui tourne quand vous dormez',
      body: `Le frigo, la box, le décodeur en veille : ils ne s’arrêtent jamais. Ce socle représente souvent la moitié de la facture, et c’est le seul poste qui coûte de l’argent quand la maison est vide.`,
      action: 'Débranchez le décodeur et le chargeur quand vous partez plusieurs jours.',
    },
    {
      id: 'compteur',
      emoji: '🔢',
      title: 'Votre boîtier dit la vérité',
      body: `Le nombre affiché sur le boîtier mural, ce sont les kWh qu’il vous reste. L’application, elle, estime. Recopiez ce nombre de temps en temps : l’application se recale et ses conseils deviennent justes.`,
      action: 'Onglet Compteur : entrez le nombre affiché, une fois par semaine.',
    },
  ];
}

/**
 * Le fait marquant d'un foyer : une phrase qu'on retient et qu'on répète.
 * Le tarif seul n'apprend rien ; l'écart entre deux comportements, si.
 */
export function keyFact(monthlyKwh: number, plan: TariffPlan): string {
  const tiers = [...plan.tiers].sort((a, b) => a.order - b.order);
  const t1 = tiers[0]!;
  const seuil = t1.toKwh ?? 150;

  if (monthlyKwh <= 0) {
    return `Tant que vous restez sous ${seuil} kWh par mois, chaque kWh vous coûte ${Math.round(t1.pricePerKwh)} F : le tarif le plus bas.`;
  }
  if (monthlyKwh <= seuil) {
    const marge = Math.round(seuil - monthlyKwh);
    return `Vous consommez ${Math.round(monthlyKwh)} kWh par mois : vous êtes dans le premier seau, le moins cher. Il vous reste ${marge} kWh de marge avant que le prix monte.`;
  }
  const excedent = Math.round(monthlyKwh - seuil);
  const t2 = tiers[1] ?? t1;
  const surcout = Math.round(excedent * (t2.pricePerKwh - t1.pricePerKwh));
  return `Vous dépassez le premier seau de ${excedent} kWh. Ce dépassement seul vous coûte ${surcout.toLocaleString('fr-FR')} F de plus par mois que s’il était resté dedans.`;
}
