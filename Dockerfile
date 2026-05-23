# --- Стейдж 1: Сборка ---
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем package.json файлы всей монорепы
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/

# Устанавливаем зависимости
RUN npm ci

# Копируем весь исходный код
COPY . .

# Собираем фронтенд (ограничиваем до 1 процесса для экономии ресурсов)
RUN npm run build -- --filter=web -- --concurrency=1

# --- Стейдж 2: Продакшн ---
FROM nginx:alpine

# Копируем конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранные файлы из первого стейджа
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
