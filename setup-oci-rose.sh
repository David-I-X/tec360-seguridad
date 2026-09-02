#!/bin/bash
# ==============================================================================
# Tec360 Seguridad — Script de Aprovisionamiento para Instancia Rose Diamond
# Oracle Cloud Infrastructure (OCI) — Ubuntu 24.04 LTS ARM64 (aarch64)
# ==============================================================================

set -e

echo "🚀 Iniciando configuración de Rose Diamond (Tec360 en OCI)..."

# 1. Actualización del sistema
echo "📦 Actualizando paquetes del sistema..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release iptables-persistent netfilter-persistent

# 2. Configurar Firewall / iptables en Oracle Cloud
# NOTA: Ubuntu en OCI viene con reglas estrictas en iptables que bloquean puertos 80/443
echo "🔒 Configurando reglas de firewall e iptables para OCI..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
# Permitir comunicación interna con la subred privada de Perla (10.0.1.0/24)
sudo iptables -I INPUT -s 10.0.1.0/24 -j ACCEPT
sudo iptables -I INPUT -s 10.0.0.0/24 -j ACCEPT

# Guardar reglas persistentes
sudo netfilter-persistent save

# 3. Instalar Docker oficial para ARM64
echo "🐳 Instalando Docker Engine y Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
fi

# Agregar usuario ubuntu al grupo docker
sudo usermod -aG docker ubuntu

# 4. Crear usuario 'deploy' para CI/CD de GitHub Actions
echo "👤 Configurando usuario deploy..."
if ! id "deploy" &>/dev/null; then
    sudo adduser --disabled-password --gecos "" deploy
    sudo usermod -aG docker deploy
    sudo mkdir -p /home/deploy/.ssh
    sudo cp /home/ubuntu/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    sudo chown -R deploy:deploy /home/deploy/.ssh
    sudo chmod 700 /home/deploy/.ssh
    sudo chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy
fi

# 5. Configurar directorio del proyecto
echo "📁 Configurando directorio /opt/tec360-seguridad..."
sudo mkdir -p /opt/tec360-seguridad
sudo chown -R ubuntu:docker /opt/tec360-seguridad
sudo chmod -R 775 /opt/tec360-seguridad

# 6. Configurar Swap (4GB de respaldo para 12GB RAM)
echo "💾 Verificando memoria Swap..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo ""
echo "=================================================================="
echo "✅ ¡Configuración de Rose Diamond completada exitosamente!"
echo "=================================================================="
echo "IP Pública: 157.137.224.103"
echo "IP Privada: 10.0.0.180"
echo ""
