import type { TariffPlan } from './types.js';

/**
 * ---------------------------------------------------------------------------
 * GRILLES TARIFAIRES SENELEC
 * ---------------------------------------------------------------------------
 * IMPORTANT : ces valeurs sont des valeurs par defaut, issues des grilles
 * domestiques publiees par la Senelec / la CRSE. Elles evoluent (revisions
 * tarifaires, compensations de l'Etat). Elles sont donc :
 *   1. versionnees ici (source + date d'effet),
 *   2. copiees en base de donnees au seed (table TariffPlan / TariffTier),
 *   3. modifiables par l'utilisateur depuis l'ecran "Reglages > Mon tarif".
 *
 * L'application ne depend jamais des chiffres eux-memes : seul l'algorithme
 * de tranches ci-dessous (billing.ts) fait foi. Changer un prix = 1 UPDATE.
 *
 * Rappel Woyofal (prepaye) : les tranches se remettent a zero chaque mois
 * calendaire, sur le cumul de kWh achetes. En postpaye, la facture est
 * bimestrielle : les seuils s'appliquent au cumul des deux mois.
 */

export const DEFAULT_TARIFF_CODE = 'WOYOFAL_DPP';

export const TARIFF_PLANS: TariffPlan[] = [
  {
    code: 'WOYOFAL_DPP',
    label: 'Woyofal - Petite Puissance',
    description:
      "Compteur prepaye (recharge par code). Le cas le plus courant : maison ou appartement de 1 a 9 kVA.",
    meterType: 'PREPAID',
    periodMonths: 1,
    minKva: 1,
    maxKva: 9,
    currency: 'FCFA',
    vatRate: 0.18,
    municipalTaxRate: 0,
    fixedFeePerMonth: 0,
    source: 'Grille domestique petite puissance (DPP) - valeurs indicatives a confirmer sur votre recu Woyofal',
    effectiveFrom: '2024-01-01',
    tiers: [
      { order: 1, fromKwh: 0, toKwh: 150, pricePerKwh: 91.17, label: 'Tranche 1 (sociale)', vatExempt: true },
      { order: 2, fromKwh: 150, toKwh: 250, pricePerKwh: 101.44, label: 'Tranche 2', vatExempt: false },
      { order: 3, fromKwh: 250, toKwh: null, pricePerKwh: 116.35, label: 'Tranche 3', vatExempt: false },
    ],
  },
  {
    code: 'WOYOFAL_DMP',
    label: 'Woyofal - Moyenne Puissance',
    description: 'Compteur prepaye pour les grandes maisons ou villas (10 kVA et plus).',
    meterType: 'PREPAID',
    periodMonths: 1,
    minKva: 10,
    maxKva: null,
    currency: 'FCFA',
    vatRate: 0.18,
    municipalTaxRate: 0,
    fixedFeePerMonth: 0,
    source: 'Grille domestique moyenne puissance (DMP) - valeurs indicatives a confirmer sur votre recu Woyofal',
    effectiveFrom: '2024-01-01',
    tiers: [
      { order: 1, fromKwh: 0, toKwh: 150, pricePerKwh: 111.68, label: 'Tranche 1', vatExempt: false },
      { order: 2, fromKwh: 150, toKwh: 250, pricePerKwh: 122.84, label: 'Tranche 2', vatExempt: false },
      { order: 3, fromKwh: 250, toKwh: null, pricePerKwh: 132.46, label: 'Tranche 3', vatExempt: false },
    ],
  },
  {
    code: 'POSTPAID_DPP',
    label: 'Facture papier - Petite Puissance',
    description:
      'Compteur classique avec facture Senelec tous les 2 mois. Les tranches sont calculees sur le total des 2 mois.',
    meterType: 'POSTPAID',
    periodMonths: 2,
    minKva: 1,
    maxKva: 9,
    currency: 'FCFA',
    vatRate: 0.18,
    municipalTaxRate: 0,
    fixedFeePerMonth: 500,
    source: 'Grille domestique petite puissance (DPP), facturation bimestrielle - valeurs indicatives',
    effectiveFrom: '2024-01-01',
    tiers: [
      { order: 1, fromKwh: 0, toKwh: 150, pricePerKwh: 91.17, label: 'Tranche 1 (sociale)', vatExempt: true },
      { order: 2, fromKwh: 150, toKwh: 250, pricePerKwh: 101.44, label: 'Tranche 2', vatExempt: false },
      { order: 3, fromKwh: 250, toKwh: null, pricePerKwh: 116.35, label: 'Tranche 3', vatExempt: false },
    ],
  },
];

export function getTariffPlan(code: string): TariffPlan {
  const plan = TARIFF_PLANS.find((p) => p.code === code);
  if (!plan) {
    throw new Error(`Grille tarifaire inconnue : ${code}`);
  }
  return plan;
}

export function getDefaultTariffPlan(): TariffPlan {
  return getTariffPlan(DEFAULT_TARIFF_CODE);
}
