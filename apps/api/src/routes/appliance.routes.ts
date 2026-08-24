import { findTemplate } from '@woyofal/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { prisma } from '../db.js';
import { notFound } from '../errors.js';
import {
  assertOwner,
  computeFromSelection,
  getHouseholdOrThrow,
  serializeAppliance,
} from '../services/household.service.js';
import { parse } from '../validate.js';

const applianceSchema = z.object({
  templateId: z.string().min(1),
  label: z.string().min(1).max(60).optional(),
  options: z.record(z.string()).default({}),
  usageProfileId: z.string().nullish(),
  quantity: z.number().int().min(1).max(999).default(1),
  /** Fréquence sur mesure, quand aucun choix proposé ne convient. */
  hoursPerDay: z.number().min(0).max(24).optional(),
  daysPerWeek: z.number().min(0).max(7).optional(),
  ownership: z.enum(['SHARED', 'PRIVATE']).default('SHARED'),
  ownerId: z.string().nullish(),
  roomId: z.string().nullish(),
  shares: z.record(z.number().min(0)).optional(),
});

const updateApplianceSchema = applianceSchema.partial().omit({ templateId: true });

export async function applianceRoutes(app: FastifyInstance) {
  /** Ajouter un appareil : le serveur recalcule toujours la consommation. */
  app.post('/api/households/:id/appliances', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parse(applianceSchema, request.body);
    await getHouseholdOrThrow(id, await requireUser(request));

    const template = findTemplate(body.templateId);
    if (!template) throw notFound(`L’appareil "${body.templateId}"`);

    const consumption = computeFromSelection({
      templateId: body.templateId,
      options: body.options,
      usageProfileId: body.usageProfileId ?? undefined,
      quantity: body.quantity,
      hoursPerDay: body.hoursPerDay,
      daysPerWeek: body.daysPerWeek,
    });

    const appliance = await prisma.appliance.create({
      data: {
        householdId: id,
        templateId: body.templateId,
        label: body.label ?? template.name,
        optionsJson: JSON.stringify(body.options),
        usageProfileId: body.usageProfileId ?? null,
        quantity: consumption.quantity,
        ownership: body.ownership,
        ownerId: body.ownerId ?? null,
        roomId: body.roomId ?? null,
        watts: consumption.watts,
        dutyCycle: consumption.dutyCycle,
        hoursPerDay: consumption.hoursPerDay,
        daysPerWeek: consumption.daysPerWeek,
        alwaysOn: consumption.alwaysOn,
        kwhPerDay: consumption.kwhPerDay,
        kwhPerMonth: consumption.kwhPerMonth,
        shares: body.shares
          ? {
              create: Object.entries(body.shares).map(([memberId, weight]) => ({
                memberId,
                weight,
              })),
            }
          : undefined,
      },
      include: { shares: true },
    });

    reply.code(201);
    return serializeAppliance(appliance);
  });

  app.patch('/api/appliances/:applianceId', async (request) => {
    const { applianceId } = request.params as { applianceId: string };
    const body = parse(updateApplianceSchema, request.body);
    const existing = await prisma.appliance.findUnique({
      where: { id: applianceId },
      include: { shares: true, household: true },
    });
    if (!existing) throw notFound('Cet appareil');
    assertOwner(existing.household, await requireUser(request));

    const options = body.options ?? (JSON.parse(existing.optionsJson) as Record<string, string>);
    // `null` envoyé explicitement = l'utilisateur a choisi une fréquence sur mesure.
    const usageProfileId =
      body.usageProfileId === undefined ? existing.usageProfileId : body.usageProfileId;
    const consumption = computeFromSelection({
      templateId: existing.templateId,
      options,
      usageProfileId: usageProfileId ?? undefined,
      quantity: body.quantity ?? existing.quantity,
      hoursPerDay: body.hoursPerDay,
      daysPerWeek: body.daysPerWeek,
    });

    const updated = await prisma.appliance.update({
      where: { id: applianceId },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.ownership !== undefined ? { ownership: body.ownership } : {}),
        ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {}),
        ...(body.roomId !== undefined ? { roomId: body.roomId } : {}),
        optionsJson: JSON.stringify(options),
        usageProfileId,
        quantity: consumption.quantity,
        watts: consumption.watts,
        dutyCycle: consumption.dutyCycle,
        hoursPerDay: consumption.hoursPerDay,
        daysPerWeek: consumption.daysPerWeek,
        alwaysOn: consumption.alwaysOn,
        kwhPerDay: consumption.kwhPerDay,
        kwhPerMonth: consumption.kwhPerMonth,
        ...(body.shares
          ? {
              shares: {
                deleteMany: {},
                create: Object.entries(body.shares).map(([memberId, weight]) => ({
                  memberId,
                  weight,
                })),
              },
            }
          : {}),
      },
      include: { shares: true },
    });

    return serializeAppliance(updated);
  });

  app.delete('/api/appliances/:applianceId', async (request, reply) => {
    const { applianceId } = request.params as { applianceId: string };
    const existing = await prisma.appliance.findUnique({
      where: { id: applianceId },
      include: { household: true },
    });
    if (!existing) throw notFound('Cet appareil');
    assertOwner(existing.household, await requireUser(request));
    await prisma.appliance.delete({ where: { id: applianceId } });
    reply.code(204);
    return null;
  });
}
