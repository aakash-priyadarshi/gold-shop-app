FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# Install only the frontend workspace and its shared package dependency first
# so this layer is reused unless dependency manifests change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --filter gold-shop-web... --frozen-lockfile --ignore-scripts

COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Browser-visible values are compiled into the Next.js client bundle. Railway
# supplies their values as service variables at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MOBILE_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_CDN_UPLOAD_URL
ARG NEXT_PUBLIC_IMAGE_WORKER_URL
ARG NEXT_PUBLIC_MEDIA_CDN_BASE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MOBILE_SITE_URL=$NEXT_PUBLIC_MOBILE_SITE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_CDN_UPLOAD_URL=$NEXT_PUBLIC_CDN_UPLOAD_URL \
    NEXT_PUBLIC_IMAGE_WORKER_URL=$NEXT_PUBLIC_IMAGE_WORKER_URL \
    NEXT_PUBLIC_MEDIA_CDN_BASE_URL=$NEXT_PUBLIC_MEDIA_CDN_BASE_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN pnpm --filter @gold-shop/shared build \
    && pnpm --filter gold-shop-web build

FROM node:20-slim AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Next's standalone output preserves the monorepo path (`apps/web`). Keep
# public assets and static chunks beside that generated server.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
