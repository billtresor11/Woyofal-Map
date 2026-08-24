import { describe, expect, it } from 'vitest';
import {
  computeCumulativeKwh,
  forecastCredit,
  measuredKwhPerDay,
  projectMonthEnd,
} from './calibration.js';

const debut = new Date(2026, 2, 1); // 1er mars 2026
const fin = new Date(2026, 3, 1);
const jour = (numero: number, heure = 12) => new Date(2026, 2, numero, heure);

describe('computeCumulativeKwh', () => {
  it('estime tout le mois quand aucun relevé n’existe', () => {
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [],
      topUps: [],
      estimatedKwhPerDay: 5,
      now: jour(11, 0), // 10 jours pleins écoulés
    });

    expect(resultat.source).toBe('estimation');
    expect(resultat.kwh).toBeCloseTo(50, 5);
    expect(resultat.measuredRatio).toBe(0);
    expect(resultat.driftKwh).toBeNull();
  });

  it('mesure la consommation entre deux relevés par conservation du crédit', () => {
    // 80 kWh restants le 5, 30 kWh restants le 15, aucune recharge :
    // 50 kWh ont bien été consommés, quelle que soit l'estimation.
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [
        { id: 'a', remainingKwh: 80, readAt: jour(5, 0) },
        { id: 'b', remainingKwh: 30, readAt: jour(15, 0) },
      ],
      topUps: [],
      estimatedKwhPerDay: 4,
      now: jour(15, 0),
    });

    // 4 jours estimés (du 1er au 5) + 50 mesurés.
    expect(resultat.kwh).toBeCloseTo(4 * 4 + 50, 5);
    expect(resultat.source).toBe('mixte');
    expect(resultat.remainingKwh).toBe(30);
    expect(measuredKwhPerDay(resultat)).toBeCloseTo(5, 5);
  });

  it('tient compte des recharges intervenues entre deux relevés', () => {
    // Le crédit remonte de 20 à 60 alors qu'on a rechargé 100 kWh :
    // 20 + 100 − 60 = 60 kWh consommés.
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [
        { id: 'a', remainingKwh: 20, readAt: jour(1, 0) },
        { id: 'b', remainingKwh: 60, readAt: jour(11, 0) },
      ],
      topUps: [{ id: 't', kwh: 100, purchasedAt: jour(6) }],
      estimatedKwhPerDay: 3,
      now: jour(11, 0),
    });

    expect(resultat.kwh).toBeCloseTo(60, 5);
    expect(resultat.source).toBe('compteur');
    expect(resultat.measuredRatio).toBe(1);
  });

  it('retombe sur l’estimation si le crédit remonte sans recharge connue', () => {
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [
        { id: 'a', remainingKwh: 10, readAt: jour(1, 0) },
        { id: 'b', remainingKwh: 90, readAt: jour(6, 0) },
      ],
      topUps: [],
      estimatedKwhPerDay: 4,
      now: jour(6, 0),
    });

    // On refuse un consommé négatif : 5 jours × 4 kWh.
    expect(resultat.kwh).toBeCloseTo(20, 5);
    expect(resultat.segments[0]?.source).toBe('estimation');
  });

  it('chiffre la dérive entre l’estimation et le compteur', () => {
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [
        { id: 'a', remainingKwh: 100, readAt: jour(1, 0) },
        { id: 'b', remainingKwh: 40, readAt: jour(11, 0) },
      ],
      topUps: [],
      estimatedKwhPerDay: 5, // l'app prévoyait 50 kWh, le compteur en a vu 60
      now: jour(11, 0),
    });

    expect(resultat.driftKwh).toBeCloseTo(10, 5);
    expect(resultat.driftPercent).toBe(20);
  });

  it('ne compte jamais au-delà d’aujourd’hui', () => {
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [],
      topUps: [],
      estimatedKwhPerDay: 10,
      now: jour(3, 0),
    });
    expect(resultat.kwh).toBeCloseTo(20, 5);
  });

  it('ignore un relevé appartenant à un autre mois', () => {
    const resultat = computeCumulativeKwh({
      monthStart: debut,
      monthEnd: fin,
      readings: [{ id: 'vieux', remainingKwh: 12, readAt: new Date(2026, 1, 20) }],
      topUps: [],
      estimatedKwhPerDay: 2,
      now: jour(6, 0),
    });
    expect(resultat.source).toBe('estimation');
    // Le crédit connu reste affichable, même hors du mois courant.
    expect(resultat.remainingKwh).toBe(12);
  });
});

describe('forecastCredit', () => {
  it('convertit un crédit en jours de courant', () => {
    const prevision = forecastCredit(60, 6, jour(10));
    expect(prevision.daysLeft).toBeCloseTo(10, 5);
    expect(prevision.level).toBe('ok');
    expect(prevision.emptyOn?.getDate()).toBe(20);
  });

  it('alerte quand il reste moins de deux jours', () => {
    expect(forecastCredit(5, 6, jour(10)).level).toBe('urgent');
    expect(forecastCredit(20, 6, jour(10)).level).toBe('bientot');
  });

  it('ne divise pas par zéro quand l’inventaire est vide', () => {
    const prevision = forecastCredit(40, 0);
    expect(prevision.daysLeft).toBe(Number.POSITIVE_INFINITY);
    expect(prevision.emptyOn).toBeNull();
  });
});

describe('projectMonthEnd', () => {
  it('prolonge le cumul du jour jusqu’à la fin du cycle', () => {
    expect(projectMonthEnd(50, 5, 10)).toBeCloseTo(50 + 5 * 20, 5);
  });
});
