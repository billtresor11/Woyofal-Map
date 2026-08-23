/**
 * Construit la version de DÉMONSTRATION : un fichier HTML unique, autonome,
 * qui contient toute l'application (calculs compris) et fonctionne sans
 * serveur, sans base de données et sans installation.
 *
 * Usage : npm run build:demo
 * Résultat : demo/woyofal-map-demo.html — à ouvrir dans n'importe quel navigateur.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'apps/web');
const outDir = path.join(web, 'dist-demo');
const target = path.join(root, 'demo/woyofal-map-demo.html');
// Variante « fragment » : même application, sans les balises de document,
// pour les hébergeurs qui fournissent eux-mêmes <html> et <head>.
const fragment = path.join(root, 'demo/woyofal-map-fragment.html');

console.log('1/3  Compilation du moteur de calcul...');
execFileSync('npm', ['run', '-w', '@woyofal/core', 'build'], { cwd: root, stdio: 'inherit' });

console.log('2/3  Compilation de l’application en mode autonome...');
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-demo'], {
  cwd: web,
  stdio: 'inherit',
  env: { ...process.env, VITE_STANDALONE: '1' },
});

console.log('3/3  Assemblage en un fichier unique...');
let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');

// On remplace chaque référence de fichier par son contenu.
const inline = (pattern, wrap) => {
  html = html.replace(pattern, (_match, href) => {
    const file = path.join(outDir, href.replace(/^\//, ''));
    const content = fs.readFileSync(file, 'utf8');
    return wrap(content);
  });
};

inline(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (js) =>
  // `</script>` à l'intérieur d'une chaîne fermerait la balise par erreur.
  `<script type="module">${js.replace(/<\/script>/gi, '<\\/script>')}</script>`,
);
inline(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (css) => `<style>${css}</style>`);

// Bandeau discret : il faut que l'on sache qu'on est dans une démonstration.
html = html.replace(
  '</head>',
  `  <meta name="woyofal-mode" content="demonstration" />
</head>`,
);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html, 'utf8');
fs.rmSync(outDir, { recursive: true, force: true });

// Variante fragment : titre + styles + contenu, sans balises de document.
// La police passe par @import : un <link> ne survivrait pas hors du <head>.
const FONT = "@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');";
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .join('\n');
const rootDiv = /<div id="root"><\/div>/.test(html) ? '<div id="root"></div>' : '';

fs.writeFileSync(
  fragment,
  [
    '<title>Woyofal Map</title>',
    `<style>${FONT}\n${styles}</style>`,
    rootDiv,
    `<script type="module">${scripts}</script>`,
    '',
  ].join('\n'),
  'utf8',
);

const ko = (fs.statSync(target).size / 1024).toFixed(0);
console.log('');
console.log(`  ✅  Fichier de démonstration prêt : demo/woyofal-map-demo.html (${ko} Ko)`);
console.log('      Ouvrez-le dans un navigateur : aucune installation nécessaire.');
console.log('');
