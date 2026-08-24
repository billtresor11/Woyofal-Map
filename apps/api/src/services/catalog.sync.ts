import { APPLIANCE_TEMPLATES, TARIFF_PLANS } from '@woyofal/core';
import { prisma } from '../db.js';

/**
 * Recopie le catalogue et les grilles du moteur vers la base.
 *
 * La table `ApplianceTemplate` est un MIROIR de `packages/core/src/catalog.ts`,
 * pas une source indépendante : elle existe pour qu'une correction d'appareil
 * puisse se faire sans redéploiement, et parce que `Appliance.templateId` porte
 * une clé étrangère. Une base sans ce miroir refuse tout ajout d'appareil — ce
 * qui est arrivé, et que les tests attrapent désormais.
 *
 * Idempotent : appelable au démarrage, dans le seed, et avant les tests.
 */
export async function syncTariffPlans(): Promise<number> {
  for (const plan of TARIFF_PLANS) {
    const commun = {
      label: plan.label,
      description: plan.description,
      meterType: plan.meterType,
      periodMonths: plan.periodMonths,
      minKva: plan.minKva,
      maxKva: plan.maxKva,
      vatRate: plan.vatRate,
      municipalTaxRate: plan.municipalTaxRate,
      fixedFeePerMonth: plan.fixedFeePerMonth,
      source: plan.source,
      effectiveFrom: plan.effectiveFrom,
    };
    const tiers = plan.tiers.map((tier) => ({
      position: tier.order,
      fromKwh: tier.fromKwh,
      toKwh: tier.toKwh,
      pricePerKwh: tier.pricePerKwh,
      label: tier.label,
      vatExempt: tier.vatExempt,
    }));

    await prisma.tariffPlan.upsert({
      where: { code: plan.code },
      create: { code: plan.code, ...commun, tiers: { create: tiers } },
      // Les tranches sont remplacées en bloc : c'est une grille, pas une liste
      // que l'on modifie ligne à ligne.
      update: { ...commun, tiers: { deleteMany: {}, create: tiers } },
    });
  }
  return TARIFF_PLANS.length;
}

export async function syncApplianceTemplates(): Promise<number> {
  for (const template of APPLIANCE_TEMPLATES) {
    const data = {
      name: template.name,
      category: template.category,
      emoji: template.emoji,
      alwaysOn: template.alwaysOn,
      basePowerWatts: template.basePowerWatts,
      dutyCycle: template.dutyCycle,
      definition: JSON.stringify({
        keywords: template.keywords,
        attributes: template.attributes,
        usageProfiles: template.usageProfiles ?? [],
        defaultUsageProfileId: template.defaultUsageProfileId,
        allowQuantity: template.allowQuantity,
        tips: template.tips,
      }),
    };
    await prisma.applianceTemplate.upsert({
      where: { id: template.id },
      create: { id: template.id, ...data },
      update: data,
    });
  }
  return APPLIANCE_TEMPLATES.length;
}

export async function syncCatalog(): Promise<{ plans: number; templates: number }> {
  const plans = await syncTariffPlans();
  const templates = await syncApplianceTemplates();
  return { plans, templates };
}
