#!/bin/sh
set -e

# Nos aseguramos de estar en la carpeta correcta (tu app vive en /app/web)
cd /app/web

# Garantiza que Prisma Client exista aunque un volumen sustituya node_modules
npx prisma generate || true

if [ "$NODE_ENV" = "production" ]; then
  npm run start
else
  npm run dev
fi