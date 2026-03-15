# Gold Shop Team API - Production Dockerfile
# Builds apps/team-api (AI Sales, Google Meet bot, etc.)
FROM node:20-slim AS base

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# ─── Install dependencies ───
FROM base AS deps
WORKDIR /app
COPY apps/team-api/package.json ./
RUN pnpm install --no-frozen-lockfile

# ─── Build ───
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/team-api/ .
RUN npx prisma generate
RUN npx nest build

# ─── Production ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99

# Chromium + Xvfb (virtual display) + PulseAudio (virtual audio)
# Required for Google Meet bot — WebRTC needs a display + audio device
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    chromium \
    xvfb \
    xauth \
    pulseaudio \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY apps/team-api/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3002
ENV PORT=3002

# Start Xvfb (virtual display) + PulseAudio before the app
CMD xvfb-run --server-args="-screen 0 1280x720x24" \
    sh -c 'pulseaudio --start --exit-idle-time=-1 2>/dev/null; ./start.sh'
