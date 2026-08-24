import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { AppError } from '../errors.js';
import {
  buildRechargeAdvice,
  currentMonth,
  listReadings,
  recordReading,
} from '../services/household.service.js';
import { parse } from '../validate.js';

/**
 * Le compteur : la seule source de vérité mesurée de l'application.
 *
 * Tout le reste (inventaire, profils d'usage, coefficients) est une estimation
 * plus ou moins fine. Le nombre affiché sur le boîtier mural, lui, ne se
 * discute pas. Ces routes lui donnent la place qu'il mérite : elles écrasent
 * l'estimation plutôt que de la moyenner avec elle.
 */

const readingSchema = z.object({
  /**
   * kWh restants lus sur l'écran du boîtier. Le plafond est large : certains
   * foyers rechargent plusieurs mois d'avance avant une hausse de tarif.
   */
  remainingKwh: z.number().min(0).max(20_000),
  note: z.string().max(140).nullish(),
  readAt: z.coerce.date().optional(),
});

export async function meterRoutes(app: FastifyInstance) {
  /** Enregistrer ce qui est affiché sur le boîtier, maintenant. */
  app.post('/api/households/:id/readings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parse(readingSchema, request.body);
    const user = await requireUser(request);

    // Un relevé daté du futur n'a pas de sens : il fausserait le cumul du mois.
    if (body.readAt && body.readAt.getTime() > Date.now() + 60_000) {
      throw new AppError('Ce relevé est daté du futur. Vérifiez la date.');
    }

    const reading = await recordReading(
      id,
      { remainingKwh: body.remainingKwh, note: body.note, readAt: body.readAt },
      user,
    );
    reply.code(201);
    return reading;
  });

  /** L'historique des relevés : il rend la dérive visible dans le temps. */
  app.get('/api/households/:id/readings', async (request) => {
    const { id } = request.params as { id: string };
    const readings = await listReadings(id, await requireUser(request));
    return { readings };
  });

  /**
   * Le conseil d'achat. Volontairement en lecture seule : l'application
   * conseille, elle n'achète pas et n'enregistre rien a la place de l'utilisateur.
   */
  app.get('/api/households/:id/recharge-advice', async (request) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    return buildRechargeAdvice(id, month ?? currentMonth(), await requireUser(request));
  });
}
