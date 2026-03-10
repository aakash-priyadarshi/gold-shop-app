FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ─── Install dependencies ───
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/team-api/package.json ./apps/team-api/
RUN pnpm install --frozen-lockfile --filter @gold-shop/team-api

# ─── Build ───
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/team-api/node_modules ./apps/team-api/node_modules
COPY apps/team-api/ ./apps/team-api/
WORKDIR /app/apps/team-api
RUN npx prisma generate
RUN npx nest build

# ─── Production ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/team-api/dist ./dist
COPY --from=build /app/apps/team-api/prisma ./prisma
COPY --from=build /app/apps/team-api/node_modules ./node_modules
COPY --from=deps /app/node_modules/.pnpm ./node_modules/.pnpm

EXPOSE 3002
CMD ["node", "dist/main.js"]
