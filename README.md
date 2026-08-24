# 💡 Woyofal Map

**L'application qui aide les ménages sénégalais à comprendre et maîtriser leur facture d'électricité.**

Tout est en FCFA. L'utilisateur ne saisit **jamais** un watt : il touche des illustrations
d'appareils, choisit des caractéristiques en langage courant (« Taille : 200 litres »,
« Toute la nuit »), et l'application traduit ça en kilowattheures puis en francs, en
appliquant discrètement les tranches tarifaires de la Senelec.

---

## Table des matières

1. [Le problème que ça résout](#1-le-problème-que-ça-résout)
2. [Deux applications, un seul cerveau](#2-deux-applications-un-seul-cerveau)
3. [La logique mathématique Woyofal](#3-la-logique-mathématique-woyofal)
4. [Les cinq écrans](#4-les-cinq-écrans)
5. [La règle de répartition en colocation](#5-la-règle-de-répartition-en-colocation)
6. [Organisation du code](#6-organisation-du-code)
7. [Démarrer](#7-démarrer)
8. [À propos des prix](#8--à-propos-des-prix)

---

## 1. Le problème que ça résout

Un compteur Woyofal affiche un nombre : les kWh qu'il vous reste. Il ne dit ni ce qui
les consomme, ni combien de jours ils tiendront, ni — surtout — **si vous achetez au bon
moment**. Résultat : on recharge quand ça coupe, on paie ce qu'on vous demande, et on
découvre à la fin du mois que la facture a doublé sans qu'on ait rien changé chez soi.

Woyofal Map répond à quatre questions que personne ne sait résoudre de tête :

| Question | Où ça se passe |
|---|---|
| Qu'est-ce qui coûte cher chez moi ? | Tableau de bord |
| Combien coûte 3 h de PlayStation ce soir ? | Simulateur |
| Où en suis-je vraiment dans le mois ? | Synchronisation |
| Quand et combien dois-je recharger ? | Smart Recharge |
| Pourquoi mon courant change-t-il de prix ? | L'École Woyofal |

**Règle d'or de conception :** zéro jargon technique, jamais de watts en saisie, tout en
FCFA, et une interface utilisable par quelqu'un qui n'a jamais ouvert d'application de
gestion.

---

## 2. Deux applications, un seul cerveau

### L'expérience utilisateur

**Sur téléphone** — l'application est plein écran, avec une **barre d'onglets en bas**,
à portée de pouce. Les cinq écrans y sont accessibles en un geste. C'est le format de
référence : c'est là que l'application sera réellement utilisée, souvent debout, souvent
en 3G.

**Sur ordinateur** — la même application web s'étend : la barre du bas devient une
**colonne de navigation latérale** (sidebar) avec les libellés longs et un sous-titre par
entrée, le contenu se centre, et les listes passent en grille. Le basculement se fait à
1024 px de large, **par CSS seul** : il n'y a pas deux applications à maintenir, et aucun
composant d'écran n'a besoin de savoir où il s'affiche.

**Sur les magasins d'applications** — une **application mobile native** (React Native /
Expo), iOS et Android, avec sa propre barre d'onglets inférieure native, ses gestes, et
son stockage sécurisé.

### Ce qui est partagé, et ce qui ne l'est pas

| Élément | Partagé ? | Où |
|---|---|---|
| Calcul des tranches, consommation, répartition, conseil de recharge | **Oui, à 100 %** | `packages/core` |
| Catalogue des 30 appareils et leurs questions | **Oui** | `packages/core/src/catalog.ts` |
| Routes de l'API | **Oui** | `apps/api` |
| Couleurs, rayons, espacements | Recopiés | `apps/mobile/src/theme.ts` |
| Composants d'interface | Non — React Native n'a pas de DOM | chaque application |

> **Aucune formule n'est écrite deux fois.** C'est ce qui garantit qu'une facture partagée
> entre colocataires donne le même chiffre au franc près, que la personne regarde son
> téléphone, l'application native ou un ordinateur. Une facture partagée ne pardonne pas
> un écart de quelques francs.

### Choix technique à connaître

L'application web est en **React + Vite**, pas en Next.js. Il n'y a ni référencement à
optimiser (l'application est derrière une connexion), ni rendu serveur nécessaire : Vite
produit des fichiers statiques que l'API sert elle-même, ce qui permet de **tout héberger
dans un seul conteneur**, gratuitement, avec une seule chose à surveiller. Next.js aurait
imposé un second service à déployer et à payer, sans bénéfice ici.

---

## 3. La logique mathématique Woyofal

### 3.1 De l'appareil au kilowattheure

L'utilisateur ne saisit jamais de puissance. Il répond à des questions ; le moteur en
déduit les watts, puis applique :

```
kWh/jour = (Puissance_W × Quantité × Heures_par_jour × Coefficient_usage × Jours_par_semaine/7) ÷ 1000
```

Le **coefficient d'usage** est ce qui distingue « branché » de « qui consomme ». Un
réfrigérateur est branché 24 h/24, mais son compresseur ne tourne qu'environ 30 % du
temps : son coefficient est **0,3**. Une ampoule allumée consomme en continu : **1**.

```
Réfrigérateur 150 W, 24 h, coefficient 0,3 → (150 × 1 × 24 × 0,3) ÷ 1000 = 1,08 kWh/jour
Ampoule 12 W × 9, 5 h, coefficient 1       → (12 × 9 × 5 × 1)     ÷ 1000 = 0,54 kWh/jour
```

Le cycle de facturation retenu est de **30 jours** : `kWh/mois = kWh/jour × 30`.

### 3.2 Les trois tranches

Les prix sont **toutes taxes comprises** : le total en sortie des tranches **est** la
facture. Aucune TVA ni redevance n'est ajoutée par-dessus.

| Tranche | Cumul mensuel | DPP (petite puissance) | DMP (moyenne puissance) |
|---|---|---|---|
| **Tranche 1** | 0 → 150 kWh | **82,00 FCFA** / kWh | **111,23 FCFA** / kWh |
| **Tranche 2** | 151 → 250 kWh | **136,49 FCFA** / kWh | **143,54 FCFA** / kWh |
| **Tranche 3** | au-delà de 250 kWh | **159,36 FCFA** / kWh | **158,46 FCFA** / kWh |

Le cumul **retombe à zéro le 1er de chaque mois**.

### 3.3 La règle du chevauchement

C'est le cœur de l'algorithme, et l'erreur que presque tout le monde commet. Dépasser un
seuil ne fait **pas** payer l'ensemble au prix fort : chaque kWh est facturé au prix de la
tranche dans laquelle **il** tombe.

Exemple demandé : le cumul passe de **145 à 160 kWh** (grille DPP).

```
 5 kWh restent en Tranche 1  →  5 × 82,00   =   410 FCFA
10 kWh basculent en Tranche 2 → 10 × 136,49  = 1 365 FCFA
                                 ─────────────────────────
                                 TOTAL         1 775 FCFA
```

Et non `15 × 136,49 = 2 047 FCFA`, ni `160 × 136,49`. L'écart paraît petit sur 15 kWh ;
sur un mois entier, il représente plusieurs milliers de francs.

L'implémentation tient en une fonction, `sliceByTier`, qui découpe une consommation en
portions tranche par tranche à partir du cumul déjà atteint
(`packages/core/src/billing.ts`).

### 3.4 Le fait décisif : la tranche s'applique **à l'achat**

En prépayé, la tranche est appliquée **au moment de la recharge**, sur le cumul de kWh
**achetés** depuis le 1er du mois — pas sur ce qui a été consommé.

Conséquence, rarement exploitée :

> Deux foyers qui consomment exactement pareil ne payent pas pareil.
> Celui qui achète 30 000 F d'un coup remplit les trois tranches et paye ses derniers kWh
> **159 F**. Celui qui étale ses achats de part et d'autre du 1er reste en tranche 1 à
> **82 F**. Même courant, jusqu'à **40 % d'écart**.

L'application tient donc **deux cumuls séparés**, et les confondre fausserait le prix :

| Cumul | Ce qu'il détermine | Source |
|---|---|---|
| **Consommé** (relevés + estimation) | *Quand* il faudra racheter | `calibration.ts` |
| **Acheté** depuis le 1er | *À quel prix* sera le prochain kWh | historique des recharges |

### 3.5 Le calibrage : mesurer au lieu d'estimer

L'inventaire **estime**, le compteur **sait**. Un ventilateur allumé plus souvent
qu'annoncé, une semaine de visite, et le cumul virtuel dérive — or c'est lui qui décide de
la tranche. Une dérive de 20 kWh peut faire croire qu'on est en tranche 1 alors qu'on paye
déjà la 2.

La correction ne demande aucun matériel. Entre deux relevés du boîtier mural :

```
consommé = crédit_avant + recharges_entre_les_deux − crédit_après
```

C'est une conservation, pas un modèle : ce qui est entré dans le compteur, moins ce qui y
reste, a été consommé. Sur les périodes sans relevé, on revient à l'estimation — et
l'application **le dit** (part réellement mesurée, dérive chiffrée, explication par
segment) plutôt que de faire passer une estimation pour une mesure.

---

## 4. Les cinq écrans

### Écran 1 — Tableau de bord *(inventaire et colocation)*

En haut, la seule chose vraiment regardée : **le montant estimé du mois**, les kWh par
jour et par mois, et une jauge colorée montrant où l'on en est dans les tranches.

En dessous, les appareils sont séparés en deux blocs qui n'ont pas la même signification :

- **🔁 Ça tourne tout seul** — le socle 24 h/24 (frigo, box, décodeur en veille). Il coûte
  de l'argent même quand la maison est vide, et représente souvent la moitié de la facture.
- **🎚️ Vous les allumez** — là où l'utilisateur peut réellement agir.

C'est cette séparation qui transforme une facture subie en décisions.

**Ajout d'un appareil :** on touche une illustration, on répond à deux ou trois questions
en langage courant, et le coût s'affiche en direct. Le nom, le nombre et la fréquence
restent libres — aucune liste ne couvre tout.

**Ajout en masse avec ventilation :** « j'ai 9 ampoules » se saisit d'un coup, puis se
répartit — 4 communes, 2 pour Awa, 3 pour Moussa. L'application crée une ligne par groupe,
et ce que personne ne réclame va automatiquement au pot commun.

**Seconde vue, « Qui paie quoi » :** la répartition entre occupants (voir §5), avec la
part de chacun en FCFA et en kWh.

### Écran 2 — Simulateur *(combien ça coûte ?)*

Deux questions, les seules qu'on se pose avant d'appuyer sur un bouton :

- **« Si j'allume la PlayStation 3 h, ça coûte combien ? »** — on choisit une durée, on
  touche l'appareil, la réponse tombe en FCFA. Le prix tient compte de **la tranche déjà
  atteinte dans le mois** : la même soirée ne coûte pas pareil le 3 et le 28.
- **« Avec 5 000 F de recharge, je reçois combien de kWh ? »** — la conversion inverse,
  tranches comprises.

### Écran 3 — Synchronisation *(le compteur)*

Le seul écran qui **mesure** au lieu d'estimer. Un grand champ, un gros bouton : on
recopie le nombre affiché sur le boîtier mural, et ce nombre **écrase le cumul virtuel**.

L'écran affiche ensuite :

- le crédit restant converti **en jours de courant** (la seule unité qui compte quand on
  regarde son compteur) ;
- le cumul du mois, avec la part réellement mesurée ;
- la **dérive** : « vous consommez 18 % de plus que ce que l'application prévoit — il
  manque sans doute un appareil dans votre inventaire » ;
- le détail segment par segment de ce qui est mesuré et de ce qui est estimé ;
- l'historique des relevés, avec la consommation reconstituée entre chacun.

### Écran 4 — Smart Recharge *(quand recharger)*

L'écran qui rapporte de l'argent. Il pose trois questions et n'en montre aucune :

1. Combien de crédit reste-t-il, et combien de jours ça tient ?
2. Combien faut-il pour tenir jusqu'au 1er ?
3. Est-ce que ça vaut le coup d'attendre le 1er pour le reste ?

La troisième est chiffrée en comparant **deux scénarios pour le même volume de courant** :
tout acheter aujourd'hui, ou acheter le minimum vital puis compléter après la remise à
zéro. L'écart est annoncé en francs.

**Quatre stratégies**, l'urgence avant le prix :

| Stratégie | Quand | Message |
|---|---|---|
| `rien_a_faire` | Le crédit tient jusqu'au 1er | « Attendez la remise à zéro » |
| `minimum_vital` | Tranche ≥ 2 **et** ≤ 12 jours avant le 1er | « Achetez juste de quoi tenir, vous gardez X F » |
| `meilleur_moment` | Tranche 1 **et** > 12 jours restants | « Vous êtes au meilleur prix » |
| `recharge_normale` | Le reste | « Il vous faut environ X F » |

Exemple réel produit par l'application (crédit 12 kWh, 8 jours avant le 1er, tranche 3) :
**10 600 F aujourd'hui puis 28 900 F le 1er, au lieu de 53 400 F d'un coup — 13 891 F
gardés**, à courant identique.

L'application ne vend rien et n'achète rien à votre place. Elle dit seulement quand votre
argent achète le plus de courant.

### Écran 5 — L'École Woyofal

Le pari : quelqu'un qui **comprend** les tranches économise plus que quelqu'un à qui on
donne juste un chiffre.

**La métaphore des trois seaux**, avec un ton compréhensible par un enfant de 10 ans :

> Imaginez trois seaux qu'on remplit dans l'ordre. Le premier est bon marché (82 F le kWh).
> Quand il déborde, l'eau tombe dans le deuxième, plus cher (136 F). Le troisième n'a pas
> de fond, et c'est le plus cher (159 F). **Le 1er du mois, on vide tout et on recommence
> par le premier.**

Les seaux se remplissent visuellement à hauteur de la consommation réelle du foyer. On
touche un seau pour lire son explication. Suivent l'exemple du débordement (145 → 160 kWh,
calculé et non écrit en dur), un fait marquant personnalisé au foyer, et six leçons
courtes avec le geste concret qui en découle.

**Tous les chiffres sont dérivés de la grille réelle du foyer.** Si Senelec change ses
prix, la leçon change avec eux — aucun exemple ne peut se mettre à mentir avec le temps.

---

## 5. La règle de répartition en colocation

### La formule

```
Facture d'un occupant = (Coût mensuel des appareils COMMUNS ÷ Nombre d'occupants)
                      + Coût mensuel de ses appareils INDIVIDUELS
```

### Comment elle est appliquée

1. **Les kWh de chaque appareil sont attribués.**
   - Appareil **personnel** (`PRIVATE`) → entièrement à son propriétaire.
   - Appareil **commun** (`SHARED`) → divisé à parts égales entre les personnes désignées.
     Par défaut, tout le foyer ; mais on peut restreindre (la climatisation d'une chambre
     partagée par deux personnes sur quatre).

2. **Les kWh sont convertis en francs au prix MOYEN du foyer**, pas au prix marginal.
   C'est un choix de justice : le prix moyen inclut la part de tranche 1 dont tout le monde
   a bénéficié. Facturer au prix marginal ferait payer le tarif le plus cher à celui dont
   l'appareil a été calculé en dernier — un ordre arbitraire.

3. **Les utilisations ponctuelles enregistrées** (« 3 h de console » attribuées à
   quelqu'un) s'ajoutent à sa part.

### Exemple

Foyer de 3 personnes, 30 000 F de facture, dont 21 000 F d'appareils communs :

| | Communs | Personnels | Total |
|---|---|---|---|
| Awa | 21 000 ÷ 3 = **7 000** | Climatiseur de sa chambre : **6 000** | **13 000 F** |
| Babacar | **7 000** | Ordinateur : **2 000** | **9 000 F** |
| Coumba | **7 000** | Rien | **7 000 F** |

Sur le tableau de bord, chaque appareil listé affiche les personnes qui le portent : on
voit immédiatement pourquoi la part de quelqu'un est plus élevée.

Implémentation : `packages/core/src/split.ts`, testée sur 8 cas.

---

## 6. Organisation du code

```
woyofal-map/
├── packages/
│   └── core/                    @woyofal/core — LE cœur métier, sans aucune dépendance
│       └── src/
│           ├── types.ts             les types du domaine
│           ├── catalog.ts           30 appareils, 224 caractéristiques illustrées
│           ├── consumption.ts       choix de l'utilisateur ➜ kWh
│           ├── tariffs.ts           les grilles Senelec, versionnées
│           ├── billing.ts           kWh ➜ FCFA (chevauchement des tranches)
│           ├── split.ts             répartition de la facture en colocation
│           ├── calibration.ts       relevés du boîtier ➜ cumul réel du mois
│           ├── recharge.ts          quand acheter, combien, ce qu'on économise
│           ├── education.ts         les trois seaux et l'exemple du débordement
│           ├── allocation.ts        ventilation d'un lot (« 9 ampoules : 4 + 2 + 3 »)
│           └── insights.ts          classement des appareils, mise en forme
│
├── apps/
│   ├── api/                     @woyofal/api — Fastify 5 + Prisma (SQLite ➜ PostgreSQL)
│   │   ├── prisma/schema.prisma     le schéma de base, commenté table par table
│   │   └── src/
│   │       ├── server.ts            montage des routes, service du web compilé
│   │       ├── routes/              catalogue, foyers, appareils, estimation, compteur
│   │       └── services/            règles d'accès, tableau de bord, répartition
│   │
│   ├── web/                     @woyofal/web — React 18 + Vite + Tailwind + Framer Motion
│   │   └── src/
│   │       ├── App.tsx              coquille responsive (sidebar ⟷ barre du bas)
│   │       ├── components/
│   │       │   ├── Navigation.tsx       les 5 onglets, deux formes
│   │       │   ├── ApplianceConfigSheet.tsx  fiche appareil + ventilation d'un lot
│   │       │   └── ApplianceIcon.tsx / OptionIcon.tsx   117 illustrations dessinées
│   │       └── screens/
│   │           ├── Onboarding.tsx       tunnel animé en 3 étapes
│   │           ├── InventoryScreen.tsx  écran 1 — tableau de bord
│   │           ├── HouseholdScreen.tsx  écran 1 bis — qui paie quoi
│   │           ├── EstimatorScreen.tsx  écran 2 — simulateur
│   │           ├── MeterScreen.tsx      écran 3 — synchronisation
│   │           ├── RechargeScreen.tsx   écran 4 — smart recharge
│   │           └── SchoolScreen.tsx     écran 5 — l'École Woyofal
│   │
│   └── mobile/                  @woyofal/mobile — React Native + Expo (iOS / Android)
│       ├── app/
│       │   ├── _layout.tsx          racine : état partagé, zones sûres
│       │   ├── index.tsx            aiguillage d'entrée
│       │   ├── bienvenue.tsx        tunnel d'accueil natif en 3 étapes
│       │   └── (tabs)/
│       │       ├── _layout.tsx      la barre d'onglets INFÉRIEURE (Bottom Tabs)
│       │       ├── index.tsx        écran 1
│       │       ├── estimateur.tsx   écran 2
│       │       ├── compteur.tsx     écran 3
│       │       ├── recharge.tsx     écran 4
│       │       └── ecole.tsx        écran 5
│       └── src/                 client HTTP, état partagé, thème, composants natifs
│
├── docs/                        documentation technique détaillée
├── demo/woyofal-map-demo.html   l'application entière dans UN fichier, sans serveur
├── Dockerfile                   image de production (API + web dans un conteneur)
├── DEPLOY.md                    👉 le guide de mise en ligne, pas à pas
└── README.md                    ce document
```

---

## 7. Démarrer

### Essayer immédiatement, sans rien installer

Ouvrez **`demo/woyofal-map-demo.html`** dans n'importe quel navigateur. L'application
entière — calculs compris — tient dans ce seul fichier : pas de Node.js, pas de serveur,
pas de base de données. Les données restent dans votre navigateur.

### Lancer la version complète

Prérequis : **Node.js 20 ou plus**.

```bash
npm run demarrer      # installe, prépare la base, compile et lance
```

Puis ouvrez **http://localhost:4000**.

Pour développer, avec rechargement automatique :

```bash
npm install
npm run setup        # crée la base, y charge le catalogue, les tarifs et un foyer de démo
npm run dev          # API sur 4000, application web sur 5173
```

### Lancer l'application mobile

```bash
npm run mobile       # compile le moteur puis démarre Expo
```

Scannez le QR code avec **Expo Go**. Détails et pièges dans
[`DEPLOY.md`](DEPLOY.md) et [`apps/mobile/README.md`](apps/mobile/README.md).

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm test` | 78 tests du moteur + 26 tests d'API |
| `npm run typecheck` | Vérifie les types sur les quatre paquets |
| `npm run build` | Compile tout pour la production |
| `npm start` | Démarre le serveur de production (il sert aussi l'application web) |
| `npm run build:demo` | Régénère le fichier de démonstration autonome |
| `npm run -w @woyofal/api db:studio` | Interface graphique pour inspecter la base |

### À propos de la connexion

L'application fonctionne **sans compte** tant que la variable `GOOGLE_CLIENT_ID` est vide :
c'est le mode par défaut, pratique pour développer et pour démontrer. Dès qu'elle est
renseignée, la connexion Google devient obligatoire et chaque foyer est rattaché à son
propriétaire. Voir [`docs/AUTHENTIFICATION.md`](docs/AUTHENTIFICATION.md).

---

## 8. ⚠️ À propos des prix

Les prix du kWh livrés par défaut sont ceux de la grille Woyofal fournie par le client,
**toutes taxes comprises** : le total en sortie des tranches est directement la facture.

Ces grilles **évoluent**. Elles sont donc :

1. isolées dans un seul fichier (`packages/core/src/tariffs.ts`),
2. recopiées en base de données au démarrage du serveur,
3. **modifiables depuis l'application**, écran ⚙️ *Réglages ➜ Le prix du kWh*.

Prenez votre dernier reçu Woyofal, recopiez les prix, et l'estimation devient exacte.
L'algorithme, lui, ne change pas : c'est lui qui fait la valeur de l'application.

---

## Documentation technique

| Document | Contenu |
|---|---|
| [`DEPLOY.md`](DEPLOY.md) | **Mise en ligne pas à pas**, pour un profil non-développeur |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Les choix techniques et leurs raisons |
| [`docs/CALCUL-SENELEC.md`](docs/CALCUL-SENELEC.md) | L'algorithme des tranches, exemples chiffrés |
| [`docs/MOTEUR-TARIFAIRE.md`](docs/MOTEUR-TARIFAIRE.md) | Calibrage, conseil de recharge, les trois seaux |
| [`docs/BASE-DE-DONNEES.md`](docs/BASE-DE-DONNEES.md) | Le schéma, table par table |
| [`docs/AUTHENTIFICATION.md`](docs/AUTHENTIFICATION.md) | Connexion Google, session, clés à créer |
| [`apps/mobile/README.md`](apps/mobile/README.md) | Spécificités de l'application native |
