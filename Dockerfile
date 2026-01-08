# Gold Shop API - Production Dockerfile
# Using Debian-based image for Prisma OpenSSL compatibility
FROM node:18-slim AS builder

# Install build dependencies including OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy packages (shared library)
COPY packages/ ./packages/

# Copy API source
COPY apps/api/ ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

# Production stage - Debian slim for Prisma compatibility
FROM node:18-slim AS runner

# Install runtime dependencies for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire built workspace to preserve node_modules structure
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "dist/src/main.js"]
