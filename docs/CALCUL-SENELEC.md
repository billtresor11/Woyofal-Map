# L'algorithme Senelec, expliqué

Le cœur de l'application. Tout est dans `packages/core/src/billing.ts`, couvert par
14 tests dans `billing.test.ts`.

---

## 1. Le principe : le prix du kWh n'est pas unique

La Senelec ne facture pas tous les kilowattheures au même prix. Le prix augmente **par
paliers**, appelés *tranches*. Chaque kWh est facturé au prix de la tranche dans laquelle
il tombe, selon le **cumul déjà consommé** sur la période.

Grille domestique petite puissance (valeurs par défaut, modifiables dans l'app) :

**Les prix sont TTC** : le total en sortie des tranches **est** la facture. Aucune
taxe n'est ajoutée par-dessus.

| Tranche | De … à … | Petite puissance (DPP) | Moyenne puissance (DMP) |
|---|---|---|---|
| Tranche 1 | 0 → 150 kWh | 82,00 F | 111,23 F |
| Tranche 2 | 150 → 250 kWh | 136,49 F | 143,54 F |
| Tranche 3 | au-delà de 250 kWh | 159,36 F | 158,46 F |

### Exemple chiffré : 300 kWh dans le mois

```
  150 premiers kWh  ×  82,00 F  = 12 300 F
  100 suivants      × 136,49 F  = 13 649 F
   50 derniers      × 159,36 F  =  7 968 F
  ─────────────────────────────────────────
  Facture du mois                 33 917 FCFA
  Coût journalier  = 33 917 / 30 =  1 131 FCFA
```

Prix moyen réellement payé : **113,1 F/kWh**. Prix du *dernier* kWh consommé :
**159,4 F/kWh**. Cet écart est exactement ce que l'application rend visible.

---

## 2. Les quatre fonctions du moteur

### `sliceByTier(déjàConsommé, kWh, grille)`

Découpe une consommation en portions, tranche par tranche. **C'est le seul endroit où la
règle est écrite** ; tout le reste n'est que mise en forme.

```ts
sliceByTier(0, 300, woyofal)    // → [T1: 150 kWh, T2: 100 kWh, T3: 50 kWh]
sliceByTier(140, 30, woyofal)   // → [T1: 10 kWh, T2: 20 kWh]   ← on bascule en cours de route
```

### `computeBill(kWh, grille, { déjàConsommé })`

Applique les prix de chaque tranche et renvoie le détail ligne par ligne, le total,
le prix moyen, la tranche courante et **combien de kWh restent avant la tranche
suivante**. Les prix étant TTC, le total obtenu est directement la facture — c'est
le point qui faussait la version précédente, où une TVA était ajoutée par-dessus.

### `marginalCost(déjàConsommé, kWhSupplémentaires, grille)`

Le vrai coût d'une consommation en plus, **sachant où l'on en est dans le mois**. C'est
la fonction derrière l'onglet 2 :

> 3 h de PlayStation 5 = 0,63 kWh
> • le 3 du mois (tranche 1) → **52 F**
> • le 28 du mois (tranche 3) → **100 F**

La même action, la même durée, près du double. Aucune autre application ne dit ça à
l'utilisateur.

### `kwhForAmount(montant, grille, déjàConsommé)`

Le calcul inverse, et la question numéro un des utilisateurs Woyofal :
**« avec 5 000 F, je reçois combien de kWh ? »**

On parcourt les tranches en dépensant le budget palier par palier. Réponse : 61,0 kWh en
début de mois… mais seulement 31,4 kWh si l'on a déjà consommé 260 kWh. La recharge
« rétrécit » en fin de mois, et l'application l'explique.

---

## 3. La consommation, avant le prix

Avant de parler d'argent, il faut des kilowattheures. Pour chaque appareil :

```
kWh/jour = (puissance_W × heures_par_jour × coefficient_usage) / 1000 × quantité
```

Le **coefficient d'usage** est le détail que la plupart des calculateurs ratent. Un
réfrigérateur est branché 24 h sur 24, mais son compresseur ne tourne qu'environ 30 %
du temps : son coefficient est de **0,3**. Une ampoule allumée consomme en continu :
coefficient **1**. Sans ce facteur, on surestime un frigo de plus de 200 %.

La consommation du foyer est la somme de tous les appareils, ramenée à **30 jours**.
C'est ce total mensuel — et lui seul — qui entre dans les tranches. On ne calcule
jamais le prix d'un appareil isolément.

## 3 bis. Périodicité

Les tranches Woyofal se remettent à zéro **chaque mois**. Le moteur sait aussi
raisonner sur une période de deux mois (facturation bimestrielle) via le champ
`periodMonths` : `computeMonthlyBill()` applique alors les seuils sur le cumul des
deux mois puis ramène le résultat au mois.

## 4. La jauge affichée à l'utilisateur

`tierProgress()` alimente la barre verte / orange / rouge en haut de l'écran. Elle
répond à une seule question, sans jamais prononcer le mot « tranche tarifaire » :

> 🟠 Vous êtes en **tranche 2**. Encore **32 kWh** avant que le prix n'augmente.

---

## 5. Où l'on en est dans le mois

Le prix marginal dépend du cumul déjà consommé. L'application le détermine ainsi
(`consumedSoFar()`) :

1. **S'il existe des recharges enregistrées ce mois-ci** → on prend leur total en kWh.
   C'est la réalité, et elle prime.
2. **Sinon** → on prorate l'estimation de l'inventaire sur les jours écoulés.

Plus l'utilisateur saisit ses recharges, plus l'application devient exacte. C'est la
boucle de fiabilité du produit.

---

## 5 bis. La répartition en colocation

```
Part d'un occupant = Σ (coût de chaque appareil commun / nombre de personnes qui le partagent)
                   + coût de ses appareils personnels
                   + coût de ses sessions ponctuelles
```

Par défaut, un appareil commun est partagé par tout le foyer. L'écran « Qui l'utilise ? »
permet de restreindre la liste : le ventilateur d'une chambre partagée par deux personnes
n'est facturé qu'à ces deux-là.

Les kWh de chacun sont valorisés au **prix moyen du foyer**, jamais au prix marginal :
sinon le dernier à consommer porterait à lui seul toute la tranche 3. La somme des parts
est ainsi toujours égale à la facture, au franc près.

## 6. ⚠️ Sur la fiabilité des prix

Les valeurs livrées sont celles fournies par le client, mais **les grilles changent** et
doivent être confirmées sur un reçu réel. Le projet est construit
pour que ce ne soit jamais un problème :

- un seul fichier source (`core/src/tariffs.ts`), avec la source et la date d'effet ;
- une copie en base de données (tables `TariffPlan` / `TariffTier`) ;
- un écran de correction dans l'application (⚙️ *Réglages ➜ Le prix du kWh*) ;
- une route `PATCH /api/tariffs/:code` pour une mise à jour groupée.

Changer un prix ne demande **aucun redéploiement**. L'algorithme, lui, ne bouge pas.
