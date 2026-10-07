# Deployment Guide

## Intelligent Welding Training Simulator

---

## Prerequisites

- **Node.js** 18+ and npm 9+
- **PostgreSQL** 14+
- **Git**
- A modern web browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)

---

## 1. Database Setup

### Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@14
brew services start postgresql@14

# Windows: Download installer from https://www.postgresql.org/download/windows/
```

### Create Database & User

```bash
sudo -u postgres psql
```

```sql
CREATE USER welding_admin WITH PASSWORD 'your_secure_password';
CREATE DATABASE welding_simulator OWNER welding_admin;
GRANT ALL PRIVILEGES ON DATABASE welding_simulator TO welding_admin;
\q
```

### Run Schema Migration

```bash
cd database
psql -U welding_admin -d welding_simulator -f schema.sql
```

This creates all tables: `users`, `welding_sessions`, `telemetry_data`, `assessments`, `competency_records`, `learning_analytics`, and associated indexes.

---

## 2. Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example.js .env
```

Edit `.env` with your settings:

```
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=welding_simulator
DB_USER=welding_admin
DB_PASSWORD=your_secure_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT
JWT_SECRET=your_long_random_secret_key_change_this
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Start the Server

```bash
# Development
npm run dev

# Production
NODE_ENV=production node src/server.js
```

### Using PM2 for Process Management (Recommended for Production)

```bash
npm install -g pm2
pm2 start src/server.js --name welding-api
pm2 save
pm2 startup
```

---

## 3. Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Environment Configuration

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

### Build for Production

```bash
npm run build
```

This produces an optimized build in `frontend/build/`.

### Serve the Build

```bash
# Using serve
npm install -g serve
serve -s build -l 3000

# Or configure Nginx (see below)
```

---

## 4. Nginx Reverse Proxy (Production)

### Install Nginx

```bash
sudo apt install nginx
```

### Configuration

Create `/etc/nginx/sites-available/welding-simulator`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/welding-simulator/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/welding-simulator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 5. Docker Deployment (Alternative)

### Docker Compose

Create `docker-compose.yml` at the project root:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: welding_simulator
      POSTGRES_USER: welding_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U welding_admin"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: welding_simulator
      DB_USER: welding_admin
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      db:
        condition: service_healthy

  web:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  pgdata:
```

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Launch

```bash
docker-compose up -d
```

---

## 6. Data Seeding (Optional)

For demo or testing, seed the database with sample data:

```sql
-- Insert sample trainer
INSERT INTO users (name, email, password_hash, role)
VALUES ('Trainer Admin', 'trainer@tvet.ac.ke', '$2b$10$HASH_HERE', 'trainer');

-- Insert sample students
INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Alice Mwangi', 'alice@tvet.ac.ke', '$2b$10$HASH_HERE', 'student'),
  ('Brian Ochieng', 'brian@tvet.ac.ke', '$2b$10$HASH_HERE', 'student');
```

Use the registration endpoint to create real users (passwords will be hashed automatically).

---

## 7. Health Check & Monitoring

### API Health Endpoint

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status": "ok", "uptime": 12345, "database": "connected"}
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs welding-api

# Docker logs
docker-compose logs -f api
```

---

## 8. Backup Strategy

### Database Backup

```bash
# Manual backup
pg_dump -U welding_admin welding_simulator > backup_$(date +%Y%m%d).sql

# Cron job for daily backups
0 2 * * * pg_dump -U welding_admin welding_simulator | gzip > /backups/welding_$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
psql -U welding_admin welding_simulator < backup_20250814.sql
```

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection refused | Verify PostgreSQL is running: `sudo systemctl status postgresql` |
| JWT errors | Ensure `JWT_SECRET` is set and consistent across restarts |
| WebSocket disconnections | Check Nginx proxy headers for `Upgrade` support |
| Frontend blank page | Verify `REACT_APP_API_URL` was set before build |
| CORS errors | Ensure `CORS_ORIGIN` matches your frontend URL |
| Canvas not responsive | Clear browser cache, check for JavaScript console errors |

---

## 10. Security Checklist

- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable HTTPS via Let's Encrypt
- [ ] Set `NODE_ENV=production`
- [ ] Configure rate limiting (express-rate-limit recommended)
- [ ] Enable CORS only for your domain
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Restrict database access to application server only
- [ ] Enable PostgreSQL SSL connections for remote databases
- [ ] Set up automated database backups
