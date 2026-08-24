import {
  APPLIANCE_TEMPLATES,
  DAYS_PER_MONTH,
  CATEGORIES,
  DEFAULT_TARIFF_CODE,
  computeConsumption,
  defaultSelection,
  findTemplate,
  marginalCost,
  searchTemplates,
} from '@woyofal/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notFound } from '../errors.js';
import { buildSummary, currentMonth } from '../services/household.service.js';
import { loadPlan, loadPlans } from '../services/tariff.service.js';
import { requireUser } from '../auth/session.js';
import { prisma } from '../db.js';
import { parse } from '../validate.js';

const updateTariffSchema = z.object({
  vatRate: z.number().min(0).max(1).optional(),
  fixedFeePerMonth: z.number().min(0).max(100_000).optional(),
  source: z.string().max(200).optional(),
  tiers: z
    .array(
      z.object({
        position: z.number().int().min(1).max(10),
        pricePerKwh: z.number().min(1).max(5000).optional(),
        toKwh: z.number().min(1).max(100_000).nullable().optional(),
        vatExempt: z.boolean().optional(),
      }),
    )
    .max(10)
    .optional(),
});

const previewSchema = z.object({
  options: z.record(z.string()).default({}),
  usageProfileId: z.string().optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  hoursPerDay: z.number().min(0).max(24).optional(),
  daysPerWeek: z.number().min(0).max(7).optional(),
  householdId: z.string().optional(),
  tariffCode: z.string().optional(),
});

export async function catalogRoutes(app: FastifyInstance) {
  /** Le catalogue visuel : c’est lui qui alimente la grille d’illustrations. */
  app.get('/api/catalog', async (request) => {
    const query = (request.query as { q?: string }).q;
    const templates = query ? searchTemplates(query) : APPLIANCE_TEMPLATES;
    return { categories: CATEGORIES, templates };
  });

  app.get('/api/catalog/:templateId', async (request) => {
    const { templateId } = request.params as { templateId: string };
    const template = findTemplate(templateId);
    if (!template) throw notFound(`L’appareil "${templateId}"`);
    const selection = defaultSelection(template);
    return {
      template,
      defaultSelection: selection,
      preview: computeConsumption(template, selection),
    };
  });

  /**
   * Previsualisation en direct pendant que l’utilisateur clique sur les
   * caractéristiques. On répond le COÛT MARGINAL : "ce que cet appareil
   * ajoutera a votre facture", et non son coût isole en tranche 1.
   */
  app.post('/api/catalog/:templateId/preview', async (request) => {
    const { templateId } = request.params as { templateId: string };
    const template = findTemplate(templateId);
    if (!template) throw notFound(`L’appareil "${templateId}"`);
    const body = parse(previewSchema, request.body ?? {});

    const consumption = computeConsumption(template, {
      templateId,
      options: body.options,
      usageProfileId: body.usageProfileId,
      quantity: body.quantity,
      hoursPerDay: body.hoursPerDay,
      daysPerWeek: body.daysPerWeek,
    });

    let baseKwh = 0;
    let tariffCode = body.tariffCode ?? DEFAULT_TARIFF_CODE;
    if (body.householdId) {
      const summary = await buildSummary(body.householdId, currentMonth(), await requireUser(request));
      baseKwh = summary.totals.kwhPerMonth;
      tariffCode = summary.household.tariffCode;
    }

    const plan = await loadPlan(tariffCode);
    const bill = marginalCost(baseKwh, consumption.kwhPerMonth, plan);

    return {
      consumption,
      monthlyAmount: bill.totalTTC,
      dailyAmount: Math.round(bill.totalTTC / DAYS_PER_MONTH),
      yearlyAmount: bill.totalTTC * 12,
      tierLabel: bill.currentTier.label,
      pricePerKwh: bill.averagePricePerKwh,
    };
  });

  app.get('/api/tariffs', async () => ({ plans: await loadPlans() }));

  /**
   * Les tarifs Senelec changent. L’utilisateur (ou l’administrateur) doit
   * pouvoir corriger la grille depuis l’application, sans redéploiement :
   * il lui suffit de recopier les prix de son reçu Woyofal.
   */
  app.patch('/api/tariffs/:code', async (request) => {
    const { code } = request.params as { code: string };
    const body = parse(updateTariffSchema, request.body);
    const existing = await prisma.tariffPlan.findUnique({ where: { code } });
    if (!existing) throw notFound(`La grille tarifaire "${code}"`);

    await prisma.tariffPlan.update({
      where: { code },
      data: {
        ...(body.vatRate !== undefined ? { vatRate: body.vatRate } : {}),
        ...(body.fixedFeePerMonth !== undefined ? { fixedFeePerMonth: body.fixedFeePerMonth } : {}),
        isCustom: true,
        source: body.source ?? 'Grille personnalisee par l’utilisateur',
      },
    });

    for (const tier of body.tiers ?? []) {
      await prisma.tariffTier.updateMany({
        where: { planCode: code, position: tier.position },
        data: {
          ...(tier.pricePerKwh !== undefined ? { pricePerKwh: tier.pricePerKwh } : {}),
          ...(tier.toKwh !== undefined ? { toKwh: tier.toKwh } : {}),
          ...(tier.vatExempt !== undefined ? { vatExempt: tier.vatExempt } : {}),
        },
      });
    }

    return loadPlan(code);
  });
}
