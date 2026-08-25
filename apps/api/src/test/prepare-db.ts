import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_DB = 'file:./test.db';

/** Recrée une base vierge avant la campagne de tests. */
export async function setup() {
  for (const file of fs.readdirSync(path.join(apiRoot, 'prisma'))) {
    if (file.startsWith('test.db')) fs.unlinkSync(path.join(apiRoot, 'prisma', file));
  }
  // Le schéma dérivé porte le bon `provider` pour la base visée : ici un
  // simple fichier, alors que la production tourne sur PostgreSQL.
  execFileSync('node', ['../../scripts/prisma-schema.mjs'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'ignore',
  });
  execFileSync(
    'npx',
    [
      'prisma',
      'db',
      'push',
      '--skip-generate',
      '--accept-data-loss',
      '--schema',
      'prisma/schema.runtime.prisma',
    ],
    {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB },
      stdio: 'ignore',
    },
  );

  // Sans le miroir du catalogue, toute création d'appareil viole une clé
  // étrangère. Les tests doivent partir d'une base aussi complète qu'en vrai.
  process.env.DATABASE_URL = TEST_DB;
  const { syncCatalog } = await import('../services/catalog.sync.js');
  const { prisma } = await import('../db.js');
  await syncCatalog();
  await prisma.$disconnect();
}
