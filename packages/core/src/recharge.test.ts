import { describe, expect, it } from 'vitest';
import { costOfKwh, daysUntilReset, rechargeAdvice } from './recharge.js';
import { getTariffPlan } from './tariffs.js';

const dpp = getTariffPlan('WOYOFAL_DPP');
const le28 = new Date(2026, 2, 28, 10);
const le3 = new Date(2026, 2, 3, 10);

describe('costOfKwh', () => {
  it('applique la tranche en cours au moment de l’achat', () => {
    // 10 kWh achetés alors qu'on a déjà acheté 145 kWh : 5 en tranche 1, 5 en tranche 2.
    expect(costOfKwh(10, dpp, 145)).toBe(Math.round(5 * 82 + 5 * 136.49));
  });

  it('ne facture rien pour un volume nul', () => {
    expect(costOfKwh(0, dpp, 100)).toBe(0);
  });
});

describe('daysUntilReset', () => {
  it('compte les jours jusqu’au 1er du mois suivant', () => {
    expect(daysUntilReset(new Date(2026, 2, 30, 0))).toBeCloseTo(2, 5);
  });
});

describe('rechargeAdvice', () => {
  it('conseille le minimum vital en fin de mois quand la tranche est chère', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 260, // déjà en tranche 3
      remainingKwh: 2,
      estimatedKwhPerDay: 8,
      now: le28,
    });

    expect(conseil.strategy).toBe('minimum_vital');
    expect(conseil.waitPlan).not.toBeNull();
    expect(conseil.waitPlan!.savings).toBeGreaterThan(0);
    // On n'achète que de quoi tenir jusqu'au 1er, pas le mois entier.
    expect(conseil.recommendedKwh).toBeLessThan(8 * 30);
  });

  it('chiffre l’économie du fractionnement autour du 1er', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 260,
      remainingKwh: 0,
      estimatedKwhPerDay: 10,
      now: le28,
    });

    const plan = conseil.waitPlan!;
    // Tout acheter d'un coup part de la tranche 3 ; fractionner ramène le
    // complément en tranche 1. L'écart doit être exactement celui-là.
    const total = plan.nowKwh + plan.laterKwh;
    expect(plan.allAtOnceAmount).toBeGreaterThanOrEqual(costOfKwh(total, dpp, 260));
    expect(plan.savings).toBe(
      costOfKwh(total, dpp, 260) - (costOfKwh(plan.nowKwh, dpp, 260) + costOfKwh(plan.laterKwh, dpp, 0)),
    );
    expect(plan.savings).toBeGreaterThan(1000);
  });

  it('ne conseille rien quand le crédit tient jusqu’au 1er', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 200,
      remainingKwh: 500,
      estimatedKwhPerDay: 5,
      now: le28,
    });

    expect(conseil.strategy).toBe('rien_a_faire');
    expect(conseil.recommendedAmount).toBe(0);
  });

  it('encourage à recharger en début de mois, au tarif le plus bas', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 0,
      remainingKwh: 3,
      estimatedKwhPerDay: 6,
      now: le3,
    });

    expect(conseil.strategy).toBe('meilleur_moment');
    expect(conseil.currentTier.order).toBe(1);
    // On ne pousse jamais au-delà du premier seau.
    expect(conseil.recommendedKwh).toBeLessThanOrEqual(150);
  });

  it('demande l’inventaire avant de conseiller quoi que ce soit', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 0,
      remainingKwh: null,
      estimatedKwhPerDay: 0,
      now: le3,
    });
    expect(conseil.strategy).toBe('rien_a_faire');
    expect(conseil.title).toContain('appareils');
  });

  it('propose des montants d’achat avec les kWh reçus et les jours couverts', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 0,
      remainingKwh: 0,
      estimatedKwhPerDay: 5,
      now: le3,
    });

    const cinqMille = conseil.options.find((option) => option.amount === 5_000)!;
    expect(cinqMille.kwh).toBeCloseTo(5_000 / 82, 1);
    expect(cinqMille.daysCovered).toBeCloseTo(cinqMille.kwh / 5, 1);
    expect(cinqMille.crossesTier).toBe(false);
  });

  it('signale une recharge qui fait changer de tranche', () => {
    const conseil = rechargeAdvice({
      plan: dpp,
      purchasedKwhThisMonth: 140,
      remainingKwh: 0,
      estimatedKwhPerDay: 5,
      now: le3,
    });

    const grosse = conseil.options.find((option) => option.amount === 10_000)!;
    expect(grosse.crossesTier).toBe(true);
    expect(grosse.tierLabels.length).toBeGreaterThan(1);
  });
});
