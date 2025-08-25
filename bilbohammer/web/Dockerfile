# syntax=docker/dockerfile:1

############################
# Stage: deps
############################
FROM node:20-alpine AS deps
WORKDIR /app

# Instala dependencias con lockfile si existe
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copia el schema de Prisma y genera el client (útil para builder/runner)
COPY prisma ./prisma
RUN npx prisma generate

############################
# Stage: builder
############################
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Trae node_modules desde deps para poder build
COPY --from=deps /app/node_modules ./node_modules

# Copia el código de la app (todo el contexto ./web)
COPY . .

# Build de Next.js
RUN npm run build

############################
# Stage: runner (producción)
############################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Artefactos de build + deps ya resueltas
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Prisma schema (no pesa y evita sorpresas en runtime)
COPY prisma ./prisma

EXPOSE 3000

# En producción usaría "npm start", pero en dev lo sobreescribe docker-compose
CMD ["npm", "start"]
