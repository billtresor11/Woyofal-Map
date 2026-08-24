# Connexion avec Google

Aucun mot de passe, aucun formulaire d'inscription : un bouton, et l'utilisateur
retrouve son foyer sur n'importe quel téléphone.

---

## 1. Le choix technique, et pourquoi

**Google Identity Services côté navigateur + vérification du jeton côté serveur.**

Le navigateur obtient un jeton d'identité signé par Google et l'envoie une seule
fois à notre API. L'API **vérifie la signature** contre les clés publiques de
Google, puis ouvre sa propre session dans un cookie `httpOnly`.

Pourquoi pas Firebase Auth ou Supabase Auth, que vous citiez ?

| | Ce que ça apporte | Ce que ça coûte ici |
|---|---|---|
| **Firebase Auth** | Popup, rafraîchissement de jeton, autres méthodes de connexion | +100 ko de SDK sur une application qui en pèse 70, un projet Firebase à gérer, et `firebase-admin` (plusieurs dizaines de Mo) côté serveur pour vérifier les jetons |
| **Supabase Auth** | Idem, avec une base incluse | Nous avons déjà PostgreSQL et Prisma : on paierait pour une brique en double |
| **NextAuth / Auth.js** | Excellent — mais taillé pour Next.js | Notre front est un SPA Vite, notre back un Fastify : ce n'est pas son terrain |
| **Google Identity Services** ✅ | Le strict nécessaire | Un identifiant OAuth à créer, ~40 ko chargés uniquement sur l'écran de connexion, aucune plateforme tierce |

Le jour où vous voudrez ajouter la connexion par **numéro de téléphone** — très
pertinente au Sénégal —, Firebase Auth redeviendra le bon choix : la bascule ne
touchera que `apps/api/src/auth/google.ts` et `apps/web/src/lib/google.ts`.

---

## 2. Créer la clé Google (3 minutes)

1. Ouvrez **https://console.cloud.google.com/** et créez un projet
   (ou choisissez-en un existant).
2. Menu **APIs & Services ▸ Écran de consentement OAuth** :
   - Type d'utilisateur : **Externe**, puis *Créer*.
   - Nom de l'application : `Woyofal Map`, e-mail d'assistance : le vôtre.
   - Enregistrez, puis **Publier l'application** (sinon seuls les comptes de test
     peuvent se connecter).
3. Menu **APIs & Services ▸ Identifiants ▸ Créer des identifiants ▸
   ID client OAuth** :
   - Type d'application : **Application Web**.
   - **Origines JavaScript autorisées** — ajoutez vos adresses, sans barre finale :
     ```
     http://localhost:4000
     http://localhost:5173
     https://votre-domaine.sn
     ```
   - **URI de redirection autorisés** : *laissez vide*. Notre méthode n'en utilise pas.
4. Copiez l'**ID client** (il finit par `.apps.googleusercontent.com`).

> Le *secret client* affiché par Google ne nous sert pas : nous ne faisons que
> vérifier des jetons, jamais d'échange serveur à serveur.

---

## 3. Les variables d'environnement

Dans `apps/api/.env` (ou dans la console de votre hébergeur) :

```bash
GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
SESSION_SECRET="<32 caractères aléatoires ou plus>"
```

Générez le secret avec :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Rien à configurer côté front** : l'application demande l'identifiant client à
l'API (`GET /api/auth/config`). Une variable au lieu de deux, et aucun risque de
les voir diverger.

### Le comportement suit la configuration

| `GOOGLE_CLIENT_ID` | Ce qui se passe |
|---|---|
| vide | L'application fonctionne **sans compte**. C'est le mode développement et démonstration. |
| renseigné | La connexion devient **obligatoire**, et chaque foyer n'est visible que par son propriétaire. |

`SESSION_SECRET` est obligatoire en production : le serveur refuse de démarrer
sans lui, plutôt que de signer les sessions avec une valeur devinable.

---

## 4. Comment c'est construit

```
Navigateur                          API Fastify                    Google
    │                                    │                            │
    │  1. bouton « Continuer avec        │                            │
    │     Google » (script officiel) ────┼───────────────────────────►│
    │  ◄─────────────── jeton d'identité signé ────────────────────── │
    │                                    │                            │
    │  2. POST /api/auth/google ────────►│                            │
    │                                    │ 3. vérifie la signature ──►│
    │                                    │ ◄──── clés publiques ───── │
    │                                    │                            │
    │  ◄─ 4. cookie de session httpOnly ─│                            │
    │        (30 jours, signé)           │                            │
```

**Fichiers concernés :**

| Rôle | Fichier |
|---|---|
| Vérification du jeton Google | `apps/api/src/auth/google.ts` |
| Session et cookie | `apps/api/src/auth/session.ts` |
| Routes `/api/auth/*` | `apps/api/src/routes/auth.routes.ts` |
| État de session dans l'app | `apps/web/src/hooks/useAuth.tsx` |
| Écran de connexion | `apps/web/src/screens/LoginScreen.tsx` |
| Bouton officiel Google | `apps/web/src/lib/google.ts` |

### Ce qui protège les données

- Le cookie est **`httpOnly`** : aucun script de la page ne peut le lire.
- Il est **`secure`** en production (HTTPS obligatoire) et **`sameSite=lax`**.
- L'identité est retenue par l'**identifiant Google** (le `sub`), pas par
  l'e-mail : une adresse peut changer de propriétaire, pas ce numéro.
- Un foyer qui ne vous appartient pas répond **404**, jamais 403 : on ne confirme
  même pas son existence, ce qui interdit de deviner les comptes des autres.
- Le jeton Google n'est **jamais stocké** : il sert une fois, à la connexion.

Sept tests d'intégration couvrent ces règles (`apps/api/src/auth/auth.test.ts`) :
jeton falsifié refusé, compte retrouvé après changement d'adresse, session
retrouvée au redémarrage, déconnexion effective, foyer d'autrui invisible en
lecture comme en écriture.

---

## 5. Le parcours vu par l'utilisateur

```
Ouverture de l'application
        │
        ├─ session valide ? ──── oui ──► foyer déjà créé ? ── oui ──► Tableau de bord
        │                                      └─ non ──► Tunnel d'accueil
        └─ non ──► Écran de connexion ──► (Google) ──► Tunnel d'accueil
```

Une fois connecté, plus rien n'est demandé : la session dure **30 jours** et se
prolonge à chaque visite. La déconnexion se trouve dans ⚙️ *Réglages ▸ Mon compte*.
