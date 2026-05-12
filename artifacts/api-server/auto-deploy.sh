#!/bin/bash
# auto-deploy.sh — ตรวจ git ทุก 60 วินาที ถ้ามี commit ใหม่ → pull + rebuild + restart

APP_DIR="/app"
LOG_FILE="$APP_DIR/auto-deploy.log"
MAX_LOG_LINES=500

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

trim_log() {
  if [ -f "$LOG_FILE" ]; then
    tail -n $MAX_LOG_LINES "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
}

log "🚀 auto-deploy เริ่มทำงาน"

while true; do
  cd "$APP_DIR" || { log "❌ ไม่พบ $APP_DIR"; sleep 60; continue; }

  git fetch origin main --quiet 2>/dev/null

  LOCAL=$(git rev-parse HEAD 2>/dev/null)
  REMOTE=$(git rev-parse origin/main 2>/dev/null)

  if [ "$LOCAL" != "$REMOTE" ]; then
    log "📦 พบ commit ใหม่: $REMOTE — เริ่ม deploy..."

    git fetch origin main --quiet 2>/dev/null
    # backup data ก่อน reset เพื่อไม่ให้ข้อมูลหาย
    DATA_DIR="$APP_DIR/artifacts/api-server/data"
    BACKUP_DIR="/tmp/api-data-backup-$$"
    if [ -d "$DATA_DIR" ]; then
      cp -r "$DATA_DIR" "$BACKUP_DIR"
      log "  💾 backup data → $BACKUP_DIR"
    fi
    git reset --hard origin/main 2>&1 | while read -r line; do log "  git: $line"; done
    # restore data หลัง reset
    if [ -d "$BACKUP_DIR" ]; then
      cp -r "$BACKUP_DIR/." "$DATA_DIR/"
      log "  ✅ restore data สำเร็จ"
    fi

    log "🔨 Build API server..."
    cd "$APP_DIR/artifacts/api-server" && pnpm run build 2>&1 | tail -5 | while read -r line; do log "  build: $line"; done

    log "🔨 Build frontend dashboard..."
    cd "$APP_DIR/artifacts/line-dashboard" && pnpm run build 2>&1 | tail -5 | while read -r line; do log "  frontend: $line"; done

    log "🔄 Restart PM2 processes..."
    pm2 restart line-dashboard-api 2>&1 | grep -E "✓|Error" | while read -r line; do log "  pm2: $line"; done

    log "✅ Deploy เสร็จ (commit: ${REMOTE:0:8})"
    trim_log
  fi

  sleep 60
done
