# Gunakan image Node.js sebagai base
FROM node:22

# Set working directory dalam container
WORKDIR /app

# Salin code ke dalam container
COPY ./ ./

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

# Jalankan aplikasi
CMD ["npm", "start"]