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

  /**
   * Garde-fou : les identifiants techniques circulent en base, dans les URL et
   * dans les clés d'illustrations. Un accent qui s'y glisse casse silencieusement
   * une correspondance ailleurs dans le produit.
   */
  it('n’utilise que des identifiants techniques en ASCII', () => {
    const ascii = /^[a-z0-9_]+$/;
    for (const template of APPLIANCE_TEMPLATES) {
      expect(template.id, `template ${template.id}`).toMatch(ascii);
      expect(template.category, `catégorie de ${template.id}`).toMatch(ascii);
      for (const attribute of template.attributes) {
        expect(attribute.key, `${template.id}.${attribute.key}`).toMatch(ascii);
        for (const option of attribute.options) {
          expect(option.id, `${template.id}.${attribute.key}.${option.id}`).toMatch(ascii);
        }
      }
      for (const profile of template.usageProfiles ?? []) {
        expect(profile.id, `${template.id}.${profile.id}`).toMatch(ascii);
      }
    }
  });

  it('propose une option par défaut valide pour chaque caractéristique', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      for (const attribute of template.attributes) {
        const found = attribute.options.some((o) => o.id === attribute.defaultOptionId);
        expect(found, `${template.id}.${attribute.key}`).toBe(true);
      }
    }
  });

  it('donne un profil d’usage aux appareils qui ne tournent pas 24h/24', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      if (template.alwaysOn) continue;
      expect(template.usageProfiles?.length, template.id).toBeGreaterThan(0);
      const found = template.usageProfiles!.some((p) => p.id === template.defaultUsageProfileId);
      expect(found, template.id).toBe(true);
    }
  });

  it('produit une consommation plausible pour chaque appareil par défaut', () => {
    for (const template of APPLIANCE_TEMPLATES) {
      const result = computeConsumption(template, defaultSelection(template));
      expect(result.kwhPerMonth, template.id).toBeGreaterThan(0);
      expect(result.kwhPerMonth, template.id).toBeLessThan(1500);
    }
  });
});

describe('déduction de consommation', () => {
  it('applique le taux de fonctionnement du frigo', () => {
    const frigo = getTemplate('refrigerateur');
    const result = computeConsumption(frigo, defaultSelection(frigo));
    expect(result.alwaysOn).toBe(true);
    expect(result.hoursPerDay).toBe(24);
    // 125 W × 24 h × coefficient 0,3 = 0,9 kWh/jour
    expect(result.kwhPerDay).toBeCloseTo(0.9, 2);
    expect(result.kwhPerMonth).toBeCloseTo(27, 1);
  });

  it('rend un vieux frigo plus gourmand qu’un neuf', () => {
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

  it('multiplie par le nombre d’ampoules, quel qu’il soit', () => {
    const ampoules = getTemplate('ampoules');
    const base = defaultSelection(ampoules);
    expect(base.quantity).toBe(8); // la quantité par défaut du modèle
    const une = computeConsumption(ampoules, { ...base, quantity: 1 });
    // Un nombre quelconque, pas seulement ceux d'une liste : 17 ampoules.
    const dixSept = computeConsumption(ampoules, { ...base, quantity: 17 });
    expect(dixSept.quantity).toBe(17);
    expect(dixSept.kwhPerMonth).toBeCloseTo(une.kwhPerMonth * 17, 1);
  });

  it('tient compte des jours par semaine', () => {
    const machine = getTemplate('machine_laver');
    const base = defaultSelection(machine);
    const une = computeConsumption(machine, { ...base, usageProfileId: 'une' });
    const quatre = computeConsumption(machine, { ...base, usageProfileId: 'quatre' });
    expect(quatre.kwhPerMonth).toBeCloseTo(une.kwhPerMonth * 4, 1);
  });

  it('accepte une fréquence d’usage libre, hors des choix proposés', () => {
    const clim = getTemplate('climatiseur');
    const base = defaultSelection(clim);
    // 3h45 par jour, 5 jours sur 7 : aucun profil ne propose exactement cela.
    const libre = computeConsumption(clim, { ...base, hoursPerDay: 3.75, daysPerWeek: 5 });
    expect(libre.hoursPerDay).toBe(3.75);
    expect(libre.daysPerWeek).toBe(5);
    const memeDuree7j = computeConsumption(clim, { ...base, hoursPerDay: 3.75, daysPerWeek: 7 });
    expect(libre.kwhPerMonth).toBeCloseTo((memeDuree7j.kwhPerMonth * 5) / 7, 1);
  });

  it('permet de décrire un appareil absent du catalogue', () => {
    const autre = getTemplate('autre');
    expect(autre.isCustom).toBe(true);
    const base = defaultSelection(autre);

    // Situé par comparaison : « comme une bouilloire », 1h par jour.
    const chauffant = computeConsumption(autre, {
      ...base,
      options: { ...base.options, puissance: 'bouilloire' },
      hoursPerDay: 1,
      daysPerWeek: 7,
    });
    expect(chauffant.watts).toBe(2200);
    expect(chauffant.kwhPerMonth).toBeCloseTo(2.2 * 30, 1);

    // Et il peut tourner 24h/24, comme un congélateur de boutique.
    const permanent = computeConsumption(autre, {
      ...base,
      options: { ...base.options, puissance: 'ventilateur', permanent: 'oui' },
    });
    expect(permanent.alwaysOn).toBe(true);
    expect(permanent.hoursPerDay).toBe(24);
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
