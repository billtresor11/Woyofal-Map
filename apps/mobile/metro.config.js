// Metro doit voir tout le dépôt : le moteur métier vit dans packages/core, en
// dehors de ce dossier. Sans ces deux réglages, `@woyofal/core` reste introuvable
// et l'application mobile n'a plus de calculs.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Un seul exemplaire de React dans l'arbre : deux copies cassent les hooks.
config.resolver.disableHierarchicalLookup = true;

/**
 * `@woyofal/core` est consommé COMPILÉ (packages/core/dist), pas en sources.
 *
 * Ses fichiers s'importent entre eux avec des extensions `.js` explicites, ce
 * qu'exige Node en ESM — mais Metro ne réécrit pas ces extensions vers `.ts`.
 * Pointer vers `dist` règle le problème sans toucher au moteur : les `.js` y
 * existent pour de bon.
 *
 * Conséquence pratique : lancer `npm run -w @woyofal/core build` avant
 * `expo start`, exactement comme pour l'API.
 */
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
