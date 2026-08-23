# Mise en ligne

L'application se déploie comme **un seul service** : le serveur Fastify sert l'API *et*
l'application web compilée. Un conteneur, une base de données, c'est tout.

---

## Option 1 — Docker (recommandé)

```bash
docker build -t woyofal-map .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:motdepasse@hote:5432/woyofal" \
  woyofal-map
```

L'application est disponible sur le port 4000. Le `Dockerfile` construit en plusieurs
étapes et n'embarque que le nécessaire.

Au premier démarrage sur une base vierge, chargez le catalogue et les tarifs :

```bash
docker run --rm -e DATABASE_URL="…" woyofal-map npm run -w @woyofal/api db:seed
```

## Option 2 — Hébergement géré (Railway, Render, Fly.io, Scaleway…)

| Réglage | Valeur |
|---|---|
| Commande d'installation | `npm ci` |
| Commande de build | `npm run build` |
| Commande de démarrage | `npm start` |
| Port | `4000` (ou la variable `PORT` fournie par l'hébergeur) |

Ajoutez une base PostgreSQL gérée et renseignez `DATABASE_URL`. La plupart de ces
plateformes proposent un plan gratuit ou à quelques euros par mois, largement suffisant
pour démarrer.

## Option 3 — Front et API séparés

Si vous préférez mettre l'application sur un CDN (Vercel, Netlify, Cloudflare Pages) :

1. Construisez le front avec `VITE_API_URL=https://api.mondomaine.sn` ;
2. Publiez `apps/web/dist` ;
3. Déployez l'API à part et renseignez `WEB_ORIGIN` avec l'adresse du front (CORS).

---

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | Connexion à la base | `file:./dev.db` |
| `PORT` | Port d'écoute | `4000` |
| `HOST` | Interface d'écoute | `0.0.0.0` |
| `WEB_ORIGIN` | Origines autorisées (CORS), séparées par des virgules | toutes |
| `NODE_ENV` | `production` désactive les logs colorés | — |
| `VITE_API_URL` | Adresse de l'API, à la compilation du front | même origine |

---

## Installation sur le téléphone

L'application est une PWA : dans Chrome ou Safari, *Menu ➜ Ajouter à l'écran d'accueil*.
Elle s'ouvre alors en plein écran, sans barre d'adresse, comme une application native —
et se met à jour toute seule au rechargement, sans passer par un magasin d'applications.

---

## Avant la première vraie mise en ligne

- [ ] Passer sur PostgreSQL (voir `BASE-DE-DONNEES.md`).
- [ ] Basculer sur les migrations Prisma versionnées.
- [ ] Vérifier les prix du kWh sur un reçu Woyofal récent et les corriger dans l'app.
- [ ] Restreindre `WEB_ORIGIN` au domaine réel.
- [ ] Mettre en place une sauvegarde quotidienne de la base.
- [ ] Ajouter l'authentification si les foyers doivent être privés entre appareils
      (aujourd'hui, l'identifiant de foyer tient lieu de clé d'accès — suffisant pour un
      prototype et un usage familial, insuffisant pour un service public ouvert).
