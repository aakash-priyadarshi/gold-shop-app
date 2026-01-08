# Gold Shop API - Production Dockerfile
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat

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

# Verify build output exists
RUN ls -la dist/ && test -f dist/main.js

# Production stage
FROM node:18-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma

# Verify files are copied
RUN ls -la dist/

# Expose port
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Start the application directly with node
CMD ["node", "dist/main.js"]
