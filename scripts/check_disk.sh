#!/bin/bash
set -eo pipefail

THRESHOLD_WARN=80
THRESHOLD_CRIT=90
LOG_TAG="[tec360-disk-sentinel]"
LOG_FILE="/var/log/tec360_disk.log"

CURRENT_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

echo "$(date) $LOG_TAG Root disk usage: ${CURRENT_USAGE}%" >> "$LOG_FILE"

if [ "$CURRENT_USAGE" -ge "$THRESHOLD_CRIT" ]; then
    echo "$(date) $LOG_TAG CRITICAL: Disk usage at ${CURRENT_USAGE}% (>= ${THRESHOLD_CRIT}%). Running emergency prune!" >> "$LOG_FILE"
    docker builder prune -f >> "$LOG_FILE" 2>&1
    docker image prune -a -f --filter "until=168h" >> "$LOG_FILE" 2>&1
    NEW_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    echo "$(date) $LOG_TAG Emergency prune complete. New disk usage: ${NEW_USAGE}%" >> "$LOG_FILE"
elif [ "$CURRENT_USAGE" -ge "$THRESHOLD_WARN" ]; then
    echo "$(date) $LOG_TAG WARNING: Disk usage at ${CURRENT_USAGE}% (>= ${THRESHOLD_WARN}%). Running standard image cleanup." >> "$LOG_FILE"
    docker image prune -f >> "$LOG_FILE" 2>&1
fi
