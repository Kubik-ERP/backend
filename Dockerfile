# ===== Stage 1: Builder =====
FROM node:22-slim AS builder
WORKDIR /app

# Copy package.json & lockfile dulu
COPY package*.json ./

# Install semua dependencies termasuk dev
RUN npm install --no-fund --no-audit

# Copy seluruh source code
COPY . .

# Prisma generate & build
RUN npx prisma generate
RUN npm run build

# ===== Stage 2: Production =====
FROM node:22-slim
WORKDIR /app

# Copy package.json & install hanya production dependencies
COPY package*.json ./
RUN npm install --production --omit=dev --no-fund --no-audit

# Copy hasil build & Prisma client dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main.js"]
