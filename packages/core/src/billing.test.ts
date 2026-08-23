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
const postpaid = getTariffPlan('POSTPAID_DPP');

describe('decoupage par tranches', () => {
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

  it('tient compte des kWh deja consommes dans le mois', () => {
    const slices = sliceByTier(140, 30, woyofal);
    expect(slices.map((s) => [s.tier.order, s.kwh])).toEqual([
      [1, 10],
      [2, 20],
    ]);
  });
});

describe('facturation', () => {
  it('facture 300 kWh avec TVA et exoneration de la tranche sociale', () => {
    const bill = computeBill(300, woyofal);
    expect(bill.energyHT).toBeCloseTo(150 * 91.17 + 100 * 101.44 + 50 * 116.35, 2);
    // La tranche 1 est exoneree : la TVA ne porte que sur les tranches 2 et 3.
    expect(bill.vat).toBeCloseTo((100 * 101.44 + 50 * 116.35) * 0.18, 2);
    expect(bill.totalTTC).toBe(32510);
    expect(bill.currentTier.order).toBe(3);
    expect(bill.kwhToNextTier).toBeNull();
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

  it('applique les seuils sur 2 mois pour le postpaye et ramene au mois', () => {
    const monthly = computeMonthlyBill(100, postpaid);
    const period = computeBill(200, postpaid, { includeFixedFee: true });
    expect(monthly.totalTTC).toBe(Math.round(period.totalTTC / 2));
    // 200 kWh sur 2 mois : on est deja en tranche 2, contrairement au prepaye.
    expect(monthly.currentTier.order).toBe(2);
  });

  it('le prix moyen du kWh augmente avec la consommation', () => {
    const petit = computeBill(100, woyofal).averagePricePerKwh;
    const gros = computeBill(400, woyofal).averagePricePerKwh;
    expect(gros).toBeGreaterThan(petit);
  });
});

describe('cout marginal', () => {
  it('la meme consommation coute plus cher en fin de mois', () => {
    const debutDeMois = marginalCost(10, 5, woyofal).totalTTC;
    const finDeMois = marginalCost(280, 5, woyofal).totalTTC;
    expect(finDeMois).toBeGreaterThan(debutDeMois);
  });

  it('n inclut jamais la redevance fixe', () => {
    expect(marginalCost(0, 10, postpaid).fixedFee).toBe(0);
  });
});

describe('recharge Woyofal', () => {
  it('convertit un montant en kWh', () => {
    const result = kwhForAmount(5000, woyofal);
    // Tranche 1 exoneree de TVA : 5000 / 91,17
    expect(result.kwh).toBeCloseTo(5000 / 91.17, 1);
  });

  it('donne moins de kWh quand on a deja beaucoup consomme', () => {
    const debut = kwhForAmount(10000, woyofal, 0).kwh;
    const fin = kwhForAmount(10000, woyofal, 300).kwh;
    expect(fin).toBeLessThan(debut);
  });

  it('est coherent avec le calcul direct', () => {
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
