/**
 * ---------------------------------------------------------------------------
 * SERVICE WORKER
 * ---------------------------------------------------------------------------
 * Stratégie « le réseau d'abord ». La version en ligne gagne toujours ; le cache
 * ne sert que de filet quand le réseau manque. C'est le choix prudent : jamais
 * de vieille version servie à quelqu'un qui a du réseau.
 *
 * Les appels à l'API ne sont jamais mis en cache : une facture périmée serait
 * pire que pas de facture du tout.
 */

const CACHE = 'woyofal-coquille-v1';

/**
 * Fichiers de la coquille, injectés à la compilation (leurs noms contiennent
 * une empreinte qui change à chaque version). Les mettre en cache dès
 * l'installation rend l'application utilisable hors ligne dès la PREMIÈRE
 * visite, sans attendre un second passage.
 */
const PRECACHE = ['/'];

self.addEventListener('install', (event) => {
  // La nouvelle version prend la main sans attendre la fermeture des onglets.
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Un fichier manquant ne doit pas faire échouer toute l'installation.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  const url = new URL(requete.url);

  if (requete.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      try {
        const reponse = await fetch(requete);
        if (reponse.ok) {
          const cache = await caches.open(CACHE);
          cache.put(requete, reponse.clone());
        }
        return reponse;
      } catch {
        // « ignoreVary » est indispensable : le serveur renvoie « Vary: Origin »,
        // or la copie mise en cache a l'installation n'a pas d'en-tete Origin.
        // Sans cette option, aucun fichier ne serait jamais retrouve hors ligne.
        const enCache = await caches.match(requete, { ignoreVary: true });
        if (enCache) return enCache;
        // Navigation hors ligne : on renvoie la coquille de l'application.
        if (requete.mode === 'navigate') {
          const accueil = await caches.match('/', { ignoreVary: true });
          if (accueil) return accueil;
        }
        throw new Error('hors ligne');
      }
    })(),
  );
});
