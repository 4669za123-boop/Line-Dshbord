#!/bin/bash
# ====================================================
# setup-vps.sh — ติดตั้งทุกอย่างบน VPS Ubuntu ครั้งเดียว
# ใช้ได้กับ Vultr, DigitalOcean, Linode, AWS, GCP ทุกเจ้า
# รันด้วย: bash setup-vps.sh
# ====================================================

set -e

echo "🚀 เริ่มติดตั้ง LINE Dashboard บน VPS..."

# --- 1. อัปเดต system ---
echo "📦 อัปเดต packages..."
apt-get update -y && apt-get upgrade -y

# --- 2. ติดตั้ง Node.js 20 ---
echo "📦 ติดตั้ง Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- 3. ติดตั้ง pnpm ---
echo "📦 ติดตั้ง pnpm..."
npm install -g pnpm

# --- 4. ติดตั้ง PM2 ---
echo "📦 ติดตั้ง PM2..."
npm install -g pm2

# --- 5. ติดตั้ง Python 3 + pip ---
echo "📦 ติดตั้ง Python..."
apt-get install -y python3 python3-pip

# --- 6. ติดตั้ง Python dependencies ---
echo "📦 ติดตั้ง Python packages..."
pip3 install selenium webdriver-manager requests

# --- 7. ติดตั้ง Google Chrome ---
echo "📦 ติดตั้ง Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
  > /etc/apt/sources.list.d/google-chrome.list
apt-get update -y
apt-get install -y google-chrome-stable

# --- 8. ติดตั้ง Xvfb + VNC (สำหรับล็อกอิน LINE ครั้งแรก) ---
echo "📦 ติดตั้ง Xvfb + VNC..."
apt-get install -y xvfb x11vnc

# --- 9. ติดตั้ง Nginx ---
echo "📦 ติดตั้ง Nginx..."
apt-get install -y nginx

# --- 10. Clone โปรเจกต์จาก GitHub ---
echo "📥 Clone โปรเจกต์..."
if [ ! -d "/app" ]; then
  git clone https://github.com/4669za123-boop/Line-Dshbord /app
else
  echo "   โฟลเดอร์ /app มีอยู่แล้ว — pull โค้ดล่าสุด"
  cd /app && git pull
fi

# --- 11. ติดตั้ง Node dependencies ---
echo "🔨 ติดตั้ง dependencies..."
cd /app
pnpm install

# --- 12. Build API Server ---
echo "🔨 Build API Server..."
cd /app/artifacts/api-server && pnpm run build

# --- 13. Build Frontend Dashboard ---
echo "🔨 Build Frontend Dashboard..."
cd /app
NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/line-dashboard run build

# --- 14. สร้างโฟลเดอร์ data ถ้ายังไม่มี ---
mkdir -p /app/artifacts/api-server/data
# สร้างไฟล์เริ่มต้นถ้ายังไม่มี
[ -f "/app/artifacts/api-server/data/lines.json" ]    || echo "[]" > /app/artifacts/api-server/data/lines.json
[ -f "/app/artifacts/api-server/data/websites.json" ] || echo "[]" > /app/artifacts/api-server/data/websites.json
[ -f "/app/artifacts/api-server/data/schedules.json" ] || echo '["09:00","14:00","20:00"]' > /app/artifacts/api-server/data/schedules.json

# --- 15. ตั้งค่า Nginx ---
echo "⚙️  ตั้งค่า Nginx..."
cat > /etc/nginx/sites-available/line-dashboard << 'EOF'
server {
    listen 80;
    server_name _;

    # Serve frontend (React build)
    root /app/artifacts/line-dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/line-dashboard /etc/nginx/sites-enabled/line-dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# --- 16. ตั้งค่า PM2 ให้รัน API server ---
echo "⚙️  ตั้งค่า PM2..."
pm2 delete line-dashboard-api 2>/dev/null || true
PORT=8080 pm2 start "node /app/artifacts/api-server/dist/index.mjs" \
  --name "line-dashboard-api" \
  --cwd "/app/artifacts/api-server" \
  --env PORT=8080

pm2 startup
pm2 save

echo ""
echo "✅ ติดตั้งเสร็จแล้ว!"
echo ""
echo "📋 ขั้นตอนต่อไป (ทำครั้งเดียว):"
echo "   1. ล็อกอิน LINE OA ครั้งแรก → รัน: bash /app/login-line.sh"
echo "      (ดูวิธีเชื่อม VNC ด้านล่าง)"
echo "   2. หลังล็อกอินเสร็จ → restart bot: pm2 restart line-dashboard-api"
echo ""
echo "🌐 Dashboard: http://$(hostname -I | awk '{print $1}')"
echo "🔌 API:       http://$(hostname -I | awk '{print $1}')/api/health"
echo "📊 PM2:       pm2 status"
echo "📝 Logs:      pm2 logs line-dashboard-api"
