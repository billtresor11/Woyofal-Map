# L'algorithme Senelec, expliqué

Le cœur de l'application. Tout est dans `packages/core/src/billing.ts`, couvert par
14 tests dans `billing.test.ts`.

---

## 1. Le principe : le prix du kWh n'est pas unique

La Senelec ne facture pas tous les kilowattheures au même prix. Le prix augmente **par
paliers**, appelés *tranches*. Chaque kWh est facturé au prix de la tranche dans laquelle
il tombe, selon le **cumul déjà consommé** sur la période.

Grille domestique petite puissance (valeurs par défaut, modifiables dans l'app) :

| Tranche | De … à … | Prix du kWh | TVA |
|---|---|---|---|
| Tranche 1 (sociale) | 0 → 150 kWh | 91,17 F | exonérée |
| Tranche 2 | 150 → 250 kWh | 101,44 F | 18 % |
| Tranche 3 | au-delà de 250 kWh | 116,35 F | 18 % |

### Exemple chiffré : 300 kWh dans le mois

```
  150 premiers kWh  ×  91,17 F  = 13 675,50 F   (pas de TVA : tranche sociale)
  100 suivants      × 101,44 F  = 10 144,00 F   + TVA 1 825,92 F
   50 derniers      × 116,35 F  =  5 817,50 F   + TVA 1 047,15 F
  ─────────────────────────────────────────────────────────────
  Total                                          32 510 FCFA
```

Prix moyen réellement payé : **108,4 F/kWh**. Prix du *dernier* kWh consommé :
**137,3 F/kWh**. Cet écart est exactement ce que l'application rend visible.

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

Applique les prix, la TVA (en respectant l'exonération de la tranche sociale), la taxe
communale éventuelle et la redevance fixe. Renvoie le détail ligne par ligne, le total,
le prix moyen, la tranche courante et **combien de kWh restent avant la tranche
suivante**.

### `marginalCost(déjàConsommé, kWhSupplémentaires, grille)`

Le vrai coût d'une consommation en plus, **sachant où l'on en est dans le mois**. C'est
la fonction derrière l'onglet 2 :

> 3 h de PlayStation 5 = 0,63 kWh
> • le 3 du mois (tranche 1) → **57 F**
> • le 28 du mois (tranche 3) → **86 F**

La même action, la même durée, 50 % plus cher. Aucune autre application ne dit ça à
l'utilisateur.

### `kwhForAmount(montant, grille, déjàConsommé)`

Le calcul inverse, et la question numéro un des utilisateurs Woyofal :
**« avec 5 000 F, je reçois combien de kWh ? »**

On parcourt les tranches en dépensant le budget palier par palier. Réponse : 54,8 kWh en
début de mois… mais seulement 36,4 kWh si l'on a déjà consommé 260 kWh. La recharge
« rétrécit » en fin de mois, et l'application l'explique.

---

## 3. Prépayé (Woyofal) contre postpayé (facture)

| | Woyofal (prépayé) | Facture papier (postpayé) |
|---|---|---|
| Période des tranches | **le mois calendaire** | **deux mois** (facture bimestrielle) |
| Remise à zéro | chaque 1er du mois | à chaque facture |
| Redevance fixe | aucune | prélevée sur la facture |

Le modèle porte un champ `periodMonths` (1 ou 2). `computeMonthlyBill()` raisonne sur la
période de la grille puis ramène le résultat au mois. Conséquence non évidente, testée :
100 kWh par mois en prépayé restent en tranche 1, alors qu'en postpayé les 200 kWh du
bimestre font basculer en tranche 2.

---

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

## 6. ⚠️ Sur la fiabilité des prix

Les valeurs livrées correspondent aux grilles domestiques publiées par la Senelec, mais
**elles changent** et doivent être confirmées sur un reçu réel. Le projet est construit
pour que ce ne soit jamais un problème :

- un seul fichier source (`core/src/tariffs.ts`), avec la source et la date d'effet ;
- une copie en base de données (tables `TariffPlan` / `TariffTier`) ;
- un écran de correction dans l'application (⚙️ *Réglages ➜ Le prix du kWh*) ;
- une route `PATCH /api/tariffs/:code` pour une mise à jour groupée.

Changer un prix ne demande **aucun redéploiement**. L'algorithme, lui, ne bouge pas.
