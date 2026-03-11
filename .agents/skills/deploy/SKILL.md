---
name: Deploy
description: How to deploy the Tec360 Seguridad application to production.
---

# Deploying Tec360 Seguridad

## Automatic Deploy (CI/CD)

The project uses **GitHub Actions** (`.github/workflows/deploy.yml`).

**Trigger**: Push to `master` branch.

**Pipeline**:
1. Build Docker images for `backend` and `frontend`
2. Push to GitHub Container Registry (`ghcr.io`)
3. SSH into the production server
4. Pull latest images and restart services (including `nginx`)

```bash
# What the CI does on the server:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d backend frontend nginx
```

## Manual Deploy

If you need to deploy manually:

```bash
# SSH into the server
ssh user@your-server

# Navigate to the project
cd /opt/tec360-seguridad

# Pull latest changes
git pull origin master

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## First-Time Server Setup

1. Run `setup-server.sh` to install Docker and dependencies
2. Copy `.env.production.example` to `.env.production` and fill in values
3. Set up SSL:
   ```bash
   # Start nginx on port 80 first (for ACME challenge)
   docker compose -f docker-compose.prod.yml up -d nginx
   
   # Get SSL certificate
   docker compose -f docker-compose.prod.yml run --rm certbot \
     certonly --webroot -w /var/www/certbot \
     -d your-domain.com --email your@email.com --agree-tos
   
   # Restart nginx with SSL
   docker compose -f docker-compose.prod.yml restart nginx
   ```

## Services Architecture

```
Internet → Nginx (80/443) → Frontend (3000) / Backend API (8000)
                           → Static uploads (/uploads/)
                           → WebSocket (/api/ws/)
```

## Database Backups

```bash
# Backup
docker exec tec360_db pg_dump -U tec360 tec360 > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i tec360_db psql -U tec360 tec360 < backup.sql
```

## Monitoring

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx

# Check service health
docker compose -f docker-compose.prod.yml ps
```
