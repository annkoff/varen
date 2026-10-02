# syntax=docker/dockerfile:1
# Production image: Next.js standalone server + Prisma migrations on start.

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── deps + build ──
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_YANDEX_METRIKA_ID=""
ARG NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ENV NEXT_PUBLIC_YANDEX_METRIKA_ID=$NEXT_PUBLIC_YANDEX_METRIKA_ID NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npx prisma generate && npx next build

# ── runtime ──
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 STORAGE_LOCAL_DIR=/app/storage
RUN groupadd --system app && useradd --system --gid app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma ./prisma
# Prisma CLI for `migrate deploy` at start-up.
COPY --from=builder --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/storage && chown app:app /app/storage
USER app
EXPOSE 3000
VOLUME ["/app/storage"]
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
