import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AuthError,
  type GoogleVerifier,
  anonymousAllowed,
  authEnabled,
  googleClientId,
  verifyGoogleCredential,
} from '../auth/google.js';
import {
  SESSION_DAYS,
  clearSessionCookie,
  currentUser,
  setSessionCookie,
} from '../auth/session.js';
import { prisma } from '../db.js';

const loginSchema = z.object({
  /** Le jeton d'identité renvoyé par Google Identity Services. */
  credential: z.string().min(20),
});

export function authRoutes(verify: GoogleVerifier = verifyGoogleCredential) {
  return async function register(app: FastifyInstance) {
    /**
     * L'application demande d'abord comment se connecter : cela lui évite
     * d'afficher un bouton Google si le serveur n'est pas configuré pour.
     */
    app.get('/api/auth/config', async () => ({
      googleEnabled: authEnabled(),
      googleClientId: googleClientId(),
      anonymousAllowed: anonymousAllowed(),
    }));

    /** Qui suis-je ? Utilisé au démarrage pour retrouver une session ouverte. */
    app.get('/api/auth/me', async (request) => ({
      user: await currentUser(request),
      googleEnabled: authEnabled(),
      /** Le seul cas où l'application a le droit d'entrer sans compte. */
      anonymousAllowed: anonymousAllowed(),
    }));

    /**
     * Connexion : on vérifie le jeton Google, on retrouve ou crée le compte,
     * puis on ouvre une session maison.
     */
    app.post('/api/auth/google', async (request, reply) => {
      const body = loginSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Jeton de connexion absent.' });
      }

      let identity;
      try {
        identity = await verify(body.data.credential);
      } catch (error) {
        const message =
          error instanceof AuthError ? error.message : 'Connexion refusée par Google.';
        return reply.code(401).send({ error: 'UNAUTHENTICATED', message });
      }

      // L'identifiant Google fait foi : une adresse peut changer, pas lui.
      const user = await prisma.user.upsert({
        where: { googleId: identity.googleId },
        create: {
          googleId: identity.googleId,
          email: identity.email,
          name: identity.name,
          picture: identity.picture ?? null,
        },
        update: {
          email: identity.email,
          name: identity.name,
          picture: identity.picture ?? null,
          lastSeenAt: new Date(),
        },
      });

      const token = app.jwt.sign({ sub: user.id }, { expiresIn: `${SESSION_DAYS}d` });
      setSessionCookie(reply, token);

      return {
        /**
         * Le jeton n'est renvoyé dans le corps que pour l'application mobile,
         * qui n'a pas de cookie et le rangera dans le trousseau du téléphone.
         * Le navigateur, lui, l'ignore : il a déjà son cookie `httpOnly`.
         */
        token,
        user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      };
    });

    /** Déconnexion : le cookie est effacé, rien d'autre à nettoyer. */
    app.post('/api/auth/logout', async (_request, reply) => {
      clearSessionCookie(reply);
      return { ok: true };
    });
  };
}
