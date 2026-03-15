FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Chromium + virtual display + audio for Google Meet bot (Puppeteer)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ─── Install dependencies ───
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile

# ─── Build ───
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npx nest build

# ─── Production ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Chromium, Xvfb (virtual display), and PulseAudio (virtual audio)
# Required for Google Meet bot — WebRTC needs a display + audio device
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    chromium \
    xvfb \
    xauth \
    pulseaudio \
    ffmpeg \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3002
ENV PORT=3002

# Start Xvfb + PulseAudio as background daemons (failures are tolerated —
# Google Meet bot is optional; the API must start regardless).
# xvfb-run is NOT used because it's a synchronous wrapper that kills the container
# if the X server fails to start in restricted sandbox environments (Railway).
CMD ["sh", "-c", \
    "Xvfb :99 -screen 0 1280x720x24 -nolisten tcp 2>/dev/null & \
     pulseaudio --start --exit-idle-time=-1 2>/dev/null || true; \
     sleep 0.5; \
     exec node dist/main.js"]
