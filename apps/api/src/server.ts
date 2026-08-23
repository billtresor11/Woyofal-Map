import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import { prisma } from './db.js';
import { AppError } from './errors.js';
import { applianceRoutes } from './routes/appliance.routes.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { estimateRoutes } from './routes/estimate.routes.js';
import { householdRoutes } from './routes/household.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
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
  });

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

  await app.register(catalogRoutes);
  await app.register(householdRoutes);
  await app.register(applianceRoutes);
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
  buildServer()
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
