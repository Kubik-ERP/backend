# Gunakan image Node.js sebagai base
FROM node:22

# Set working directory dalam container
WORKDIR /app

# Salin package.json dan package-lock.json (kalau ada)
COPY package.json ./

# Install dependencies
RUN npm install --no-fund --no-audit

# Salin semua file proyek ke dalam container
COPY . .

# Build aplikasi
RUN npm run build

# Expose port aplikasi
EXPOSE 8080

# Jalankan aplikasi
CMD ["npm", "start"]