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

    DATA_SRC="$APP_DIR/artifacts/api-server/data"
    DATA_BACKUP=$(mktemp -d)

    # ── 1. backup เฉพาะไฟล์ที่ต้องการเก็บ (ไม่รวม LINE accounts) ─────────────
    KEEP_FILES=(
      "websites.json"
      "backup-groups.json"
      "backup-accounts-main.json"
      "backup-accounts-deposit.json"
      "backup-accounts-pending.json"
      "schedules.json"
      "deleted-lines.json"
    )
    if [ -d "$DATA_SRC" ]; then
      for f in "${KEEP_FILES[@]}"; do
        [ -f "$DATA_SRC/$f" ] && cp "$DATA_SRC/$f" "$DATA_BACKUP/$f" 2>/dev/null || true
      done
      log "  💾 backup เฉพาะไฟล์ config/backup pool → $DATA_BACKUP"
    fi

    # ── 2. clear index ────────────────────────────────────────────────────────
    git update-index --no-skip-worktree -- $(git ls-files artifacts/api-server/data/) 2>/dev/null || true
    git checkout -- artifacts/api-server/data/ 2>/dev/null || true

    # ── 3. reset ──────────────────────────────────────────────────────────────
    git reset --hard origin/main 2>&1 | while read -r line; do log "  git: $line"; done

    # ── 4. restore เฉพาะไฟล์ที่ backup ไว้ ───────────────────────────────────
    mkdir -p "$DATA_SRC"
    for f in "${KEEP_FILES[@]}"; do
      [ -f "$DATA_BACKUP/$f" ] && cp "$DATA_BACKUP/$f" "$DATA_SRC/$f" 2>/dev/null || true
    done
    # discovered-lines.json และ suspended-lines.json รีเซ็ตเป็นค่าว่างเสมอ
    echo '{}' > "$DATA_SRC/discovered-lines.json"
    echo '[]' > "$DATA_SRC/suspended-lines.json"
    log "  ✅ restore config สำเร็จ — LINE accounts รีเซ็ตเป็นว่าง"

    # ── 5. ตั้ง skip-worktree ป้องกัน deploy ครั้งถัดไป ────────────────────────
    git ls-files artifacts/api-server/data/ | xargs -r git update-index --skip-worktree
    log "  🔒 skip-worktree ตั้งค่าแล้ว"

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
