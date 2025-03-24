# Gunakan image Node.js sebagai base
FROM node:22

# Aktifkan corepack untuk menggunakan pnpm
RUN corepack enable

# Set working directory dalam container
WORKDIR /app

# Salin file package.json dan pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies menggunakan pnpm
RUN pnpm install --frozen-lockfile

# Salin semua file proyek ke dalam container
COPY . .

# Build aplikasi
RUN pnpm build

# Expose port aplikasi
EXPOSE 8080

# Jalankan aplikasi
CMD ["pnpm", "start:prod"]