import { kwhForAmount } from '@woyofal/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound } from '../errors.js';
import {
  buildSplit,
  buildSummary,
  currentMonth,
  getHouseholdOrThrow,
} from '../services/household.service.js';
import { loadPlan } from '../services/tariff.service.js';
import { parse } from '../validate.js';

const MEMBER_COLORS = [
  '#F97316',
  '#0EA5E9',
  '#22C55E',
  '#8B5CF6',
  '#EC4899',
  '#EAB308',
  '#14B8A6',
  '#EF4444',
];

const createHouseholdSchema = z.object({
  name: z.string().min(1).max(60),
  tariffCode: z.string().default('WOYOFAL_DPP'),
  meterType: z.enum(['PREPAID', 'POSTPAID']).default('PREPAID'),
  subscribedKva: z.number().int().min(1).max(60).default(5),
  monthlyBudget: z.number().int().min(0).max(10_000_000).nullish(),
  members: z
    .array(z.object({ name: z.string().min(1).max(40), emoji: z.string().max(8).optional() }))
    .max(12)
    .optional(),
});

const updateHouseholdSchema = createHouseholdSchema.partial().omit({ members: true });

const memberSchema = z.object({
  name: z.string().min(1).max(40),
  emoji: z.string().max(8).default('🙂'),
  color: z.string().max(20).optional(),
  presenceRatio: z.number().min(0).max(1).default(1),
});

const topUpSchema = z.object({
  amount: z.number().min(100).max(2_000_000),
  kwh: z.number().min(0).max(10_000).optional(),
  purchasedAt: z.coerce.date().optional(),
});

export async function householdRoutes(app: FastifyInstance) {
  app.post('/api/households', async (request, reply) => {
    const body = parse(createHouseholdSchema, request.body);
    const household = await prisma.household.create({
      data: {
        name: body.name,
        tariffCode: body.tariffCode,
        meterType: body.meterType,
        subscribedKva: body.subscribedKva,
        monthlyBudget: body.monthlyBudget ?? null,
        members: {
          create: (body.members ?? []).map((member, index) => ({
            name: member.name,
            emoji: member.emoji ?? '🙂',
            color: MEMBER_COLORS[index % MEMBER_COLORS.length]!,
          })),
        },
      },
      include: { members: true },
    });
    reply.code(201);
    return household;
  });

  app.get('/api/households/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    return buildSummary(id, month ?? currentMonth());
  });

  app.get('/api/households/:id/summary', async (request) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    return buildSummary(id, month ?? currentMonth());
  });

  app.patch('/api/households/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = parse(updateHouseholdSchema, request.body);
    await getHouseholdOrThrow(id);
    return prisma.household.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.tariffCode !== undefined ? { tariffCode: body.tariffCode } : {}),
        ...(body.meterType !== undefined ? { meterType: body.meterType } : {}),
        ...(body.subscribedKva !== undefined ? { subscribedKva: body.subscribedKva } : {}),
        ...(body.monthlyBudget !== undefined ? { monthlyBudget: body.monthlyBudget } : {}),
      },
    });
  });

  // --- Membres du foyer -----------------------------------------------------

  app.post('/api/households/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parse(memberSchema, request.body);
    const household = await getHouseholdOrThrow(id);
    const member = await prisma.member.create({
      data: {
        householdId: id,
        name: body.name,
        emoji: body.emoji,
        color: body.color ?? MEMBER_COLORS[household.members.length % MEMBER_COLORS.length]!,
        presenceRatio: body.presenceRatio,
      },
    });
    reply.code(201);
    return member;
  });

  app.patch('/api/members/:memberId', async (request) => {
    const { memberId } = request.params as { memberId: string };
    const body = parse(memberSchema.partial(), request.body);
    const existing = await prisma.member.findUnique({ where: { id: memberId } });
    if (!existing) throw notFound('Ce membre');
    return prisma.member.update({ where: { id: memberId }, data: body });
  });

  app.delete('/api/members/:memberId', async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const existing = await prisma.member.findUnique({ where: { id: memberId } });
    if (!existing) throw notFound('Ce membre');
    await prisma.member.delete({ where: { id: memberId } });
    reply.code(204);
    return null;
  });

  // --- Répartition ----------------------------------------------------------

  app.get('/api/households/:id/split', async (request) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    return buildSplit(id, month ?? currentMonth());
  });

  // --- Recharges Woyofal ----------------------------------------------------

  app.get('/api/households/:id/topups', async (request) => {
    const { id } = request.params as { id: string };
    await getHouseholdOrThrow(id);
    return prisma.topUp.findMany({
      where: { householdId: id },
      orderBy: { purchasedAt: 'desc' },
      take: 24,
    });
  });

  /**
   * Enregistrer une recharge. Si l’utilisateur ne connait que le montant payé,
   * on déduit les kWh reçus en rejouant les tranches déjà atteintes ce mois-ci.
   */
  app.post('/api/households/:id/topups', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parse(topUpSchema, request.body);
    const household = await getHouseholdOrThrow(id);
    const plan = await loadPlan(household.tariffCode);

    let kwh = body.kwh;
    if (kwh === undefined) {
      const summary = await buildSummary(id);
      kwh = kwhForAmount(body.amount, plan, summary.consumedSoFar.kwh).kwh;
    }

    const topUp = await prisma.topUp.create({
      data: {
        householdId: id,
        amount: body.amount,
        kwh,
        ...(body.purchasedAt ? { purchasedAt: body.purchasedAt } : {}),
      },
    });
    reply.code(201);
    return topUp;
  });
}
