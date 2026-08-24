import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import type { GoogleVerifier } from './auth/google.js';
import { verifyGoogleCredential } from './auth/google.js';
import { sessionSecret } from './auth/session.js';
import { authRoutes } from './routes/auth.routes.js';
import { prisma } from './db.js';
import { AppError } from './errors.js';
import { applianceRoutes } from './routes/appliance.routes.js';
import { syncCatalog } from './services/catalog.sync.js';
import { meterRoutes } from './routes/meter.routes.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { estimateRoutes } from './routes/estimate.routes.js';
import { householdRoutes } from './routes/household.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * `verifyGoogleCredential` est injectable : les tests d'intégration fournissent
 * une identité factice sans dépendre du réseau ni d'un vrai compte Google.
 */
export async function buildServer(options: { verifyGoogle?: GoogleVerifier } = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN?.split(',') ?? true,
    // Indispensable pour que le cookie de session voyage avec les requêtes.
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, { secret: sessionSecret() });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    app.log.error(error);
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    return reply.code(statusCode).send({
      error: 'INTERNAL_ERROR',
      message:
        statusCode === 500
          ? "Une erreur est survenue de notre cote. Réessayez dans un instant."
          : error.message,
    });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'woyofal-map', time: new Date().toISOString() }));

  await app.register(authRoutes(options.verifyGoogle ?? verifyGoogleCredential));
  await app.register(catalogRoutes);
  await app.register(householdRoutes);
  await app.register(applianceRoutes);
  await app.register(meterRoutes);
  await app.register(estimateRoutes);

  // En production, l’API sert aussi le front compile : un seul conteneur a déployer.
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Route inconnue.' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (isMain) {
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';
  /**
   * Le catalogue est recopié en base a chaque démarrage.
   *
   * `Appliance.templateId` porte une clé étrangère vers ce miroir : sur une base
   * neuve ou après une mise a jour du catalogue, l'oublier fait échouer tout
   * ajout d'appareil. Le faire ici rend le déploiement infaillible — c'est
   * idempotent, et ça coûte quelques dizaines de millisecondes.
   */
  syncCatalog()
    .then(() => buildServer())
    .then((app) => app.listen({ port, host }))
    .then(() => {
      // Message volontairement écrit pour quelqu'un qui n'est pas developpeur.
      console.log('');
      console.log('  ✅  Woyofal Map est démarrée.');
      console.log('');
      console.log(`  👉  Ouvrez cette adresse dans votre navigateur :  http://localhost:${port}`);
      console.log('');
      console.log('  Pour arrêter : appuyez sur Ctrl + C dans cette fenêtre.');
      console.log('');
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
}
