import { findTemplate } from '@woyofal/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound } from '../errors.js';
import {
  computeFromSelection,
  getHouseholdOrThrow,
  serializeAppliance,
} from '../services/household.service.js';
import { parse } from '../validate.js';

const applianceSchema = z.object({
  templateId: z.string().min(1),
  label: z.string().min(1).max(60).optional(),
  options: z.record(z.string()).default({}),
  usageProfileId: z.string().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
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
    await getHouseholdOrThrow(id);

    const template = findTemplate(body.templateId);
    if (!template) throw notFound(`L appareil "${body.templateId}"`);

    const consumption = computeFromSelection({
      templateId: body.templateId,
      options: body.options,
      usageProfileId: body.usageProfileId,
      quantity: body.quantity,
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
      include: { shares: true },
    });
    if (!existing) throw notFound('Cet appareil');

    const options = body.options ?? (JSON.parse(existing.optionsJson) as Record<string, string>);
    const consumption = computeFromSelection({
      templateId: existing.templateId,
      options,
      usageProfileId: body.usageProfileId ?? existing.usageProfileId ?? undefined,
      quantity: body.quantity ?? existing.quantity,
    });

    const updated = await prisma.appliance.update({
      where: { id: applianceId },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.ownership !== undefined ? { ownership: body.ownership } : {}),
        ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {}),
        ...(body.roomId !== undefined ? { roomId: body.roomId } : {}),
        optionsJson: JSON.stringify(options),
        usageProfileId: body.usageProfileId ?? existing.usageProfileId,
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
    const existing = await prisma.appliance.findUnique({ where: { id: applianceId } });
    if (!existing) throw notFound('Cet appareil');
    await prisma.appliance.delete({ where: { id: applianceId } });
    reply.code(204);
    return null;
  });
}
