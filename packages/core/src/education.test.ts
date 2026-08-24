import { describe, expect, it } from 'vitest';
import { keyFact, lessons, overflowExample, waterBuckets } from './education.js';
import { getTariffPlan } from './tariffs.js';

const dpp = getTariffPlan('WOYOFAL_DPP');

describe('waterBuckets', () => {
  it('remplit les seaux dans l’ordre, le moins cher d’abord', () => {
    const seaux = waterBuckets(200, dpp);
    expect(seaux).toHaveLength(3);
    expect(seaux[0]!.filledKwh).toBe(150);
    expect(seaux[1]!.filledKwh).toBe(50);
    expect(seaux[2]!.filledKwh).toBe(0);
  });

  it('donne au dernier seau une contenance nulle : il n’a pas de fond', () => {
    const seaux = waterBuckets(400, dpp);
    expect(seaux[2]!.capacityKwh).toBeNull();
    expect(seaux[2]!.filledKwh).toBe(150);
    expect(seaux[2]!.fillRatio).toBeLessThanOrEqual(1);
  });

  it('reprend les prix de la grille, sans les réécrire', () => {
    const seaux = waterBuckets(0, dpp);
    expect(seaux.map((seau) => seau.pricePerKwh)).toEqual([82, 136.49, 159.36]);
    expect(seaux[0]!.fullCost).toBe(Math.round(150 * 82));
  });
});

describe('overflowExample', () => {
  it('découpe le passage de 145 à 160 kWh en deux tranches', () => {
    const exemple = overflowExample(dpp, 145, 15);
    expect(exemple.steps).toHaveLength(2);
    expect(exemple.steps[0]).toMatchObject({ tierOrder: 1, kwh: 5 });
    expect(exemple.steps[1]).toMatchObject({ tierOrder: 2, kwh: 10 });
    expect(exemple.total).toBe(Math.round(5 * 82) + Math.round(10 * 136.49));
  });

  it('montre que le calcul naïf coûterait plus cher', () => {
    const exemple = overflowExample(dpp, 145, 15);
    expect(exemple.naiveTotal).toBeGreaterThan(exemple.total);
  });

  it('reste juste quand rien ne déborde', () => {
    const exemple = overflowExample(dpp, 10, 20);
    expect(exemple.steps).toHaveLength(1);
    expect(exemple.total).toBe(Math.round(20 * 82));
  });
});

describe('lessons', () => {
  it('donne des leçons chiffrées depuis la grille en vigueur', () => {
    const cours = lessons(dpp);
    expect(cours.length).toBeGreaterThanOrEqual(5);
    expect(cours[0]!.body).toContain('82');
    expect(new Set(cours.map((lecon) => lecon.id)).size).toBe(cours.length);
  });
});

describe('keyFact', () => {
  it('rassure tant qu’on est sous le premier seuil', () => {
    expect(keyFact(100, dpp)).toContain('50 kWh de marge');
  });

  it('chiffre le surcoût du dépassement', () => {
    const phrase = keyFact(200, dpp);
    expect(phrase).toContain('50 kWh');
    expect(phrase).toContain(Math.round(50 * (136.49 - 82)).toLocaleString('fr-FR'));
  });
});
