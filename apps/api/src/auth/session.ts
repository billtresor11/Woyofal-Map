import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import { authEnabled } from './google.js';

/**
 * ---------------------------------------------------------------------------
 * SESSION
 * ---------------------------------------------------------------------------
 * Après la vérification Google, le serveur émet SON PROPRE jeton de session,
 * déposé dans un cookie `httpOnly` : le JavaScript de la page ne peut pas le
 * lire, ce qui met la session à l'abri d'une injection de script.
 *
 * Le jeton Google, lui, n'est utilisé qu'une fois — à la connexion — et n'est
 * jamais conservé.
 */

export const SESSION_COOKIE = 'woyofal_session';
/** Un mois : assez long pour ne jamais redemander la connexion au quotidien. */
export const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET est obligatoire en production (au moins 32 caractères aléatoires).',
    );
  }
  // En développement uniquement : évite d'avoir à configurer quoi que ce soit.
  return 'developpement-woyofal-map-secret-non-securise';
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Où trouver le jeton de session.
 *
 * Deux clients, deux mécanismes :
 *   - le NAVIGATEUR reçoit un cookie `httpOnly`, que son JavaScript ne peut pas
 *     lire — c'est ce qui protège la session d'une injection de script ;
 *   - l'application MOBILE n'a pas de cookie : elle garde le jeton dans le
 *     trousseau sécurisé du téléphone et le présente dans `Authorization`.
 *
 * Le cookie est lu en premier : sur le web, il fait toujours autorité, et un
 * en-tête forgé ne doit jamais pouvoir passer devant lui.
 */
function extraireJeton(request: FastifyRequest): string | null {
  const cookie = request.cookies[SESSION_COOKIE];
  if (cookie) return cookie;

  const entete = request.headers.authorization;
  if (entete && entete.startsWith('Bearer ')) {
    const jeton = entete.slice(7).trim();
    if (jeton) return jeton;
  }
  return null;
}

/** Lit la session, sans exiger qu'elle existe. */
export async function currentUser(request: FastifyRequest): Promise<SessionUser | null> {
  const token = extraireJeton(request);
  if (!token) return null;
  try {
    const payload = request.server.jwt.verify<{ sub: string }>(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, picture: user.picture };
  } catch {
    return null;
  }
}

/**
 * Exige une session valide.
 * Quand la connexion Google n'est pas configurée (développement, démonstration
 * hors ligne), l'application reste utilisable sans compte : on renvoie `null`
 * et les foyers sans propriétaire restent accessibles.
 */
export async function requireUser(request: FastifyRequest): Promise<SessionUser | null> {
  const user = await currentUser(request);
  if (user) return user;
  if (!authEnabled()) return null;
  throw new AppError('Connectez-vous pour accéder à votre foyer.', 401, 'UNAUTHENTICATED');
}
