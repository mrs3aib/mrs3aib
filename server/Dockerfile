# Explicit build for the API.
#
# Preferred over builder auto-detection: this repo has no package.json at its
# root, so a builder pointed at the repo root finds no Node project, produces
# an image without Node, and the build fails with `sh: 1: npm: not found`.
# A Dockerfile states the runtime outright.
#
# Node 22 matches `engines` in package.json — Prisma 6 and sharp 0.33 have
# prebuilt binaries for it.
FROM node:22-slim AS build

WORKDIR /app

# Dependencies first, so a source-only change reuses the install layer.
COPY package.json package-lock.json ./

# `--include=dev` matters: Railway sets NODE_ENV=production, which makes npm
# skip devDependencies — but typescript, tsc-alias, and every @types/* package
# live there, so `tsc` fails without them.
RUN npm ci --include=dev

# The schema must be present before `prisma generate`, and the generated client
# must exist before `tsc` compiles against its types.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime: production dependencies plus the compiled output.
# ---------------------------------------------------------------------------
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The generated Prisma client lives in node_modules and is not reproduced by
# `npm ci --omit=dev`, so it is carried over from the build stage along with
# the schema that `prisma migrate deploy` reads at startup.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# The `prisma` CLI is a devDependency, so `--omit=dev` above dropped it. The
# start command runs `migrate deploy`, so copy the CLI and its bin shim rather
# than let npx try to fetch it from the network on every boot.
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Railway injects PORT; this is only the documented default.
EXPOSE 4000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
