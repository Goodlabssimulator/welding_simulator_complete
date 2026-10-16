# ---------- Frontend: Vite build → Nginx ----------

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build with production env (API URL gets baked in at build time)
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

# Custom config with SPA fallback + API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
