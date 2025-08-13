# ===== STAGE 1: Build =====
FROM node:22-slim AS builder
WORKDIR /app

# Copy package.json & lockfile dulu biar cache install aman
COPY package*.json ./
RUN npm install --production=false --no-fund --no-audit

# Copy seluruh source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build app
RUN npm run build

# ===== STAGE 2: Production =====
FROM node:22-slim
WORKDIR /app

# Copy only package.json & install production deps
COPY package*.json ./
RUN npm install --production --no-fund --no-audit

# Copy hasil build & Prisma client dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main.js"]
