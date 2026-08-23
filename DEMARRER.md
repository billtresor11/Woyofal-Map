# 🚀 Démarrer Woyofal Map — guide pas à pas

Ce guide s'adresse à quelqu'un qui **n'est pas développeur**. Comptez **10 minutes**,
dont 8 d'attente pendant que l'ordinateur travaille tout seul.

Vous n'avez rien à comprendre, juste à recopier une ligne.

---

## Étape 1 — Installer Node.js (une seule fois dans votre vie)

Node.js est le moteur qui fait tourner l'application. C'est gratuit et officiel.

1. Allez sur **https://nodejs.org**
2. Cliquez sur le gros bouton vert **« LTS »** (la version recommandée).
3. Ouvrez le fichier téléchargé et cliquez sur **Suivant → Suivant → Installer**.
   Ne changez aucune option.
4. Quand c'est fini, **redémarrez votre ordinateur** (ou au minimum, fermez toutes les
   fenêtres noires de terminal si vous en aviez).

> Si Node.js est déjà installé chez vous, passez directement à l'étape 2.

---

## Étape 2 — Mettre le dossier du projet quelque part de simple

Décompressez le dossier `woyofal-map` (clic droit → *Extraire tout*) et placez-le à un
endroit facile à retrouver, par exemple sur votre **Bureau**.

---

## Étape 3 — Ouvrir une fenêtre de commande DANS ce dossier

C'est l'étape qui surprend le plus. Il s'agit d'ouvrir une fenêtre où l'on tape du
texte, **positionnée dans le dossier du projet**.

**Sur Windows :**
1. Ouvrez le dossier `woyofal-map` dans l'explorateur de fichiers.
2. Cliquez dans la **barre d'adresse** en haut (là où s'affiche le chemin).
3. Tapez `cmd` puis appuyez sur **Entrée**.

Une fenêtre noire s'ouvre. C'est normal, c'est ce qu'on veut.

**Sur Mac :**
1. Ouvrez le dossier `woyofal-map` dans le Finder.
2. **Clic droit sur le dossier** → *Services* → **Nouveau terminal au dossier**.

*(Si vous ne voyez pas cette option : ouvrez l'application **Terminal**, tapez `cd `
— avec un espace après —, puis glissez-déposez le dossier dans la fenêtre et appuyez
sur Entrée.)*

---

## Étape 4 — Taper une seule ligne

Dans la fenêtre qui vient de s'ouvrir, tapez exactement ceci puis **Entrée** :

```
npm run demarrer
```

Puis **laissez faire**. L'ordinateur va télécharger ce dont il a besoin, préparer la
base de données et construire l'application. **Cela prend 2 à 5 minutes la première
fois.** Beaucoup de texte va défiler : c'est normal, ne fermez rien.

C'est terminé quand vous voyez apparaître :

```
  ✅  Woyofal Map est démarrée.

  👉  Ouvrez cette adresse dans votre navigateur :  http://localhost:4000
```

---

## Étape 5 — Ouvrir l'application

Ouvrez votre navigateur (Chrome, Edge, Safari…) et allez à l'adresse :

**http://localhost:4000**

L'application s'affiche. Un foyer de démonstration (« Maison Démo (Dakar) », 3 personnes,
9 appareils) est déjà rempli pour que vous puissiez tout essayer immédiatement.

💡 **Astuce** : l'application est conçue pour le téléphone. Dans Chrome, appuyez sur
**F12** puis sur la petite icône de téléphone en haut à gauche du panneau qui s'ouvre :
vous verrez l'application exactement comme sur un mobile.

---

## Pour arrêter, puis relancer plus tard

- **Arrêter** : revenez dans la fenêtre noire et appuyez sur **Ctrl + C**.
  (Vous pouvez ensuite fermer la fenêtre.)
- **Relancer** : rouvrez une fenêtre dans le dossier (étape 3) et tapez simplement :

```
npm start
```

Pas besoin de refaire toute l'installation : elle n'est nécessaire qu'une seule fois.
Vos données sont conservées d'une fois sur l'autre.

---

## L'ouvrir sur votre téléphone (facultatif)

Votre téléphone et votre ordinateur doivent être sur **le même réseau Wi-Fi**.

1. Trouvez l'adresse de votre ordinateur sur le réseau :
   - **Windows** : dans la fenêtre noire, tapez `ipconfig` et cherchez la ligne
     *Adresse IPv4* (quelque chose comme `192.168.1.14`).
   - **Mac** : tapez `ipconfig getifaddr en0`.
2. Sur votre téléphone, ouvrez le navigateur et allez à `http://192.168.1.14:4000`
   (en remplaçant par votre adresse).
3. Dans le menu du navigateur, choisissez **« Ajouter à l'écran d'accueil »**.
   L'application s'installe comme une vraie app, avec son icône. 💡

---

## Si quelque chose ne marche pas

| Message affiché | Ce qui se passe | Solution |
|---|---|---|
| `npm n'est pas reconnu` ou `command not found: npm` | Node.js n'est pas installé, ou la fenêtre a été ouverte avant l'installation | Refaites l'étape 1, **redémarrez l'ordinateur**, puis rouvrez une nouvelle fenêtre |
| `EADDRINUSE` ou `port already in use` | Un autre programme occupe déjà le port 4000 | Tapez `npm start` en ayant d'abord fermé l'ancienne fenêtre noire, ou utilisez un autre port : `PORT=4001 npm start` (Mac) / `set PORT=4001 && npm start` (Windows) |
| La page ne s'ouvre pas dans le navigateur | L'application n'est pas encore démarrée | Vérifiez que la fenêtre noire affiche bien le message ✅ ; sinon attendez, elle travaille encore |
| Vous vous êtes trompé de dossier | La commande ne trouve rien | Vérifiez que le fichier `package.json` est bien visible dans le dossier où vous avez ouvert la fenêtre |

En cas de doute : fermez tout, rouvrez une fenêtre dans le dossier, et retapez
`npm run demarrer`. La commande peut être relancée autant de fois que nécessaire sans
rien casser.
