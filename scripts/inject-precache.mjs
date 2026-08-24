/**
 * Après la compilation, inscrit la liste réelle des fichiers de l'application
 * dans le service worker. Leurs noms portent une empreinte qui change à chaque
 * version : ils ne peuvent donc pas être écrits à la main.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../apps/web/dist',
);
const swPath = path.join(dist, 'service-worker.js');
if (!fs.existsSync(swPath)) process.exit(0);

/** Fichiers à garder hors ligne : la page, ses scripts, ses styles, ses icônes. */
const fichiers = ['/'];
for (const entree of fs.readdirSync(path.join(dist, 'assets'))) {
  fichiers.push(`/assets/${entree}`);
}
for (const entree of fs.readdirSync(dist)) {
  if (entree.endsWith('.png') || entree === 'manifest.webmanifest') fichiers.push(`/${entree}`);
}

const source = fs.readFileSync(swPath, 'utf8');
const remplace = source.replace(
  /const PRECACHE = \[[^\]]*\];/,
  `const PRECACHE = ${JSON.stringify(fichiers, null, 2)};`,
);
fs.writeFileSync(swPath, remplace, 'utf8');
console.log(`  service worker : ${fichiers.length} fichiers gardés hors ligne`);
