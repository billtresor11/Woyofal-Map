# 🚀 Mettre Woyofal Map en ligne

**Ce guide est écrit pour quelqu'un qui n'est pas développeur.** Chaque commande est à
recopier telle quelle. Si une étape échoue, la section [Quand ça ne marche
pas](#quand-ça-ne-marche-pas) en bas explique quoi faire.

Vous n'avez **rien à payer** pour suivre ce guide de bout en bout.

---

## Ce que vous allez obtenir

| Étape | Résultat | Temps |
|---|---|---|
| **A** | L'application tourne sur votre ordinateur | 10 min |
| **B** | Une adresse internet publique, que tout le monde peut ouvrir | 20 min |
| **C** | L'application native testée sur votre téléphone, puis un fichier `.apk` à envoyer par WhatsApp | 40 min |

Faites-les dans l'ordre. Vous pouvez vous arrêter après n'importe laquelle.

---

# A. Faire tourner l'application sur votre ordinateur

## A1. Installer Node.js

Node.js est le moteur qui fait tourner l'application. Il s'installe une fois.

1. Allez sur **https://nodejs.org**
2. Cliquez sur le gros bouton de gauche (**LTS**)
3. Ouvrez le fichier téléchargé et cliquez « Suivant » jusqu'au bout

**Pour vérifier :** ouvrez une fenêtre de commandes —

- **Windows :** touche `Windows`, tapez `cmd`, appuyez sur `Entrée`
- **Mac :** touche `Cmd + Espace`, tapez `Terminal`, appuyez sur `Entrée`

Recopiez :

```bash
node --version
```

Vous devez voir quelque chose comme `v20.11.0`. Si le nombre après le `v` est **20 ou
plus**, c'est bon.

## A2. Récupérer le projet

Toujours dans la même fenêtre :

```bash
git clone https://github.com/billtresor11/Woyofal-Map.git
cd Woyofal-Map
```

> Si `git` n'existe pas sur votre machine, téléchargez plutôt le projet en `.zip` depuis
> GitHub (bouton vert **Code ▸ Download ZIP**), décompressez-le, puis dans la fenêtre de
> commandes tapez `cd ` (avec un espace) et **glissez le dossier décompressé** dessus
> avant d'appuyer sur `Entrée`.

## A3. Lancer

Une seule commande. Elle installe tout, prépare la base de données, compile et démarre :

```bash
npm run demarrer
```

La première fois, comptez **3 à 5 minutes**. Beaucoup de texte va défiler : c'est normal.
Quand c'est prêt, vous verrez :

```
  ✅  Woyofal Map est démarrée.

  👉  Ouvrez cette adresse dans votre navigateur :  http://localhost:4000
```

Ouvrez **http://localhost:4000**. C'est fait. 🎉

**Pour arrêter :** revenez dans la fenêtre noire et appuyez sur `Ctrl + C`.
**Pour relancer plus tard :** `cd Woyofal-Map` puis `npm start`.

## A4. L'ouvrir depuis votre téléphone, sur le même Wi-Fi

Votre téléphone et votre ordinateur doivent être sur **le même réseau Wi-Fi**.

1. Trouvez l'adresse de votre ordinateur :
   - **Windows :** tapez `ipconfig` et cherchez la ligne *Adresse IPv4* (ex. `192.168.1.14`)
   - **Mac :** tapez `ipconfig getifaddr en0`
2. Sur le téléphone, ouvrez `http://192.168.1.14:4000` (avec **votre** adresse)
3. Menu du navigateur ▸ **« Ajouter à l'écran d'accueil »**

L'application s'installe avec son icône 💡 et s'ouvre en plein écran, sans barre d'adresse.

---

# B. Mettre en ligne pour de bon (gratuit)

Jusqu'ici, l'application ne tourne que chez vous. Pour qu'elle soit accessible depuis
n'importe où, il faut un hébergeur.

## B1. Quelle plateforme choisir

**Je recommande Railway.** L'application a besoin d'un serveur **et** d'une base de
données PostgreSQL : Railway fournit les deux, les branche ensemble automatiquement, et
lit le `Dockerfile` déjà présent dans le projet — vous n'avez rien à configurer.

| Plateforme | Verdict |
|---|---|
| **Railway** ⭐ | Base de données incluse et branchée toute seule. ~5 $ de crédit offert par mois, largement suffisant pour démarrer. **Le plus simple.** |
| Render | Gratuit possible, mais le serveur s'endort après 15 min d'inactivité : le premier visiteur attend ~50 secondes. La base gratuite expire au bout de 90 jours. |
| Fly.io | Excellent et proche de l'Afrique (Johannesburg), mais demande de comprendre la ligne de commande. |
| Vercel / Netlify | **À éviter ici.** Ils hébergent des sites, pas des serveurs avec base de données. Il faudrait découper le projet en deux. |

## B2. Déployer sur Railway, pas à pas

1. **Poussez votre code sur GitHub** (si ce n'est pas déjà fait).

2. Allez sur **https://railway.app** et créez un compte avec **« Login with GitHub »**.

3. Cliquez **New Project ▸ Deploy from GitHub repo**, puis choisissez `Woyofal-Map`.
   Railway trouve le `Dockerfile` tout seul et commence à construire.

4. **Ajoutez la base de données.** Dans le projet, cliquez **New ▸ Database ▸ Add
   PostgreSQL**. Railway crée la base et fabrique automatiquement la variable
   `DATABASE_URL`.

5. **Reliez la base au serveur.** Cliquez sur votre service (pas la base) ▸ onglet
   **Variables** ▸ **New Variable ▸ Add Reference** ▸ choisissez `DATABASE_URL` de
   PostgreSQL.

6. **Ajoutez les autres variables**, dans le même onglet :

   | Nom | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SESSION_SECRET` | une longue suite de caractères au hasard (voir ci-dessous) |

   Pour fabriquer le `SESSION_SECRET`, dans votre fenêtre de commandes :

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Copiez le résultat. **Ne le partagez jamais** : il protège les sessions de vos
   utilisateurs.

7. **Rien à changer dans le code.** Le type de base est déduit automatiquement de
   `DATABASE_URL` : PostgreSQL en ligne, simple fichier sur votre ordinateur. C'est le
   rôle de `scripts/prisma-schema.mjs`, qui tourne avant chaque commande Prisma. Les
   tables sont créées au premier démarrage.

8. **Obtenez votre adresse.** Onglet **Settings ▸ Networking ▸ Generate Domain**. Vous
   obtenez quelque chose comme `woyofal-map-production.up.railway.app`.

C'est en ligne. Partagez l'adresse : elle s'ouvre sur n'importe quel téléphone.

## B3. Toutes les variables d'environnement

| Variable | À quoi ça sert | Obligatoire ? |
|---|---|---|
| `DATABASE_URL` | Adresse de la base de données | **Oui** |
| `SESSION_SECRET` | Signe les sessions (32 caractères minimum) | **Oui en production** |
| `NODE_ENV` | `production` : cookies sécurisés, journaux compacts | **Oui en production** |
| `GOOGLE_CLIENT_ID` | Connexion Google | **Oui en production** — sans lui le serveur refuse de démarrer |
| `ALLOW_ANONYMOUS` | Démonstration publique sans connexion | Non — à n'utiliser qu'en connaissance de cause |
| `PORT` | Port d'écoute | Non (4000, ou celui de l'hébergeur) |
| `HOST` | Interface d'écoute | Non (`0.0.0.0`) |
| `WEB_ORIGIN` | Origines autorisées si le web est sur un autre domaine | Non |

## B4. Activer la connexion Google — **obligatoire en production**

Depuis la mise en place du verrou, **personne ne voit l'application sans être
connecté** : ni les onglets, ni le tunnel d'accueil. Il faut donc une clé Google, sans
quoi le serveur refuse de démarrer avec ce message :

```
GOOGLE_CLIENT_ID est obligatoire en production : sans lui, tous les foyers
seraient accessibles sans connexion.
```

C'est volontaire : une panne visible au déploiement vaut mieux qu'une application
silencieusement ouverte à tous.

### Créer la clé (5 minutes, gratuit)

1. Allez sur **https://console.cloud.google.com/apis/credentials**
2. **Créer des identifiants ▸ ID client OAuth ▸ Application Web**
3. Dans **Origines JavaScript autorisées**, ajoutez votre adresse de production :
   `https://woyofal-map-production.up.railway.app` (et `http://localhost:4000` pour
   travailler chez vous)
4. Copiez l'**ID client** — il ressemble à `1234-abcd.apps.googleusercontent.com`
5. Sur Railway : onglet **Variables ▸ New Variable**, nom `GOOGLE_CLIENT_ID`, collez la valeur

> ⚠️ **Publiez l'écran de consentement OAuth** (menu *Écran de consentement OAuth* ▸
> *Publier l'application*). Tant qu'il est en mode « Test », seuls les comptes que vous
> avez listés à la main peuvent se connecter — les autres voient « accès bloqué ».

Le **secret client** n'est pas nécessaire : l'application utilise le jeton d'identité
côté navigateur, que le serveur vérifie contre les clés publiques de Google.

### Et sur Vercel ?

Vercel héberge des sites, pas des serveurs avec base de données : **il ne convient pas
pour ce projet** tel qu'il est (voir [B1](#b1-quelle-plateforme-choisir)). Si vous
tenez à y mettre uniquement l'interface web, il faudra alors renseigner
`VITE_API_URL` (l'adresse publique de votre API) au moment de la compilation, et
ajouter le domaine Vercel aux origines autorisées côté Google **et** dans
`WEB_ORIGIN` côté serveur.

### Sur mobile

L'application native n'utilise pas la même clé : voir
[C5](#c5-activer-la-connexion-google-sur-mobile-facultatif).

## B5. Sur n'importe quel autre hébergeur

Le projet contient un `Dockerfile` complet. Toute plateforme qui accepte Docker
(Render, Fly.io, Scaleway, un serveur privé…) fonctionne :

```bash
docker build -t woyofal-map .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="votre-secret" \
  -e NODE_ENV=production \
  woyofal-map
```

---

# C. Tester l'application mobile sur un vrai téléphone

C'est l'application **native**, celle qui s'installera un jour sur les magasins. Pour la
tester, pas besoin de la publier : Expo Go permet de l'ouvrir directement.

## C1. Installer Expo Go sur le téléphone

- **Android :** Play Store ▸ cherchez **« Expo Go »** ▸ Installer
- **iPhone :** App Store ▸ cherchez **« Expo Go »** ▸ Obtenir

## C2. Dire à l'application où trouver le serveur

Sur un téléphone, `localhost` désigne le téléphone lui-même — pas votre ordinateur. Il
faut donc donner l'adresse réseau de votre machine.

1. Trouvez-la (voir [A4](#a4-louvrir-depuis-votre-téléphone-sur-le-même-wi-fi))
2. Ouvrez le fichier **`apps/mobile/app.json`**
3. Trouvez la ligne `"apiUrl": "http://localhost:4000"` et remplacez-la par **votre**
   adresse :

   ```json
   "apiUrl": "http://192.168.1.14:4000"
   ```

4. Enregistrez.

> Si votre serveur est déjà en ligne (étape B), mettez plutôt son adresse publique :
> `"apiUrl": "https://woyofal-map-production.up.railway.app"`. Vous n'aurez alors plus
> besoin du Wi-Fi partagé.

## C3. Lancer

Deux fenêtres de commandes, ouvertes en même temps, toutes deux dans le dossier du projet.

**Fenêtre 1 — le serveur** (inutile si vous utilisez l'adresse en ligne) :

```bash
npm run -w @woyofal/api dev
```

**Fenêtre 2 — l'application mobile :**

```bash
npm run mobile
```

Un **QR code** apparaît.

- **Android :** ouvrez Expo Go ▸ **Scan QR code**
- **iPhone :** ouvrez l'appareil photo, visez le QR code, touchez la notification

L'application se charge sur votre téléphone. Elle se recharge toute seule à chaque
modification du code.

## C4. Compiler un vrai fichier d'installation

Expo Go sert à tester. Pour obtenir un fichier **`.apk`** que vous envoyez par WhatsApp et
que n'importe qui installe sans compte Expo :

```bash
npm install -g eas-cli
eas login
```

Créez un compte gratuit sur **https://expo.dev** si vous n'en avez pas, puis :

```bash
cd apps/mobile
eas build --platform android --profile preview
```

La compilation se fait **sur les serveurs d'Expo** (comptez 10 à 20 minutes). À la fin,
vous recevez un lien de téléchargement du `.apk`.

> **Pour installer un `.apk` sur Android :** ouvrez le fichier, Android demandera
> d'autoriser « l'installation depuis des sources inconnues » — c'est normal pour une
> application qui ne vient pas du Play Store.

**Pour iPhone**, une application ne peut pas s'installer hors de l'App Store. Il faut un
**compte Apple Developer (99 $ par an)** :

```bash
eas build --platform ios
```

**Pour publier sur les magasins :**

```bash
eas build --platform android --profile production   # produit un .aab pour le Play Store
eas submit --platform android
```

Comptez aussi 25 $ une fois pour le compte Google Play.

## C5. Activer la connexion Google sur mobile

L'application native n'utilise pas le même identifiant que le web. Dans la console Google
Cloud, créez **trois** identifiants OAuth, puis reportez-les dans `apps/mobile/app.json` :

| Champ de `app.json` | Type d'identifiant |
|---|---|
| `extra.googleClientIdIos` | Application iOS (bundle `sn.woyofalmap.app`) |
| `extra.googleClientIdAndroid` | Application Android (package `sn.woyofalmap.app`) |
| `extra.googleClientIdWeb` | Application Web (utilisé par Expo Go) |

Tant qu'ils sont vides, l'écran de connexion l'indique clairement au lieu de proposer un
bouton qui ne marcherait pas.

---

# Quand ça ne marche pas

| Message affiché | Ce qui se passe | Solution |
|---|---|---|
| `node : commande introuvable` | Node.js n'est pas installé, ou la fenêtre était déjà ouverte avant | Réinstallez, **fermez et rouvrez** la fenêtre de commandes |
| `EADDRINUSE` ou `port 4000 déjà utilisé` | L'application tourne déjà ailleurs | Fermez l'autre fenêtre, ou changez le port : `PORT=4001 npm start` |
| Page blanche sur `localhost:4000` | Le serveur n'a pas fini de démarrer | Attendez 10 secondes et rechargez |
| `Cannot find module '@woyofal/core'` | Le moteur n'a pas été compilé | `npm run build:core` |
| L'app mobile affiche « Pas de connexion » | `apiUrl` pointe vers `localhost` | Mettez l'adresse réseau de votre ordinateur ([C2](#c2-dire-à-lapplication-où-trouver-le-serveur)) |
| Le QR code ne fait rien | Téléphone et ordinateur sur des réseaux différents | Mettez-les sur le **même Wi-Fi** |
| Sur Railway : `SESSION_SECRET est obligatoire` | La variable manque | Ajoutez-la (voir [B2 étape 6](#b2-déployer-sur-railway-pas-à-pas)) |
| Sur Railway : erreur de base de données | `DATABASE_URL` n'est pas reliée à PostgreSQL | Refaites l'étape 5 (Add Reference) |
| `the URL must start with the protocol file:` | Le conteneur date d'avant le correctif du client Prisma | Redéployez : le client est désormais régénéré au démarrage |
| `Application failed to respond` | Le serveur s'est arrêté au démarrage | Ouvrez **Deployments ▸ View Logs** : la vraie cause y est écrite en clair |
| Sur Railway : `GOOGLE_CLIENT_ID est obligatoire` | La clé Google manque | Créez-la et ajoutez la variable ([B4](#b4-activer-la-connexion-google--obligatoire-en-production)) |

---

# Avant la vraie mise en ligne : la liste de contrôle

- [ ] `DATABASE_URL` pointe bien vers PostgreSQL (le schéma s'y adapte tout seul)
- [ ] `GOOGLE_CLIENT_ID` renseigné — sans lui le serveur refuse de démarrer
- [ ] `SESSION_SECRET` généré au hasard, différent de celui de développement
- [ ] `NODE_ENV=production`
- [ ] Les prix du kWh vérifiés sur un reçu Woyofal récent (⚙️ *Réglages ▸ Le prix du kWh*)
- [ ] Une sauvegarde quotidienne de la base activée chez l'hébergeur
- [ ] Si vous activez Google : écran de consentement OAuth **publié**, sinon les
      utilisateurs verront « accès bloqué »
- [ ] `apiUrl` de l'application mobile pointant vers l'adresse **publique**, pas `localhost`
