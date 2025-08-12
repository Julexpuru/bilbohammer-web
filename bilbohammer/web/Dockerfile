# web/Dockerfile
FROM node:20-bookworm-slim

# Opcional pero recomendable: utilidades que Prisma/Next suelen agradecer
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar deps con npm
COPY package.json ./
RUN npm install

# Copiar el resto del código
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
