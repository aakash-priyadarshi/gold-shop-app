# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps for workspace resolution
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install ALL dependencies (including dev for build tools)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma client (from apps/api context)
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the API
RUN pnpm build

# Production stage
FROM node:18-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy prisma schema so we can run prisma generate
COPY apps/api/prisma ./apps/api/prisma

# Re-run prisma generate in runner using npx (downloads prisma CLI transiently)
# This is needed because pnpm hoists prisma client to the pnpm store which isn't copyable
WORKDIR /app/apps/api
RUN npx --yes prisma generate

# Copy compiled application from builder
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Run the app
CMD ["node", "dist/main"]
