import { describe, expect, it } from 'vitest';
import { APPLIANCE_TEMPLATES, getTemplate } from './catalog.js';
import {
  computeConsumption,
  computePunctualKwh,
  defaultSelection,
  sumConsumption,
} from './consumption.js';

describe('catalogue', () => {
  it('a des identifiants uniques', () => {
    const ids = APPLIANCE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('propose une option par defaut valide pour chaque caracteristique', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      for (const attribute of template.attributes) {
        const found = attribute.options.some((o) => o.id === attribute.defaultOptionId);
        expect(found, `${template.id}.${attribute.key}`).toBe(true);
      }
    }
  });

  it('donne un profil d usage aux appareils qui ne tournent pas 24h/24', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      if (template.alwaysOn) continue;
      expect(template.usageProfiles?.length, template.id).toBeGreaterThan(0);
      const found = template.usageProfiles!.some((p) => p.id === template.defaultUsageProfileId);
      expect(found, template.id).toBe(true);
    }
  });

  it('produit une consommation plausible pour chaque appareil par defaut', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      const result = computeConsumption(template, defaultSelection(template));
      expect(result.kwhPerMonth, template.id).toBeGreaterThan(0);
      expect(result.kwhPerMonth, template.id).toBeLessThan(1500);
    }
  });
});

describe('deduction de consommation', () => {
  it('applique le taux de fonctionnement du frigo', () => {
    const frigo = getTemplate('refrigerateur');
    const result = computeConsumption(frigo, defaultSelection(frigo));
    expect(result.alwaysOn).toBe(true);
    expect(result.hoursPerDay).toBe(24);
    // 125 W x 24 h x 0,4 = 1,2 kWh/jour
    expect(result.kwhPerDay).toBeCloseTo(1.2, 2);
    expect(result.kwhPerMonth).toBeCloseTo(36.5, 1);
  });

  it('rend un vieux frigo plus gourmand qu un neuf', () => {
    const frigo = getTemplate('refrigerateur');
    const base = defaultSelection(frigo);
    const neuf = computeConsumption(frigo, { ...base, options: { ...base.options, etat: 'neuf' } });
    const vieux = computeConsumption(frigo, { ...base, options: { ...base.options, etat: 'vieux' } });
    expect(vieux.kwhPerMonth).toBeGreaterThan(neuf.kwhPerMonth * 1.5);
  });

  it('rend une clim inverter moins gourmande', () => {
    const clim = getTemplate('climatiseur');
    const base = defaultSelection(clim);
    const classique = computeConsumption(clim, base);
    const inverter = computeConsumption(clim, {
      ...base,
      options: { ...base.options, techno: 'inverter' },
    });
    expect(inverter.kwhPerMonth).toBeLessThan(classique.kwhPerMonth);
  });

  it('multiplie par le nombre d ampoules', () => {
    const ampoules = getTemplate('ampoules');
    const base = defaultSelection(ampoules);
    const cinq = computeConsumption(ampoules, base);
    const vingt = computeConsumption(ampoules, {
      ...base,
      options: { ...base.options, nombre: 'q20' },
    });
    expect(vingt.kwhPerMonth).toBeCloseTo(cinq.kwhPerMonth * 4, 1);
  });

  it('tient compte des jours par semaine', () => {
    const machine = getTemplate('machine_laver');
    const base = defaultSelection(machine);
    const une = computeConsumption(machine, { ...base, usageProfileId: 'une' });
    const quatre = computeConsumption(machine, { ...base, usageProfileId: 'quatre' });
    expect(quatre.kwhPerMonth).toBeCloseTo(une.kwhPerMonth * 4, 1);
  });

  it('calcule une session ponctuelle de 3h de PlayStation', () => {
    const console = getTemplate('console_jeu');
    const base = defaultSelection(console);
    const kwh = computePunctualKwh(console, { ...base, options: { modele: 'ps5' } }, 180);
    // 210 W x 3 h = 0,63 kWh
    expect(kwh).toBeCloseTo(0.63, 2);
  });
});

describe('totaux du foyer', () => {
  it('isole les appareils qui tournent 24h/24', () => {
    const items = ['refrigerateur', 'box_internet', 'televiseur'].map((id) => {
      const template = getTemplate(id);
      return computeConsumption(template, defaultSelection(template));
    });
    const totals = sumConsumption(items);
    expect(totals.alwaysOnCount).toBe(2);
    expect(totals.alwaysOnKwhPerMonth).toBeGreaterThan(0);
    expect(totals.switchableKwhPerMonth).toBeGreaterThan(0);
    expect(totals.alwaysOnKwhPerMonth + totals.switchableKwhPerMonth).toBeCloseTo(
      totals.kwhPerMonth,
      2,
    );
  });
});
