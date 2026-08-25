#!/usr/bin/env node
/**
 * ---------------------------------------------------------------------------
 * LE SCHÉMA S'ADAPTE À LA BASE, PAS L'INVERSE
 * ---------------------------------------------------------------------------
 *
 * Prisma exige que le type de base (`provider`) soit écrit en dur dans le
 * schéma : il n'accepte pas `env(...)` à cet endroit. Conséquence, avant ce
 * script : le dépôt ne pouvait convenir qu'à UN seul environnement.
 *
 *   - schéma en `sqlite`     → la production PostgreSQL refuse de démarrer ;
 *   - schéma en `postgresql` → les tests et le développement local, qui
 *     tournent sur un simple fichier, échouent tous.
 *
 * Demander à l'utilisateur d'éditer le fichier à la main avant chaque
 * déploiement était la solution documentée. C'était une mauvaise solution :
 * elle marche une fois, puis on oublie, et la panne arrive au pire moment.
 *
 * Ce script produit un schéma dérivé dont le `provider` est déduit de
 * `DATABASE_URL`. Le fichier source reste inchangé, et n'a plus jamais besoin
 * d'être modifié pour déployer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racineApi = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/api');
const source = path.join(racineApi, 'prisma', 'schema.prisma');
const derive = path.join(racineApi, 'prisma', 'schema.runtime.prisma');

/** Déduit le type de base depuis l'adresse de connexion. */
export function providerPour(url) {
  const adresse = (url ?? '').trim();
  if (adresse.startsWith('postgres://') || adresse.startsWith('postgresql://')) {
    return 'postgresql';
  }
  if (adresse.startsWith('mysql://')) return 'mysql';
  // `file:./dev.db`, ou rien du tout : on reste sur le fichier local.
  return 'sqlite';
}

function construire() {
  const provider = providerPour(process.env.DATABASE_URL);
  const contenu = fs.readFileSync(source, 'utf8');

  // On ne remplace que le provider du bloc `datasource`, jamais celui du
  // bloc `generator` (qui vaut « prisma-client-js » et ne doit pas bouger).
  const adapte = contenu.replace(
    /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]*"/,
    `$1"${provider}"`,
  );

  if (!adapte.includes(`provider = "${provider}"`)) {
    throw new Error(
      `Impossible d'adapter le schéma Prisma : bloc « datasource db » introuvable dans ${source}.`,
    );
  }

  const entete =
    '// FICHIER GÉNÉRÉ — ne pas modifier.\n' +
    '// Produit par scripts/prisma-schema.mjs à partir de schema.prisma.\n' +
    `// Base déduite de DATABASE_URL : ${provider}.\n\n`;

  // On n'écrit que si le contenu change : évite de réveiller les outils qui
  // surveillent les fichiers à chaque commande.
  const attendu = entete + adapte;
  const actuel = fs.existsSync(derive) ? fs.readFileSync(derive, 'utf8') : null;
  if (actuel !== attendu) fs.writeFileSync(derive, attendu);

  return { provider, derive };
}

const estAppeleDirectement =
  process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (estAppeleDirectement) {
  const { provider } = construire();
  // Silencieux en usage normal : ce script tourne avant chaque commande Prisma.
  if (process.env.PRISMA_SCHEMA_VERBOSE === 'true') {
    console.log(`  schéma Prisma préparé pour « ${provider} »`);
  }
}

export { construire };
