# Architecture

Ce document explique **ce qui a été choisi et pourquoi**. Il est écrit pour être lu par
quelqu'un qui ne code pas, avec assez de détails pour qu'un développeur puisse reprendre
le projet sans poser de question.

---

## 1. La stack retenue

| Couche | Choix | Pourquoi celui-là |
|---|---|---|
| Application | **React 18 + TypeScript + Vite + Tailwind CSS** | Une seule base de code pour le web ET le mobile (l'app s'installe sur l'écran d'accueil du téléphone). Vite donne un démarrage instantané ; Tailwind permet une interface soignée sans feuilles de style à maintenir. Poids final : **~60 ko compressés**, ce qui compte quand on est en 3G. |
| Serveur | **Node.js + Fastify + TypeScript** | Même langage que l'application : un seul développeur peut tout tenir. Fastify est le serveur Node le plus rapide et le plus sobre en mémoire — important pour héberger à bas coût. |
| Base de données | **Prisma + SQLite (dev) / PostgreSQL (prod)** | Prisma donne un schéma lisible qui sert aussi de documentation. SQLite = zéro installation pour démarrer ; une ligne à changer pour passer à PostgreSQL en production. |
| Moteur métier | **Paquet TypeScript pur `@woyofal/core`** | Aucune dépendance, testable, réutilisable. C'est là que vit toute l'intelligence du produit. |
| Tests | **Vitest** | 32 tests couvrent les tranches, la déduction de consommation et la répartition. |

**Monorepo npm workspaces** : un seul `npm install`, un seul `npm run dev`, trois paquets.

### Ce qui a été volontairement écarté

- **Une application native (Flutter, React Native)** : deux fois le travail, deux magasins
  d'applications, et une mise à jour qui prend des jours. Une application web installable
  se met à jour instantanément et se partage par un simple lien — décisif pour une
  diffusion par WhatsApp.
- **Un gros ORM ou un framework lourd (NestJS)** : le domaine est petit et clair. La
  complexité aurait été du décor.
- **Une bibliothèque de graphiques** : les visualisations utiles ici (jauge de tranches,
  barres de répartition) tiennent en quelques divs. 200 ko économisés.

---

## 2. Le principe structurant : un moteur, deux consommateurs

```
                    ┌──────────────────────────┐
                    │     @woyofal/core        │
                    │  catalogue · kWh · FCFA  │
                    │  tranches · répartition  │
                    └───────────┬──────────────┘
                                │ (même code, importé des deux côtés)
                ┌───────────────┴───────────────┐
                ▼                               ▼
      ┌───────────────────┐          ┌────────────────────┐
      │   @woyofal/web    │  HTTP    │   @woyofal/api     │
      │  React (mobile)   │ ───────► │  Fastify + Prisma  │
      └───────────────────┘   JSON   └─────────┬──────────┘
                                               ▼
                                     ┌────────────────────┐
                                     │  SQLite / Postgres │
                                     └────────────────────┘
```

Conséquences concrètes :

- **Aucune divergence de calcul.** Le prix affiché pendant qu'on configure un appareil et
  le prix enregistré en base sortent de la même fonction.
- **Le serveur ne fait jamais confiance au client.** L'application envoie des *choix*
  (« taille : moyen », « toute la nuit »), jamais des kWh. Le serveur rejoue le calcul.
- **On peut changer d'interface** (un bot WhatsApp, un SMS, un tableau de bord Senelec)
  sans réécrire une ligne de logique métier.

---

## 3. Les trois idées produit qui gouvernent le code

### a. Jamais de watts

Le catalogue (`core/src/catalog.ts`) associe à chaque appareil des **questions humaines**
et non des champs numériques :

```ts
{
  key: 'taille',
  question: 'Il est de quelle taille ?',
  options: [
    { id: 'moyen', label: 'Moyen', hint: 'Environ 200 à 250 litres', watts: 125 },
    …
  ]
}
```

Les watts sont une donnée *interne*, jamais affichée. Ajouter un appareil au catalogue,
c'est ajouter un objet de ce genre : pas de code à écrire.

