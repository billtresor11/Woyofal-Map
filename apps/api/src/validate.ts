import type { ZodTypeAny, z } from 'zod';
import { AppError } from './errors.js';

/** Valide une entree et transforme les erreurs Zod en message lisible. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'corps'} : ${issue.message}`)
      .join(' ; ');
    throw new AppError(`Données invalides. ${detail}`, 422, 'VALIDATION_ERROR');
  }
  return result.data;
}
