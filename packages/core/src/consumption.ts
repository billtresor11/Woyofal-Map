import { DAYS_PER_MONTH } from './billing.js';
import type {
  ApplianceSelection,
  ApplianceTemplate,
  ConsumptionResult,
  UsageProfile,
} from './types.js';

/**
 * ---------------------------------------------------------------------------
 * DEDUCTION AUTOMATIQUE DE LA CONSOMMATION
 * ---------------------------------------------------------------------------
 * L'utilisateur clique sur une illustration puis choisit des caracteristiques
 * en langage courant. Ici on traduit ces choix en kWh :
 *
 *   watts = (puissance imposee par l'option "absolue") x (facteurs correctifs)
 *   kWh/jour = watts x heures/jour x tauxDeFonctionnement x quantite / 1000
 *              x (jours par semaine / 7)
 *
 * Le "taux de fonctionnement" (duty cycle) est le detail que 90% des
 * calculateurs ratent : un frigo est branche 24h/24 mais son compresseur ne
 * tourne qu'environ 40% du temps. Sans lui, on surestime la facture de 150%.
 */

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function resolveUsageProfile(
  template: ApplianceTemplate,
  usageProfileId?: string,
): UsageProfile | null {
  if (template.alwaysOn) return null;
  const profiles = template.usageProfiles ?? [];
  return (
    profiles.find((p) => p.id === usageProfileId) ??
    profiles.find((p) => p.id === template.defaultUsageProfileId) ??
    profiles[0] ??
    null
  );
}

/** Selection par defaut d'un appareil : l'ecran d'ajout doit etre pre-rempli. */
export function defaultSelection(template: ApplianceTemplate): ApplianceSelection {
  const options: Record<string, string> = {};
  for (const attribute of template.attributes) {
    options[attribute.key] = attribute.defaultOptionId;
  }
  return {
    templateId: template.id,
    options,
    usageProfileId: template.alwaysOn ? undefined : template.defaultUsageProfileId,
    quantity: 1,
  };
}

export function computeConsumption(
  template: ApplianceTemplate,
  selection: ApplianceSelection,
): ConsumptionResult {
  let watts = template.basePowerWatts;
  let dutyCycle = template.dutyCycle;
  let quantity = Math.max(1, Math.round(selection.quantity ?? 1));
  let alwaysOn = template.alwaysOn;

  // 1. Options "absolues" : elles fixent la puissance de reference.
  for (const attribute of template.attributes) {
    const optionId = selection.options[attribute.key] ?? attribute.defaultOptionId;
    const option = attribute.options.find((o) => o.id === optionId);
    if (!option) continue;
    if (typeof option.watts === 'number') watts = option.watts;
    if (typeof option.dutyCycle === 'number') dutyCycle = option.dutyCycle;
    if (typeof option.quantity === 'number') quantity = option.quantity;
    if (option.alwaysOn === true) alwaysOn = true;
  }

  // 2. Facteurs correctifs (classe energetique, age, mode eco...), cumulatifs.
  for (const attribute of template.attributes) {
    const optionId = selection.options[attribute.key] ?? attribute.defaultOptionId;
    const option = attribute.options.find((o) => o.id === optionId);
    if (option && typeof option.factor === 'number') watts *= option.factor;
  }

  const profile = resolveUsageProfile(template, selection.usageProfileId);
  const hoursPerDay = alwaysOn ? 24 : selection.hoursPerDay ?? profile?.hoursPerDay ?? 0;
  const daysPerWeek = alwaysOn ? 7 : selection.daysPerWeek ?? profile?.daysPerWeek ?? 7;

  const weekRatio = Math.min(7, Math.max(0, daysPerWeek)) / 7;
  const effectiveHoursPerDay = hoursPerDay * dutyCycle * weekRatio;
  const kwhPerDay = (watts * quantity * effectiveHoursPerDay) / 1000;

  return {
    templateId: template.id,
    watts: round(watts, 1),
    quantity,
    hoursPerDay: round(hoursPerDay, 2),
    daysPerWeek,
    dutyCycle,
    alwaysOn,
    effectiveHoursPerDay: round(effectiveHoursPerDay, 2),
    kwhPerDay: round(kwhPerDay),
    kwhPerMonth: round(kwhPerDay * DAYS_PER_MONTH),
    kwhPerYear: round(kwhPerDay * 365.25),
  };
}

/** Consommation d'une utilisation ponctuelle exprimee en minutes. */
export function computePunctualKwh(
  template: ApplianceTemplate,
  selection: ApplianceSelection,
  durationMinutes: number,
): number {
  const base = computeConsumption(template, { ...selection, hoursPerDay: 1, daysPerWeek: 7 });
  const hours = Math.max(0, durationMinutes) / 60;
  return round((base.watts * base.quantity * base.dutyCycle * hours) / 1000);
}

export interface HouseholdTotals {
  kwhPerDay: number;
  kwhPerMonth: number;
  /** Part des appareils qui tournent 24h/24 (le "socle" du foyer). */
  alwaysOnKwhPerMonth: number;
  /** Part des appareils que l'on allume et eteint (le levier d'economie). */
  switchableKwhPerMonth: number;
  alwaysOnSharePercent: number;
  applianceCount: number;
  alwaysOnCount: number;
}

export function sumConsumption(items: ConsumptionResult[]): HouseholdTotals {
  const kwhPerDay = items.reduce((sum, item) => sum + item.kwhPerDay, 0);
  const alwaysOnKwhPerMonth = items
    .filter((item) => item.alwaysOn)
    .reduce((sum, item) => sum + item.kwhPerMonth, 0);
  const kwhPerMonth = items.reduce((sum, item) => sum + item.kwhPerMonth, 0);

  return {
    kwhPerDay: round(kwhPerDay),
    kwhPerMonth: round(kwhPerMonth),
    alwaysOnKwhPerMonth: round(alwaysOnKwhPerMonth),
    switchableKwhPerMonth: round(kwhPerMonth - alwaysOnKwhPerMonth),
    alwaysOnSharePercent: kwhPerMonth > 0 ? Math.round((alwaysOnKwhPerMonth / kwhPerMonth) * 100) : 0,
    applianceCount: items.length,
    alwaysOnCount: items.filter((item) => item.alwaysOn).length,
  };
}
