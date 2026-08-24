# ---------------------------------------------------------------------------
# Image de production Woyofal Map
# ---------------------------------------------------------------------------
# Un seul conteneur sert TOUT : l'API et l'application web compilée. C'est le
# choix qui rend l'hébergement le plus simple et le moins cher — une seule
# chose à déployer, à surveiller et à payer.
#
# L'application mobile n'est PAS dans cette image : elle se compile chez Expo
# (`eas build`) et s'installe sur les téléphones. Elle appelle simplement l'API
# servie par ce conteneur.

# --- Étape 1 : construction ------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

# Le client Prisma a besoin d'OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker réutilise le
# cache de `npm ci` et la construction prend quelques secondes au lieu de
# plusieurs minutes.
#
# Les QUATRE manifestes d'espace de travail doivent être présents, y compris
# celui du mobile : npm refuse d'installer un projet dont le fichier de
# verrouillage mentionne un espace de travail absent du disque.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/

# On n'installe QUE ce que le serveur a besoin de compiler. Expo et React
# Native pèsent plusieurs centaines de mégaoctets et ne servent à rien ici.
RUN npm ci \
      --workspace @woyofal/core \
      --workspace @woyofal/api \
      --workspace @woyofal/web \
      --include-workspace-root

COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
    && npm run build

# --- Étape 2 : exécution ---------------------------------------------------
# Image neuve : ni sources, ni outils de compilation, ni dépendances de
# développement. Seulement ce qui tourne.
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 4000

# Le schéma est appliqué à la base au démarrage, puis le serveur se lance.
# `db push` est idempotent : au premier démarrage il crée les tables, ensuite
# il ne fait rien. Le catalogue, lui, est recopié par le serveur lui-même.
CMD ["sh", "-c", "npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate --accept-data-loss && node apps/api/dist/server.js"]
