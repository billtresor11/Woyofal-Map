# 📱 Woyofal Map — application mobile native

Application **React Native (Expo)**, iOS et Android, qui parle à la même API et
partage le même moteur de calcul que le web.

---

## Ce qui est partagé, et ce qui ne l'est pas

| Élément | Partagé avec le web ? | Où |
|---|---|---|
| Calcul des tranches, consommation, répartition, conseil de recharge | **Oui, à 100 %** | `packages/core` |
| Routes de l'API | **Oui** | `apps/api` |
| Catalogue des appareils | **Oui** | `packages/core/src/catalog.ts` |
| Couleurs, rayons, espacements | Recopiés | `src/theme.ts` |
| Composants d'interface | Non — React Native n'a pas de DOM | `src/ui.tsx` |

C'est la règle du projet : **aucun calcul n'est réécrit**. Si une formule
n'existe qu'à un seul endroit, les trois plateformes ne peuvent pas se
contredire — et une facture partagée entre colocataires ne pardonne pas un
écart de quelques francs.

---

## Démarrer

```bash
# 1. Compiler le moteur (l'application consomme packages/core/dist)
npm run -w @woyofal/core build

# 2. Lancer l'API sur votre machine
npm run -w @woyofal/api dev

# 3. Lancer l'application
npm run -w @woyofal/mobile start
```

Puis scannez le QR code avec **Expo Go** (App Store / Play Store).

> **Sur téléphone physique, `localhost` ne désigne pas votre ordinateur.**
> Remplacez `extra.apiUrl` dans `app.json` par l'adresse de votre machine sur
> le Wi-Fi (`http://192.168.1.14:4000`, à trouver avec `ipconfig` ou
> `ipconfig getifaddr en0`).

---

## Connexion Google

L'application utilise `expo-auth-session`, qui ouvre le **navigateur du
système** — Google refuse les WebView intégrées, et c'est aussi ce qui permet à
l'utilisateur de voir la vraie adresse `google.com`.

Dans la console Google Cloud, créez **trois** identifiants OAuth et reportez-les
dans `app.json` :

| Champ de `app.json` | Type d'identifiant à créer |
|---|---|
| `extra.googleClientIdIos` | Application iOS (bundle `sn.woyofalmap.app`) |
| `extra.googleClientIdAndroid` | Application Android (package `sn.woyofalmap.app`) |
| `extra.googleClientIdWeb` | Application Web (utilisé par Expo Go) |

Le jeton d'identité obtenu part vers `POST /api/auth/google`, **la même route
que le web**. Le serveur répond avec un jeton de session que l'application range
dans le trousseau sécurisé du téléphone (Keychain / Keystore) et présente
ensuite dans l'en-tête `Authorization`.

Tant que ces identifiants sont vides, l'écran de connexion l'affiche clairement
au lieu de proposer un bouton qui ne marcherait pas.

---

## Compiler une vraie application

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # APK à installer directement
eas build --platform ios                          # nécessite un compte Apple Developer
```

---

## Points de vigilance

- **Toujours recompiler `@woyofal/core`** avant de démarrer : Metro lit
  `packages/core/dist`, pas les sources TypeScript.
- **Pas d'extension `.js` dans les imports relatifs.** Le web l'exige (ESM
  strict), Metro l'interdit. Les fichiers de `apps/mobile` s'importent donc sans
  extension.
- `metro.config.js` doit garder `watchFolders` sur la racine du dépôt : sans
  lui, le moteur partagé devient introuvable.
