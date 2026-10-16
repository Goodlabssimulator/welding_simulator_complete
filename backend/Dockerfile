# ---------- Backend: Node.js API ----------
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src
COPY config ./config

# Environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
