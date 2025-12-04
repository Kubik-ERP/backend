# Gunakan image Node.js sebagai base
FROM node:22

# Install Chromium dan dependencies yang diperlukan untuk Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory dalam container
WORKDIR /app

# Salin package files terlebih dahulu untuk caching
COPY package*.json ./

# Install dependencies
RUN npm install --no-fund --no-audit

# Salin semua file proyek termasuk folder Prisma
COPY . .

# Pastikan folder prisma sudah ada
RUN ls -la prisma

# # Jalankan perintah Prisma
RUN npm run db:generate

# Build aplikasi
RUN npm run build

# Expose port aplikasi
EXPOSE 8080

# Set environment variable untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Jalankan aplikasi
CMD ["npm", "start"]