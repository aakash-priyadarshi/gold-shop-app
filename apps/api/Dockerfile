FROM node:20-slim AS base

# Prisma requires OpenSSL and we need PostgreSQL 18 client to match Railway's database
# git is needed to clone the private gold-shop-core submodule
RUN apt-get update && apt-get install -y curl ca-certificates gnupg git \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" > /etc/apt/sources.list.d/postgresql.list \
    && apt-get update \
    && apt-get install -y openssl postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

FROM base AS build

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Clone private submodule (Railway doesn't checkout submodules automatically).
# Always pin to the SHA recorded in apps/api/core-submodule.sha — cloning the
# default branch (master) silently ships an older gold-shop-core than the
# parent gitlink, which drops new FEATURE_LABELS such as workshopManufacturing.
ARG SUBMODULE_PAT
COPY apps/api/core-submodule.sha /tmp/core-submodule.sha
COPY apps/api/scripts/clone-core.sh /tmp/clone-core.sh
# Keep the build arg out of the logged RUN instruction, and remove Git metadata
# (including the temporary authenticated remote) before creating the image.
RUN sh /tmp/clone-core.sh

# Install all dependencies (dev included — needed for @nestjs/cli and prisma)
RUN pnpm install --frozen-lockfile --ignore-scripts
# sharp's native binary is required to convert WebP shop logos for pdfkit
RUN pnpm --filter @gold-shop/api rebuild sharp

# Switch into the api app context
WORKDIR /app/apps/api

# Generate Prisma client (pinned to match @prisma/client@5.22.0 in package.json)
RUN npx prisma@5.22.0 generate

# Build shared workspace package (API imports @gold-shop/shared, not source paths)
WORKDIR /app
RUN pnpm --filter @gold-shop/shared build
WORKDIR /app/apps/api

# Build using the locally installed nest CLI (via pnpm exec to guarantee local binary)
RUN pnpm exec nest build

# Verify dist/src/main.js was produced (must stay under apps/api/dist/src — not monorepo-root dist/)
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found! Listing dist/:" && ls -laR dist/ && exit 1)

# The credential-bearing ARG is scoped to the build stage; the runtime image
# contains only its output, never the build-stage history or Git metadata.
FROM base AS runtime
COPY --from=build /app /app
WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Health check — verifies the API is responding on the configured port
# Uses curl (installed in the base image) since wget is not available in node:20-slim
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:3001/api/health || exit 1

# Run pending migrations then start the server.
# prisma migrate deploy is idempotent – safe to run on every container start.
CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy && node /app/apps/api/dist/src/main"]
