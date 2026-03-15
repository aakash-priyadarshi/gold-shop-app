FROM node:20-slim

# Prisma requires OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies (dev included — needed for @nestjs/cli and prisma)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Switch into the api app context
WORKDIR /app/apps/api

# Generate Prisma client (pinned to match @prisma/client@5.22.0 in package.json)
RUN npx prisma@5.22.0 generate

# Build using the locally installed nest CLI (via pnpm exec to guarantee local binary)
RUN pnpm exec nest build

# Verify dist/main.js was actually produced — fail fast if not
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found after nest build!" && ls -la dist/ && exit 1)

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Use absolute path to eliminate any WORKDIR ambiguity
CMD ["node", "/app/apps/api/dist/main"]
