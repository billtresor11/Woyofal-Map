# Base de données

Schéma complet : `apps/api/prisma/schema.prisma`. Il fait office de documentation
technique de référence — chaque table y est commentée.

**SQLite** en développement (un simple fichier, zéro installation), **PostgreSQL** en
production. Aucun type exotique n'est utilisé : la bascule se fait en changeant deux
lignes (voir plus bas).

---

## Vue d'ensemble

```
Household (le foyer, rattaché à un compteur)
│
├── Member          les personnes (colocataires, famille) + leur taux de présence
├── Room            les pièces (salon = commun, chambre = privé)
├── Appliance       les appareils possédés, avec les choix de l'utilisateur
│   └── ApplianceShare   pondération fine d'un appareil commun, par personne
├── PunctualSession les utilisations ponctuelles enregistrées (« 3 h de console »)
└── TopUp           les recharges Woyofal réelles

ApplianceTemplate   le catalogue (miroir de packages/core/src/catalog.ts)
TariffPlan ──┬── TariffTier    les grilles Senelec, versionnées et modifiables
```

---

## Les tables, une par une

### `Household` — le foyer

L'unité de facturation. Porte le **code de la grille tarifaire** appliquée
(`tariffCode`), le type de compteur (`PREPAID` pour Woyofal, `POSTPAID` pour la facture
papier), la puissance souscrite en kVA et un budget mensuel facultatif — celui qui
déclenche l'alerte « vous allez dépasser ».

### `Member` — les personnes

Nom, avatar, couleur, et surtout **`presenceRatio`** (0 à 1) : la part du mois pendant
laquelle la personne était là. Un colocataire parti deux semaines paie moitié moins les
charges communes. C'est le curseur affiché sous chaque profil dans l'onglet 3.

### `Room` — les pièces

Sert à distinguer naturellement le commun du privé. Une pièce est `SHARED` (salon,
cuisine) ou `PRIVATE` (chambre).

### `ApplianceTemplate` — le catalogue

Copie en base du catalogue livré avec le moteur. Les caractéristiques et profils d'usage
sont stockés en JSON dans `definition`. Cette table existe pour une seule raison :
**pouvoir ajouter ou corriger un appareil sans redéployer**.

### `Appliance` — un appareil possédé

Le nœud central. On y trouve :

- les **choix de l'utilisateur** : `optionsJson` (`{"taille":"moyen","etat":"vieux"}`),
  `usageProfileId`, `quantity` ;
- l'**affectation** : `ownership` (`SHARED` / `PRIVATE`), `ownerId`, `roomId` ;
- les **résultats du calcul**, volontairement dénormalisés : `watts`, `dutyCycle`,
  `hoursPerDay`, `alwaysOn`, `kwhPerDay`, `kwhPerMonth`.

Pourquoi stocker les résultats ? Pour deux raisons. Les listes et les totaux se lisent
sans rejouer le moteur sur chaque ligne (une requête au lieu de vingt). Et si le
catalogue évolue demain — une puissance moyenne corrigée —, l'historique du foyer reste
stable au lieu de se réécrire tout seul.

Ces valeurs sont **toujours recalculées côté serveur** à l'ajout et à la modification :
le client envoie des choix, jamais des kilowattheures.

### `ApplianceShare` — le partage fin

Table de liaison optionnelle. Par défaut, un appareil commun est réparti selon la
présence de chacun. Cette table permet de dire : « la clim du salon, ce sont surtout
Awa et Babacar qui l'utilisent, poids 2 contre 1 ».

### `PunctualSession` — les sessions ponctuelles

Ce que l'onglet 2 enregistre quand on attribue une session à quelqu'un. Ces kWh
s'ajoutent à sa part du mois.

### `TopUp` — les recharges Woyofal

Montant payé, kWh reçus, date. **C'est le pont entre l'estimation et la réalité** : dès
qu'un foyer saisit ses recharges, la répartition s'appuie sur des kWh réels et non plus
sur une estimation.

### `TariffPlan` et `TariffTier` — les grilles Senelec

Une grille = des paliers (`fromKwh`, `toKwh`, `pricePerKwh`, `vatExempt`) + un taux de
TVA + une redevance + une période (1 mois en prépayé, 2 mois en postpayé). Le drapeau
`isCustom` indique qu'un utilisateur a corrigé les prix d'après son reçu.

---

## Passer en PostgreSQL

1. Dans `apps/api/prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Dans `.env` :

```
DATABASE_URL="postgresql://user:motdepasse@hote:5432/woyofal"
```

3. Puis :

```bash
npm run -w @woyofal/api db:push
npm run -w @woyofal/api db:seed
```

Aucun changement dans le code applicatif. Deux améliorations facultatives une fois sur
PostgreSQL : transformer les champs `optionsJson` / `definition` en `Json` (`jsonb`), et
les champs de statut (`ownership`, `meterType`, `kind`) en vrais `enum` — SQLite ne
supporte ni l'un ni l'autre, d'où les chaînes de caractères aujourd'hui.

---

## Migrations

En développement, `db:push` synchronise le schéma sans cérémonie. Pour la production,
passez aux migrations versionnées dès la première mise en ligne :

```bash
npx prisma migrate dev --name description_du_changement   # crée la migration
npx prisma migrate deploy                                 # l'applique en production
```
