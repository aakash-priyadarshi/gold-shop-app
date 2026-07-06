FROM node:20-slim

# Force cache invalidation — this file changes every commit
RUN date > /etc/build-timestamp

# Prisma requires OpenSSL and we need PostgreSQL 18 client to match Railway's database
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" > /etc/apt/sources.list.d/postgresql.list \
    && apt-get update \
    && apt-get install -y openssl postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Clone private submodule (Railway doesn't checkout submodules automatically)
# SUBMODULE_PAT is a Railway build variable — a GitHub PAT with read access to gold-shop-core
ARG SUBMODULE_PAT
RUN if [ ! -f apps/api/src/modules/core/subscriptions/subscription-plans.module.ts ] && [ -n "$SUBMODULE_PAT" ]; then \
      rm -rf apps/api/src/modules/core && \
      git clone https://${SUBMODULE_PAT}@github.com/aakash-priyadarshi/gold-shop-core.git apps/api/src/modules/core; \
    fi

# Install all dependencies (dev included — needed for @nestjs/cli and prisma)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Switch into the api app context
WORKDIR /app/apps/api

# Generate Prisma client (pinned to match @prisma/client@5.22.0 in package.json)
RUN npx prisma@5.22.0 generate

# Build using the locally installed nest CLI (via pnpm exec to guarantee local binary)
RUN pnpm exec nest build

# Verify dist/src/main.js was produced (tsc outputs to dist/src/ because tsconfig includes both src/ and prisma/)
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found! Listing dist/:" && ls -laR dist/ && exit 1)

# Create a non-root user for runtime security
# Note: We create the user but don't switch to it because prisma migrate
# and npx need write access to npm/prisma cache directories.
# TODO: Configure npm/prisma cache dirs with proper permissions to run as non-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
# USER appuser  # Re-enable after configuring cache directory permissions

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
