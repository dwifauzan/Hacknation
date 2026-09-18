FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject build args dari docker-compose
ARG VITE_WA_API_URL
ARG VITE_WS_URL
ARG VITE_LARAVEL_API_URL

ENV VITE_WA_API_URL=$VITE_WA_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_LARAVEL_API_URL=$VITE_LARAVEL_API_URL

RUN npm run build

# Serve menggunakan Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Reverse proxy /api, /wa, /ws + SPA fallback (lihat nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
