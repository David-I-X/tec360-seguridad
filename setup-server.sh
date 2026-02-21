#!/bin/bash
# ============================================
# Tec360 Seguridad — Server Setup Script
# Run this on a fresh Ubuntu 24.04 Droplet
# Usage: sudo bash setup-server.sh
# ============================================

set -e

echo "🚀 Tec360 — Setting up production server..."

# --- 1. System update ---
echo "📦 Updating system..."
apt update && apt upgrade -y

# --- 2. Install Docker ---
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# --- 3. Create deploy user ---
echo "👤 Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/deploy
fi

# --- 4. Firewall ---
echo "🔒 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --- 5. Swap (for 2GB droplet) ---
echo "💾 Setting up swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- 6. Clone repo ---
echo "📁 Setting up project directory..."
PROJECT_DIR="/opt/tec360-seguridad"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
    chown deploy:deploy $PROJECT_DIR
    echo "⚠️  Clone your repo: git clone <URL> $PROJECT_DIR"
else
    echo "✅ Project directory exists"
fi

echo ""
echo "============================================"
echo "✅ Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. su - deploy"
echo "  2. git clone YOUR_REPO_URL /opt/tec360-seguridad"
echo "  3. cd /opt/tec360-seguridad"
echo "  4. cp .env.production.example .env.production"
echo "  5. nano .env.production  (fill in real values)"
echo "  6. cp nginx/nginx-initial.conf nginx/nginx.conf  (HTTP only first)"
echo "  7. docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo "  8. docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN --email YOUR_EMAIL --agree-tos"
echo "  9. cp nginx/nginx.conf.ssl nginx/nginx.conf  (switch to HTTPS)"
echo "  10. Replace YOUR_DOMAIN in nginx/nginx.conf with your domain"
echo "  11. docker compose -f docker-compose.prod.yml restart nginx"
echo ""
