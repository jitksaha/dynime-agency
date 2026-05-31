# ── NestJS Backend ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --prefer-offline

COPY backend/ ./
RUN npm run build

# ── Production image ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --prefer-offline

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main.js"]
