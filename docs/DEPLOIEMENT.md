# Mise en ligne

L'application se déploie comme **un seul service** : le serveur Fastify sert
l'API *et* l'application web compilée. Un conteneur, une base de données, c'est
tout — et un seul domaine, donc aucun souci de cookies inter-domaines.

---

## La plateforme que je recommande : Railway

Pour ce projet, **Railway** (railway.app) est le meilleur compromis :

| | Railway ✅ | Render | Vercel / Netlify |
|---|---|---|---|
| Application + API en un service | oui | oui | non (front seul, l'API doit passer en *serverless*) |
| PostgreSQL géré, en un clic | oui | oui | non (base externe à trouver) |
| Déploiement à chaque `git push` | oui | oui | oui |
| Repose en veille ? | non | oui sur le plan gratuit (~50 s de réveil) | — |
| Coût pour démarrer | ~5 $/mois d'usage offert | gratuit avec mise en veille | gratuit mais architecture à revoir |

**Pourquoi pas Vercel ou Netlify ?** Ils sont excellents pour un front statique,
mais notre serveur Fastify garde une connexion à PostgreSQL — un modèle mal
adapté aux fonctions *serverless* (chaque appel rouvre une connexion). Il
faudrait scinder le projet en deux déploiements et gérer les cookies entre deux
domaines. Beaucoup de complexité pour zéro gain à ce stade.

**Render** est le bon choix si vous voulez rester à 0 € : la seule contrainte est
la mise en veille après 15 minutes d'inactivité.

---

## Déployer sur Railway, pas à pas

1. Poussez le projet sur GitHub (c'est déjà fait).
2. Sur **railway.app** : *New Project ▸ Deploy from GitHub repo*, choisissez
   `Woyofal-Map`.
3. *New ▸ Database ▸ **PostgreSQL***. Railway crée la variable `DATABASE_URL`
   et la partage automatiquement avec le service.
4. Dans l'onglet **Variables** du service, ajoutez :

   ```bash
   NODE_ENV=production
   GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
   SESSION_SECRET=<le secret généré>
   ```

5. Dans **Settings ▸ Deploy**, vérifiez :
   - Build : `npm ci && npm run build`
   - Start : `npm start`
6. **Settings ▸ Networking ▸ Generate Domain** : Railway vous donne une adresse
   `xxx.up.railway.app`.
7. Retournez dans la **Google Cloud Console** et ajoutez cette adresse aux
   *Origines JavaScript autorisées* (voir `AUTHENTIFICATION.md`).
8. Première mise en ligne : ouvrez le terminal du service et lancez

   ```bash
   npx prisma db push --schema apps/api/prisma/schema.prisma
   npm run -w @woyofal/api db:seed
   ```

   (le `seed` charge le catalogue d'appareils et les grilles tarifaires).

À partir de là, **chaque `git push` redéploie automatiquement**.

### Avant de passer sur PostgreSQL

Dans `apps/api/prisma/schema.prisma`, remplacez :

```prisma
datasource db {
  provider = "postgresql"   // au lieu de "sqlite"
  url      = env("DATABASE_URL")
}
```

Aucun changement dans le code applicatif.

---

## Option Docker (n'importe quel hébergeur)

```bash
docker build -t woyofal-map .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:motdepasse@hote:5432/woyofal" \
  -e GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com" \
  -e SESSION_SECRET="<secret>" \
  -e NODE_ENV=production \
  woyofal-map
```

---

## Toutes les variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connexion à la base | oui |
| `SESSION_SECRET` | Signature des cookies de session (32 caractères minimum) | **oui en production** |
| `GOOGLE_CLIENT_ID` | Active la connexion Google | non — sans lui, l'app tourne sans compte |
| `NODE_ENV` | `production` : cookies `secure`, logs compacts | oui en production |
| `PORT` | Port d'écoute | non (4000, ou celui de l'hébergeur) |
| `HOST` | Interface d'écoute | non (`0.0.0.0`) |
| `WEB_ORIGIN` | Origines autorisées, si le front est sur un autre domaine | non |

---

## Installation sur le téléphone

Il n'y a pas d'application à publier sur les magasins : c'est la même application
web qui s'installe. Dans Chrome ou Safari, *Menu ▸ Ajouter à l'écran d'accueil*.
Elle s'ouvre alors en plein écran, sans barre d'adresse, avec son icône, et se met
à jour toute seule au rechargement.

Sans réseau, l'application s'ouvre quand même (sa coquille est gardée sur le
téléphone) ; les données du foyer, elles, ont besoin de la connexion.

---

## Avant la première vraie mise en ligne

- [ ] Passer sur PostgreSQL (voir ci-dessus et `BASE-DE-DONNEES.md`).
- [ ] Générer un `SESSION_SECRET` unique et le garder secret.
- [ ] Créer l'ID client Google et y déclarer le domaine de production.
- [ ] Publier l'écran de consentement OAuth (sinon : « accès bloqué »).
- [ ] Basculer sur les migrations Prisma versionnées (`prisma migrate deploy`).
- [ ] Vérifier les prix du kWh sur un reçu Woyofal récent.
- [ ] Mettre en place une sauvegarde quotidienne de la base.
