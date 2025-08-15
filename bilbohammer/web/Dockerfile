# Dockerfile — para proyecto con app dentro de ./web
# Genera Prisma Client en build y garantiza generación al arrancar.

FROM node:20-alpine AS deps
WORKDIR /app/web

# Copiamos package.json/lock y el schema antes de instalar para que generate funcione
COPY web/package.json web/package-lock.json* ./
COPY web/prisma ./prisma

# Instala deps (incluye dev) y genera Prisma Client
RUN npm ci
RUN npx prisma generate

# ----- Builder -----
FROM node:20-alpine AS builder
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/web/node_modules ./node_modules
COPY web ./

RUN npm run build

# ----- Runner -----
FROM node:20-alpine AS runner
WORKDIR /app/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copiamos artefactos y deps ya resueltas
COPY --from=builder /app/web/.next ./.next
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/package.json ./package.json
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/prisma ./prisma

# Entry que vuelve a ejecutar prisma generate por si hay volúmenes que lo pisan
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]