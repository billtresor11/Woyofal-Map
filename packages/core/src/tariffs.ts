import type { TariffPlan } from './types.js';

/**
 * ---------------------------------------------------------------------------
 * GRILLES TARIFAIRES SENELEC — WOYOFAL (compteur prépayé)
 * ---------------------------------------------------------------------------
 * Prix fournis par le client, exprimés TOUTES TAXES COMPRISES : le total obtenu
 * en sortie des tranches EST la facture mensuelle. Aucune TVA ni redevance
 * n'est ajoutée par-dessus — c'est le point qui faussait la version précédente.
 *
 * Les tranches se remettent à zéro à chaque cycle mensuel, sur le cumul de kWh
 * consommés par le foyer.
 *
 * Ces valeurs restent modifiables depuis l'application (Réglages ▸ Le prix du
 * kWh) et en base de données : l'algorithme, lui, ne dépend d'aucun chiffre.
 */

export const DEFAULT_TARIFF_CODE = 'WOYOFAL_DPP';

/** Prix TTC du kWh, par tranche et par grille. */
const PRICES = {
  WOYOFAL_DPP: [82.0, 136.49, 159.36],
  WOYOFAL_DMP: [111.23, 143.54, 158.46],
} as const;

function tiers(prices: readonly [number, number, number] | readonly number[]) {
  return [
    {
      order: 1,
      fromKwh: 0,
      toKwh: 150,
      pricePerKwh: prices[0]!,
      label: 'Tranche 1',
      vatExempt: true,
    },
    {
      order: 2,
      fromKwh: 150,
      toKwh: 250,
      pricePerKwh: prices[1]!,
      label: 'Tranche 2',
      vatExempt: true,
    },
    {
      order: 3,
      fromKwh: 250,
      toKwh: null,
      pricePerKwh: prices[2]!,
      label: 'Tranche 3',
      vatExempt: true,
    },
  ];
}

export const TARIFF_PLANS: TariffPlan[] = [
  {
    code: 'WOYOFAL_DPP',
    label: 'Woyofal — Petite Puissance',
    description:
      'Le cas le plus courant : une maison ou un appartement, compteur prépayé de 1 à 9 kVA.',
    meterType: 'PREPAID',
    periodMonths: 1,
    minKva: 1,
    maxKva: 9,
    currency: 'FCFA',
    // Les prix sont déjà TTC : aucune taxe n'est ajoutée par le moteur.
    vatRate: 0,
    municipalTaxRate: 0,
    fixedFeePerMonth: 0,
    source: 'Grille domestique petite puissance (DPP), prix TTC fournis par le client',
    effectiveFrom: '2026-01-01',
    tiers: tiers(PRICES.WOYOFAL_DPP),
  },
  {
    code: 'WOYOFAL_DMP',
    label: 'Woyofal — Moyenne Puissance',
    description: 'Les grandes maisons et les villas : compteur prépayé de 10 kVA et plus.',
    meterType: 'PREPAID',
    periodMonths: 1,
    minKva: 10,
    maxKva: null,
    currency: 'FCFA',
    vatRate: 0,
    municipalTaxRate: 0,
    fixedFeePerMonth: 0,
    source: 'Grille domestique moyenne puissance (DMP), prix TTC fournis par le client',
    effectiveFrom: '2026-01-01',
    tiers: tiers(PRICES.WOYOFAL_DMP),
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
