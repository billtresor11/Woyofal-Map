import type { TariffPlan } from '@woyofal/core';
import { TARIFF_PLANS } from '@woyofal/core';
import { prisma } from '../db.js';
import { notFound } from '../errors.js';

type PlanRow = {
  code: string;
  label: string;
  description: string;
  meterType: string;
  periodMonths: number;
  minKva: number;
  maxKva: number | null;
  vatRate: number;
  municipalTaxRate: number;
  fixedFeePerMonth: number;
  source: string;
  effectiveFrom: string;
  tiers: Array<{
    position: number;
    fromKwh: number;
    toKwh: number | null;
    pricePerKwh: number;
    label: string;
    vatExempt: boolean;
  }>;
};

/**
 * La grille tarifaire vit en base (donc modifiable par l utilisateur), mais
 * l algorithme, lui, vit dans @woyofal/core. On convertit l une vers l autre.
 */
function toCorePlan(row: PlanRow): TariffPlan {
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    meterType: row.meterType === 'POSTPAID' ? 'POSTPAID' : 'PREPAID',
    periodMonths: row.periodMonths === 2 ? 2 : 1,
    minKva: row.minKva,
    maxKva: row.maxKva,
    currency: 'FCFA',
    vatRate: row.vatRate,
    municipalTaxRate: row.municipalTaxRate,
    fixedFeePerMonth: row.fixedFeePerMonth,
    source: row.source,
    effectiveFrom: row.effectiveFrom,
    tiers: [...row.tiers]
      .sort((a, b) => a.position - b.position)
      .map((tier) => ({
        order: tier.position,
        fromKwh: tier.fromKwh,
        toKwh: tier.toKwh,
        pricePerKwh: tier.pricePerKwh,
        label: tier.label,
        vatExempt: tier.vatExempt,
      })),
  };
}

export async function loadPlans(): Promise<TariffPlan[]> {
  const rows = await prisma.tariffPlan.findMany({ include: { tiers: true } });
  if (rows.length === 0) return TARIFF_PLANS; // base pas encore seedee : repli sur le catalogue
  return rows.map(toCorePlan);
}

export async function loadPlan(code: string): Promise<TariffPlan> {
  const row = await prisma.tariffPlan.findUnique({ where: { code }, include: { tiers: true } });
  if (row) return toCorePlan(row);
  const fallback = TARIFF_PLANS.find((plan) => plan.code === code);
  if (!fallback) throw notFound(`La grille tarifaire "${code}"`);
  return fallback;
}
