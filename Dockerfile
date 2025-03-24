# Gunakan image Node.js sebagai base
FROM node:22

# Set working directory dalam container
WORKDIR /app

# Install dependencies menggunakan npm
RUN npm ci

# Salin semua file proyek ke dalam container
COPY . .

# Build aplikasi
RUN npm run build

# Expose port aplikasi
EXPOSE 8080

# Jalankan aplikasi
CMD ["npm", "run", "start:prod"]