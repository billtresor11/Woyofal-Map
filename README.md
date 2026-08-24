# 💡 Woyofal Map

**L'application qui aide les ménages sénégalais à comprendre et maîtriser leur facture d'électricité.**

Tout est en FCFA. L'utilisateur ne saisit jamais un watt : il touche des illustrations
d'appareils, choisit des caractéristiques en langage courant (« Taille : 200 litres »,
« Toute la nuit »), et l'application traduit ça en kilowattheures puis en francs, en
appliquant discrètement les tranches tarifaires de la Senelec.

Le produit existe en **deux applications, un seul cerveau** :

- une **application web** dessinée pour le téléphone (barre d'onglets en bas) et
  qui s'étend en colonne de navigation sur ordinateur, installable sur l'écran
  d'accueil ;
- une **application mobile native** (React Native / Expo), pour iOS et Android.

Les deux parlent à la même API et partagent le même moteur de calcul
(`packages/core`) : **aucune formule n'est écrite deux fois**. C'est ce qui
garantit qu'une facture partagée entre colocataires donne le même chiffre au
franc près, quel que soit l'appareil utilisé.

---

## Ce que fait l'application

| Onglet | Nom | Ce qu'il résout |
|---|---|---|
| 1 | **Mes appareils** | Inventaire visuel. On clique sur un frigo, on dit qu'il fait 200 litres, l'app en déduit la consommation. Les appareils **24h/24** sont isolés : c'est le socle incompressible. Deuxième vue, **Qui paie quoi** : la répartition en colocation (*part de chacun = communs ÷ occupants + ses propres appareils*), avec ventilation d'un lot (« 9 ampoules : 4 communes, 2 pour Awa, 3 pour Moussa »). |
| 2 | **Combien ça coûte ?** | Estimateur ponctuel : « 3 h de PlayStation ce soir, ça fait combien ? ». La réponse tient compte de la tranche déjà atteinte dans le mois. Deuxième mode : « avec 5 000 F de recharge, je reçois combien de kWh ? ». |
| 3 | **Mon compteur** | Le calibrage. On recopie le nombre affiché sur le boîtier mural : ce nombre **écrase l'estimation** et recale la tranche en cours. L'application dit ensuite ce qui est mesuré, ce qui est estimé, et de combien elle se trompait. |
| 4 | **Quand recharger** | Le conseiller d'achat. En prépayé, la tranche s'applique **à l'achat**, et retombe à zéro le 1er : acheter 20 000 F le 28 coûte bien plus cher que 5 000 F le 28 puis 15 000 F le 2. L'app chiffre l'écart et donne le montant à acheter aujourd'hui. |
| 5 | **L'École Woyofal** | Trois seaux qu'on remplit dans l'ordre et qu'on vide le 1er du mois. Tous les chiffres viennent de la grille réelle du foyer — aucun exemple écrit à la main ne peut se mettre à mentir. |

---

## Essayer sans rien installer

Le fichier **`demo/woyofal-map-demo.html`** contient l'application entière — calculs
compris — dans un seul fichier. Ouvrez-le dans n'importe quel navigateur : pas de Node.js,
pas de serveur, pas de base de données. Il fonctionne même hors ligne, et vos données
restent dans votre navigateur.

C'est la bonne façon de **montrer** le produit. Pour l'utiliser à plusieurs (un foyer
partagé entre plusieurs téléphones), il faut la version serveur ci-dessous.

```bash
npm run build:demo    # régénère demo/woyofal-map-demo.html
```

## Démarrage de la version complète

> 🚀 **Vous n'êtes pas développeur ?** Suivez le guide pas à pas **[DEMARRER.md](DEMARRER.md)** :
> une seule commande à recopier, 10 minutes, tout est expliqué.

Prérequis : **Node.js 20 ou plus** (rien d'autre — la base de données de développement est un simple fichier).

**La façon la plus simple** — installe, prépare et lance tout en une commande :

```bash
npm run demarrer      # puis ouvrez http://localhost:4000
```

**Pour développer** (rechargement automatique à chaque modification du code) :

```bash
npm install          # installe tout le projet
npm run setup        # crée la base, y charge le catalogue, les tarifs et un foyer de démo
npm run dev          # lance l'API (port 4000) et l'application (port 5173)
```

Puis ouvrez **http://localhost:5173** dans un navigateur en mode mobile.

Un foyer de démonstration (« Maison Démo (Dakar) », 3 personnes, 9 appareils) est créé
automatiquement pour que rien ne soit jamais vide.

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm test` | Lance les 78 tests du moteur et les 26 tests d'API. |
| `npm run typecheck` | Vérifie les types sur les quatre paquets, mobile compris. |
| `npm run build` | Compile tout pour la production. |
| `npm start` | Démarre le serveur de production (il sert aussi l'application web). |
| `npm run mobile` | Compile le moteur puis lance l'application native (Expo). |
| `npm run -w @woyofal/api db:studio` | Ouvre une interface graphique pour inspecter la base. |

---

## Organisation du code

```
woyofal-map/
├── packages/
│   └── core/            @woyofal/core — LE cœur métier, sans dépendance
│       ├── catalog.ts       le catalogue visuel des appareils et leurs questions
│       ├── consumption.ts   choix de l'utilisateur ➜ kWh
│       ├── billing.ts       kWh ➜ FCFA (algorithme des tranches Senelec)
│       ├── tariffs.ts       les grilles tarifaires, versionnées
│       ├── split.ts         répartition de la facture en colocation
│       ├── calibration.ts   les relevés du boîtier mural ➜ cumul réel du mois
│       ├── recharge.ts      quand acheter, combien, et ce qu'on économise
│       ├── education.ts     les trois seaux et l'exemple du débordement
│       ├── allocation.ts    ventilation d'un lot (« 9 ampoules : 4 + 2 + 3 »)
│       └── insights.ts      mise en forme, équivalents du quotidien
├── apps/
│   ├── api/             @woyofal/api — Fastify + Prisma (SQLite ➜ PostgreSQL)
│   ├── web/             @woyofal/web — React + Vite + Tailwind + Framer Motion
│   └── mobile/          @woyofal/mobile — React Native + Expo (iOS / Android)
└── docs/
    ├── ARCHITECTURE.md      les choix techniques et pourquoi
    ├── AUTHENTIFICATION.md  connexion Google, session, clé à créer
    ├── BASE-DE-DONNEES.md   le schéma, table par table
    ├── CALCUL-SENELEC.md    l'algorithme des tranches, avec des exemples chiffrés
    ├── MOTEUR-TARIFAIRE.md  calibrage, conseil de recharge, les trois seaux
    └── DEPLOIEMENT.md       mise en ligne
```

Le moteur `@woyofal/core` est **partagé** entre le serveur, l'application web et
l'application native : mêmes règles partout, aucune divergence possible entre ce qui
s'affiche et ce qui est enregistré. Une facture partagée entre colocataires ne pardonne
pas un écart de quelques francs — c'est la raison d'être de ce découpage.

---

## ⚠️ À propos des prix

Les prix du kWh livrés par défaut sont ceux de la grille Woyofal fournie par le client,
**toutes taxes comprises** : le total en sortie des tranches est directement la facture.
Ces grilles **évoluent**. Elles sont donc :

1. isolés dans un seul fichier (`packages/core/src/tariffs.ts`),
2. recopiés en base de données au démarrage,
3. **modifiables depuis l'application**, écran ⚙️ *Réglages ➜ Le prix du kWh*.

Prenez votre dernier reçu Woyofal, recopiez les prix, et l'estimation devient exacte.
L'algorithme, lui, ne change pas : c'est lui qui fait la valeur de l'application.

---

## Licence

Projet privé. Tous droits réservés.
