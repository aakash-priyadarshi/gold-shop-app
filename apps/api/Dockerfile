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

# Install all dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma client (pinned to match @prisma/client@5.22.0)
WORKDIR /app/apps/api
RUN npx prisma@5.22.0 generate

# Build the NestJS application directly (avoid pnpm walking up to run turbo)
RUN npx nest build

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/main"]
