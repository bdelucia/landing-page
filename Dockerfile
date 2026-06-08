# Multi-stage build for Raspberry Pi (linux/arm64) or amd64 — same Dockerfile.
# On the Pi, ensure src/data/secrets.local.ts exists before `docker compose build`
# so API keys are baked into the server bundle (file is gitignored).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
# No svelte.config.js yet — skip lifecycle scripts (prepare / svelte-kit sync)
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
WORKDIR /app
COPY . .
# Full tree present: esbuild postinstall (onlyBuiltDependencies in package.json) + prepare
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "build"]
