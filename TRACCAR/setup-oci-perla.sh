#!/bin/bash
# ==============================================================================
# Traccar — Script de Aprovisionamiento para Instancia Perla (Subred Privada OCI)
# Ubuntu 24.04 LTS ARM64 (aarch64)
# ==============================================================================

set -e

echo "🚀 Iniciando configuración de Perla (Traccar en OCI)..."

# 1. Actualización del sistema
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release iptables-persistent

# 2. Configurar Firewall / iptables para permitir tráfico desde Rose Diamond (10.0.0.180) y la subred pública
sudo iptables -I INPUT -s 10.0.0.0/24 -p tcp --dport 22 -j ACCEPT
sudo iptables -I INPUT -s 10.0.0.0/24 -p tcp --dport 8082 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5000:5150 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 5000:5150 -j ACCEPT
sudo netfilter-persistent save

# 3. Instalar Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
fi

sudo usermod -aG docker ubuntu

# 4. Directorio de Traccar
sudo mkdir -p /opt/traccar-server
sudo chown -R ubuntu:docker /opt/traccar-server
sudo chmod -R 775 /opt/traccar-server

echo "✅ Perla configurada con éxito. Lista para iniciar Traccar con docker-compose."
