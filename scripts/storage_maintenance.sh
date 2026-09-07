#!/bin/bash
# Weekly Docker maintenance & cleanup
LOG_FILE="/var/log/tec360_maintenance.log"
echo "$(date) [tec360-maintenance] Starting weekly Docker prune..." >> "$LOG_FILE"
docker builder prune -f --keep-storage 2GB >> "$LOG_FILE" 2>&1
docker image prune -f >> "$LOG_FILE" 2>&1
echo "$(date) [tec360-maintenance] Weekly maintenance completed." >> "$LOG_FILE"
