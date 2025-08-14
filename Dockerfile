# ===== Stage 2: Production =====
FROM node:22-slim AS builder
WORKDIR /app

# Install OpenSSL agar Prisma bisa jalan
RUN apt-get update -y && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package.json & install hanya production dependencies
COPY package*.json ./
RUN npm install --production --omit=dev --ignore-scripts --no-fund --no-audit

# Copy hasil build & Prisma client dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/main.js"]
