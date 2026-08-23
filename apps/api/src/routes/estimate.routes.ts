import {
  DEFAULT_TARIFF_CODE,
  computePunctualKwh,
  defaultSelection,
  estimatePunctual,
  findTemplate,
  kwhForAmount,
} from '@woyofal/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound } from '../errors.js';
import { buildSummary, getHouseholdOrThrow } from '../services/household.service.js';
import { loadPlan } from '../services/tariff.service.js';
import { parse } from '../validate.js';

const punctualSchema = z.object({
  templateId: z.string().min(1),
  options: z.record(z.string()).optional(),
  quantity: z.number().int().min(1).max(50).optional(),
  durationMinutes: z.number().int().min(1).max(24 * 60 * 31),
  householdId: z.string().optional(),
  tariffCode: z.string().optional(),
  memberId: z.string().nullish(),
  /** true = on enregistre la session pour l’inclure dans la répartition du mois. */
  save: z.boolean().default(false),
  label: z.string().max(60).optional(),
});

const rechargeSchema = z.object({
  amount: z.number().min(100).max(2_000_000),
  householdId: z.string().optional(),
  tariffCode: z.string().optional(),
});

export async function estimateRoutes(app: FastifyInstance) {
  /**
   * Onglet 2 : "Quel est le coût d’une session de 3h de PlayStation ?"
   * Le prix depend de la tranche déjà atteinte dans le mois : on la récupère
   * du foyer quand il est connu.
   */
  app.post('/api/estimate/punctual', async (request) => {
    const body = parse(punctualSchema, request.body);
    const template = findTemplate(body.templateId);
    if (!template) throw notFound(`L’appareil "${body.templateId}"`);

    const base = defaultSelection(template);
    const selection = {
      ...base,
      options: { ...base.options, ...(body.options ?? {}) },
      quantity: body.quantity ?? base.quantity,
    };

    let previousKwh = 0;
    let tariffCode = body.tariffCode ?? DEFAULT_TARIFF_CODE;
    if (body.householdId) {
      const summary = await buildSummary(body.householdId);
      previousKwh = summary.consumedSoFar.kwh;
      tariffCode = summary.household.tariffCode;
    }

    const plan = await loadPlan(tariffCode);
    const kwh = computePunctualKwh(template, selection, body.durationMinutes);
    const estimate = estimatePunctual(kwh, body.durationMinutes, plan, previousKwh);

    let sessionId: string | null = null;
    if (body.save && body.householdId) {
      await getHouseholdOrThrow(body.householdId);
      const session = await prisma.punctualSession.create({
        data: {
          householdId: body.householdId,
          memberId: body.memberId ?? null,
          templateId: body.templateId,
          label: body.label ?? template.name,
          optionsJson: JSON.stringify(selection.options),
          durationMinutes: body.durationMinutes,
          kwh,
          amount: estimate.amount,
        },
      });
      sessionId = session.id;
    }

    return {
      template: { id: template.id, name: template.name, emoji: template.emoji },
      selection,
      previousKwh,
      estimate,
      sessionId,
    };
  });

  /** "Avec 5 000 FCFA de recharge, je reçois combien de kWh ?" */
  app.post('/api/estimate/recharge', async (request) => {
    const body = parse(rechargeSchema, request.body);
    let previousKwh = 0;
    let tariffCode = body.tariffCode ?? DEFAULT_TARIFF_CODE;
    if (body.householdId) {
      const summary = await buildSummary(body.householdId);
      previousKwh = summary.consumedSoFar.kwh;
      tariffCode = summary.household.tariffCode;
    }
    const plan = await loadPlan(tariffCode);
    const result = kwhForAmount(body.amount, plan, previousKwh);
    return { ...result, previousKwh, planCode: plan.code };
  });

  app.delete('/api/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const existing = await prisma.punctualSession.findUnique({ where: { id: sessionId } });
    if (!existing) throw notFound('Cette session');
    await prisma.punctualSession.delete({ where: { id: sessionId } });
    reply.code(204);
    return null;
  });
}
