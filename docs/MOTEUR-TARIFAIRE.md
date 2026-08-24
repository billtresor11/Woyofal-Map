# 🧮 Le moteur : cumul, recharge, seaux

Ce document explique les trois algorithmes ajoutés au moteur partagé
(`packages/core`) — ceux qui font la différence entre une calculatrice et un
conseiller. Tous sont du TypeScript pur, sans dépendance, testés, et utilisés
tels quels par le serveur, le web et l'application mobile.

---

## 1. Le fait qui change tout

En prépayé Woyofal, **la tranche s'applique au moment de l'ACHAT**, sur le cumul
de kWh achetés depuis le 1er du mois. Ce cumul retombe à zéro le 1er.

Conséquence, rarement exploitée :

> Deux foyers qui consomment exactement pareil ne payent pas pareil.
> Celui qui achète 30 000 F d'un coup grimpe en tranche 3 et paye ses derniers
> kWh **159 F**. Celui qui étale ses achats de part et d'autre du 1er reste en
> tranche 1 à **82 F**.

Deux cumuls cohabitent donc dans l'application, et les confondre fausserait tout :

| Cumul | Ce qu'il dit | Où il est calculé |
|---|---|---|
| **Consommé** (relevés + estimation) | *Quand* il faudra racheter | `calibration.ts` |
| **Acheté** depuis le 1er | *À quel prix* sera le prochain kWh | `household.service.ts ▸ purchasedSoFar` |

---

## 2. Le calibrage sur le boîtier mural — `calibration.ts`

### Le problème

L'application **estime**, le compteur **sait**. Un ventilateur allumé plus
souvent qu'annoncé, une semaine de visite, un frigo qui vieillit : le cumul
virtuel dérive. Or c'est le cumul qui décide de la tranche. Une dérive de
20 kWh peut faire croire qu'on est en tranche 1 alors qu'on paye déjà la 2.

### La correction, sans matériel

Le boîtier Woyofal affiche en permanence le crédit restant. L'utilisateur le
recopie, et ce nombre fait autorité. Entre deux relevés :

```
consommé = crédit_avant + recharges_entre_les_deux − crédit_après
```

C'est une simple conservation : ce qui est entré dans le compteur, moins ce qui
y reste, a été consommé. **Aucune hypothèse, aucun modèle.**

### L'honnêteté du résultat

Sur les périodes non couvertes par un relevé (avant le premier, après le
dernier), on revient à l'estimation — mais `computeCumulativeKwh` le **dit** :

- `source` vaut `compteur`, `estimation` ou `mixte` ;
- `measuredRatio` donne la part du mois réellement mesurée ;
- `segments[]` détaille chaque morceau avec sa phrase d'explication ;
- `driftKwh` / `driftPercent` chiffrent l'écart entre prévision et mesure,
  **sur la période mesurée seulement** — sinon on comparerait l'estimation
  avec elle-même.

Un crédit qui remonte sans recharge enregistrée (recharge oubliée) ne produit
jamais un consommé négatif : on retombe sur l'estimation pour ce segment.

---

## 3. Le conseiller d'achat — `recharge.ts`

Trois questions, dans cet ordre :

1. Combien de crédit reste-t-il, et combien de jours ça tient ? (`forecastCredit`)
2. Combien faut-il pour tenir jusqu'au 1er ? (`perDay × joursRestants − crédit`)
3. Est-ce que ça vaut le coup d'attendre le 1er pour le reste ?

La troisième question est chiffrée en comparant deux scénarios pour **le même
volume de courant** :

| Scénario | Coût |
|---|---|
| Tout acheter aujourd'hui | `costOfKwh(total, plan, déjàAcheté)` |
| Le minimum vital, puis le reste le 1er | `costOfKwh(déficit, plan, déjàAcheté) + costOfKwh(reste, plan, 0)` |

L'écart est l'économie annoncée à l'utilisateur.

### Les quatre stratégies

| Stratégie | Quand | Ce qui est dit |
|---|---|---|
| `rien_a_faire` | Le crédit tient jusqu'au 1er | « Attendez la remise à zéro » |
| `minimum_vital` | Tranche ≥ 2 **et** ≤ 12 jours avant le 1er | « Achetez juste de quoi tenir, vous gardez X F » |
| `meilleur_moment` | Tranche 1 **et** > 12 jours restants | « Vous êtes au meilleur prix » |
| `recharge_normale` | Le reste | « Il vous faut environ X F » |

L'ordre des tests compte : on répond d'abord à l'urgence, ensuite au prix.

---

## 4. Les trois seaux — `education.ts`

Expliquer une tarification progressive est un problème de pédagogie, pas de
mathématiques. L'image retenue : trois seaux qu'on remplit dans l'ordre, et
qu'on vide le 1er du mois.

`waterBuckets(kwhDuMois, plan)` renvoie, pour chaque tranche, sa contenance, son
prix, ce qu'il y a dedans ce mois-ci, et une phrase compréhensible par un enfant
de 10 ans. `overflowExample(plan, 145, 15)` calcule — et n'écrit jamais en dur —
l'exemple du débordement :

> Vous étiez à 145 kWh, vous montez à 160. On ne compte pas les 15 kWh au prix
> fort : **5 kWh à 82 F, puis 10 kWh à 136 F**. Total **1 775 F**, et non 2 390 F.

**Tous les chiffres sont dérivés de la grille réelle du foyer.** Si Senelec
change ses prix, la leçon change avec eux — aucun exemple ne peut se mettre à
mentir avec le temps.

---

## 5. La ventilation d'un lot — `allocation.ts`

« J'ai 9 ampoules » : personne ne les ajoute une par une. Mais en colocation,
4 éclairent le salon, 2 la chambre d'Awa, 3 celle de Moussa — sans quoi la
répartition de la facture est fausse.

`planAllocation` garantit que la somme des parts retombe sur le total et le dit
en français quand ce n'est pas le cas ; `balanceAllocation` verse au pot commun
ce que personne n'a réclamé. L'API crée alors **une ligne d'appareil par
groupe** : chaque ligne garde sa quantité, son propriétaire et son coût propre,
et la répartition n'a aucun cas particulier à gérer.

---

## Tests

```bash
npm run -w @woyofal/core test
```

Chaque règle de ce document a son test : conservation du crédit, recharge
oubliée, dérive, fractionnement autour du 1er, débordement à 145 kWh,
ventilation 4 + 2 + 3.
