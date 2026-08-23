# 💡 Woyofal Map

**L'application qui aide les ménages sénégalais à comprendre et maîtriser leur facture d'électricité.**

Tout est en FCFA. L'utilisateur ne saisit jamais un watt : il touche des illustrations
d'appareils, choisit des caractéristiques en langage courant (« Taille : 200 litres »,
« Toute la nuit »), et l'application traduit ça en kilowattheures puis en francs, en
appliquant discrètement les tranches tarifaires de la Senelec.

---

## Ce que fait l'application

| Onglet | Nom | Ce qu'il résout |
|---|---|---|
| 1 | **Mes appareils** | Inventaire visuel. On clique sur un frigo, on dit qu'il fait 200 litres, l'app en déduit la consommation. Les appareils qui tournent **24h/24** sont isolés dans un bloc à part : c'est le socle incompressible de la facture. |
| 2 | **Combien ça coûte ?** | Estimateur ponctuel : « 3 h de PlayStation ce soir, ça fait combien ? ». La réponse tient compte de la tranche déjà atteinte dans le mois. Deuxième mode : « avec 5 000 F de recharge, je reçois combien de kWh ? ». |
| 3 | **Chez nous** | Colocation / famille. Jusqu'à une dizaine de profils, séparation des appareils **communs** (frigo, télé du salon) et **personnels** (PC de la chambre, clim d'une chambre), et répartition claire de la facture en fin de mois. |

---

## Démarrage

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
| `npm test` | Lance les 32 tests du moteur de calcul (tranches, consommation, répartition). |
| `npm run typecheck` | Vérifie les types sur les trois paquets. |
| `npm run build` | Compile tout pour la production. |
| `npm start` | Démarre le serveur de production (il sert aussi l'application web). |
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
│       └── insights.ts      mise en forme, équivalents du quotidien
├── apps/
│   ├── api/             @woyofal/api — Fastify + Prisma (SQLite ➜ PostgreSQL)
│   └── web/             @woyofal/web — React + Vite + Tailwind, pensé mobile
└── docs/
    ├── ARCHITECTURE.md      les choix techniques et pourquoi
    ├── BASE-DE-DONNEES.md   le schéma, table par table
    ├── CALCUL-SENELEC.md    l'algorithme des tranches, avec des exemples chiffrés
    └── DEPLOIEMENT.md       mise en ligne
```

Le moteur `@woyofal/core` est **partagé** entre le serveur et l'application : mêmes
règles des deux côtés, aucune divergence possible entre ce qui s'affiche et ce qui est
enregistré.

---

## ⚠️ À propos des prix

Les prix du kWh livrés par défaut correspondent aux grilles domestiques publiées par la
Senelec. **Ils évoluent** (révisions tarifaires, compensations de l'État). Ils sont donc :

1. isolés dans un seul fichier (`packages/core/src/tariffs.ts`),
2. recopiés en base de données au démarrage,
3. **modifiables depuis l'application**, écran ⚙️ *Réglages ➜ Le prix du kWh*.

Prenez votre dernier reçu Woyofal, recopiez les prix, et l'estimation devient exacte.
L'algorithme, lui, ne change pas : c'est lui qui fait la valeur de l'application.

---

## Licence

Projet privé. Tous droits réservés.
