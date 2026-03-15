# ─── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Prisma requires OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all source needed for workspace resolution
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies (dev included for build tools)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma client using the exact version that matches @prisma/client
WORKDIR /app/apps/api
RUN npx prisma@5.22.0 generate

# Build the NestJS app
RUN pnpm build

# ─── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Prisma requires OpenSSL at runtime too
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire node_modules from builder (avoids all pnpm symlink copy issues)
# This includes the .pnpm virtual store + all generated Prisma engine files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy compiled app
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy prisma schema (needed at runtime for migrations / db push)
COPY apps/api/prisma ./apps/api/prisma

# Copy package manifests (needed for module resolution)
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/main"]
