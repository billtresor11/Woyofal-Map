import { describe, expect, it } from 'vitest';
import {
  computeBill,
  computeMonthlyBill,
  kwhForAmount,
  marginalCost,
  sliceByTier,
  tierProgress,
} from './billing.js';
import { getTariffPlan } from './tariffs.js';

const woyofal = getTariffPlan('WOYOFAL_DPP');
const dmp = getTariffPlan('WOYOFAL_DMP');

/**
 * Grille fictive facturée tous les 2 mois : elle sert uniquement à vérifier
 * que le moteur sait raisonner sur une période de deux mois.
 */
const bimestriel = { ...woyofal, code: 'TEST_BIMESTRIEL', periodMonths: 2 as const, fixedFeePerMonth: 500 };

describe('découpage par tranches', () => {
  it('reste dans la tranche 1 sous 150 kWh', () => {
    const slices = sliceByTier(0, 120, woyofal);
    expect(slices).toHaveLength(1);
    expect(slices[0]!.tier.order).toBe(1);
    expect(slices[0]!.kwh).toBe(120);
  });

  it('repartit 300 kWh sur les trois tranches', () => {
    const slices = sliceByTier(0, 300, woyofal);
    expect(slices.map((s) => [s.tier.order, s.kwh])).toEqual([
      [1, 150],
      [2, 100],
      [3, 50],
    ]);
  });

  it('tient compte des kWh déjà consommés dans le mois', () => {
    const slices = sliceByTier(140, 30, woyofal);
    expect(slices.map((s) => [s.tier.order, s.kwh])).toEqual([
      [1, 10],
      [2, 20],
    ]);
  });
});

describe('facturation', () => {
  it('facture 300 kWh en cumulant les trois tranches', () => {
    const bill = computeBill(300, woyofal);
    // 150 × 82,00 + 100 × 136,49 + 50 × 159,36
    expect(bill.totalTTC).toBe(33917);
    // Les prix sont déjà TTC : le moteur n'ajoute aucune taxe par-dessus.
    expect(bill.vat).toBe(0);
    expect(bill.currentTier.order).toBe(3);
    expect(bill.kwhToNextTier).toBeNull();
  });

  it('facture la même consommation plus cher en moyenne puissance', () => {
    expect(computeBill(100, dmp).totalTTC).toBeGreaterThan(computeBill(100, woyofal).totalTTC);
    expect(computeBill(100, dmp).totalTTC).toBe(Math.round(100 * 111.23));
  });

  it('donne le coût journalier en divisant par 30', () => {
    const bill = computeBill(300, woyofal);
    expect(Math.round(bill.totalTTC / 30)).toBe(1131);
  });

  it('indique combien de kWh restent avant la tranche suivante', () => {
    const bill = computeBill(100, woyofal);
    expect(bill.currentTier.order).toBe(1);
    expect(bill.kwhToNextTier).toBe(50);
    expect(bill.nextTier?.order).toBe(2);
  });

  it('ne facture rien pour 0 kWh', () => {
    const bill = computeBill(0, woyofal);
    expect(bill.totalTTC).toBe(0);
    expect(bill.lines).toHaveLength(0);
  });

  it('applique les seuils sur 2 mois pour une grille bimestrielle et ramène au mois', () => {
    const monthly = computeMonthlyBill(100, bimestriel);
    const period = computeBill(200, bimestriel, { includeFixedFee: true });
    expect(monthly.totalTTC).toBe(Math.round(period.totalTTC / 2));
    // 200 kWh sur 2 mois : on est déjà en tranche 2, contrairement au mensuel.
    expect(monthly.currentTier.order).toBe(2);
  });

  it('le prix moyen du kWh augmente avec la consommation', () => {
    const petit = computeBill(100, woyofal).averagePricePerKwh;
    const gros = computeBill(400, woyofal).averagePricePerKwh;
    expect(gros).toBeGreaterThan(petit);
  });
});

describe('coût marginal', () => {
  it('la même consommation coûte plus cher en fin de mois', () => {
    const debutDeMois = marginalCost(10, 5, woyofal).totalTTC;
    const finDeMois = marginalCost(280, 5, woyofal).totalTTC;
    expect(finDeMois).toBeGreaterThan(debutDeMois);
  });

  it('n inclut jamais la redevance fixe', () => {
    expect(marginalCost(0, 10, bimestriel).fixedFee).toBe(0);
  });
});

describe('recharge Woyofal', () => {
  it('convertit un montant en kWh', () => {
    const result = kwhForAmount(5000, woyofal);
    // En tranche 1 : 5 000 / 82,00
    expect(result.kwh).toBeCloseTo(5000 / 82, 1);
  });

  it('donne moins de kWh quand on a déjà beaucoup consomme', () => {
    const debut = kwhForAmount(10000, woyofal, 0).kwh;
    const fin = kwhForAmount(10000, woyofal, 300).kwh;
    expect(fin).toBeLessThan(debut);
  });

  it('est cohérent avec le calcul direct', () => {
    const kwh = kwhForAmount(20000, woyofal).kwh;
    const bill = computeBill(kwh, woyofal, { includeFixedFee: false });
    expect(bill.totalTTC).toBeCloseTo(20000, -1);
  });
});

describe('jauge de tranches', () => {
  it('remplit les tranches atteintes', () => {
    const progress = tierProgress(200, woyofal);
    expect(progress.segments[0]!.kwh).toBe(150);
    expect(progress.segments[1]!.kwh).toBe(50);
    expect(progress.segments[2]!.kwh).toBe(0);
    expect(progress.currentTier.order).toBe(2);
    expect(progress.kwhToNextTier).toBe(50);
  });
});