### b. Le taux de fonctionnement réel (« duty cycle »)

C'est le détail que la plupart des calculateurs ratent. Un réfrigérateur est branché
24 h sur 24, mais son compresseur ne tourne qu'environ 40 % du temps. Sans ce facteur,
on surestime sa facture de 150 %. Chaque appareil du catalogue porte donc un
`dutyCycle`, et certaines réponses le modifient (une clim réglée à 18 °C tourne presque
en continu, à 26 °C elle souffle par intermittence).

### c. Le socle 24h/24 est isolé

Les appareils marqués `alwaysOn` (frigo, congélateur, box internet, décodeur en veille,
chauffe-eau) sont regroupés dans un bloc à part de l'écran principal, avec leur coût
mensuel propre. C'est ce qui transforme une facture subie en décisions : *« 6 400 F par
mois partent même quand la maison est vide »* est une phrase sur laquelle on peut agir.

---

## 4. Les couches du serveur

```
routes/            traduction HTTP ⇄ métier, validation des entrées (Zod)
  ├── catalog.routes.ts      catalogue, aperçu de coût, grilles tarifaires
  ├── household.routes.ts    foyers, membres, recharges, répartition
  ├── appliance.routes.ts    inventaire (ajout / modification / suppression)
  └── estimate.routes.ts     estimateur ponctuel, simulateur de recharge
services/          logique applicative, jamais de HTTP
  ├── household.service.ts   assemble le tableau de bord et la répartition
  └── tariff.service.ts      lit la grille en base et la donne au moteur
db.ts              client Prisma unique
errors.ts          erreurs métier, avec un message en français affichable tel quel
```

Règle : **une route ne calcule rien**. Elle valide, appelle un service, renvoie du JSON.

### Les points d'entrée principaux

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/catalog` | Le catalogue visuel complet (catégories + appareils). |
| `POST` | `/api/catalog/:id/preview` | Coût **ajouté** par un appareil, en direct pendant la configuration. |
| `POST` | `/api/households` | Créer un foyer et ses membres. |
| `GET` | `/api/households/:id/summary` | Le tableau de bord : total, tranches, classement, socle 24h/24. |
| `POST` | `/api/households/:id/appliances` | Ajouter un appareil à l'inventaire. |
| `GET` | `/api/households/:id/split` | Qui paie quoi ce mois-ci. |
| `POST` | `/api/estimate/punctual` | « 3 h de PlayStation, ça fait combien ? » |
| `POST` | `/api/estimate/recharge` | « Avec 5 000 F, je reçois combien de kWh ? » |
| `PATCH` | `/api/tariffs/:code` | Corriger les prix du kWh d'après un reçu. |

---

## 5. Performance et contexte d'usage

L'application est pensée pour un téléphone d'entrée de gamme sur un réseau lent :

- **60 ko compressés** pour toute l'application, polices exclues.
- Les illustrations sont des **SVG écrits à la main** (quelques centaines d'octets
  chacune) et non des images : nettes sur tous les écrans, instantanées à charger.
- Le catalogue est chargé **une seule fois** par session.
- L'aperçu de coût est *debouncé* : on ne bombarde pas le serveur pendant que
  l'utilisateur hésite entre deux options.
- Zones tactiles de 48 px minimum, textes larges et gras : lisible en plein soleil,
  utilisable par quelqu'un qui n'a jamais utilisé d'application de gestion.

---

## 6. Ce que je ferais ensuite (par ordre de valeur)

1. **Photo du reçu Woyofal** : lecture automatique du montant et des kWh pour caler
   l'estimation sur la réalité sans rien saisir.
2. **Notification « vous approchez de la tranche 2 »** : c'est le moment exact où un
   conseil fait économiser de l'argent.
3. **Historique sur 12 mois** : voir l'effet de la saison (la clim en avril-juin).
4. **Mode hors ligne complet** (service worker) : l'inventaire se consulte sans réseau.
5. **Partage WhatsApp de la répartition** : le format naturel de la discussion en
   colocation.
