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

# --- 4. ติดตั้ง PM2 (ทำให้ app รันตลอด ปิด terminal ได้) ---
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

# --- 8. ติดตั้ง Xvfb (virtual display สำหรับล็อกอิน LINE ครั้งแรก) ---
echo "📦 ติดตั้ง Xvfb..."
apt-get install -y xvfb x11vnc

# --- 9. Clone โปรเจกต์จาก GitHub ---
echo "📥 Clone โปรเจกต์..."
if [ ! -d "/app" ]; then
  git clone https://github.com/4669za123-boop/Line-Dshbord /app
else
  echo "   โฟลเดอร์ /app มีอยู่แล้ว ข้าม clone"
fi

# --- 10. ติดตั้ง Node dependencies + build ---
echo "🔨 Build โปรเจกต์..."
cd /app
pnpm install
cd artifacts/api-server && pnpm run build
cd /app

# --- 11. สร้างโฟลเดอร์ data ถ้ายังไม่มี ---
mkdir -p artifacts/api-server/data

# --- 12. ตั้งค่า PM2 ให้รัน API server ---
echo "⚙️  ตั้งค่า PM2..."
pm2 start "node /app/artifacts/api-server/dist/index.mjs" \
  --name "line-dashboard-api" \
  --cwd "/app/artifacts/api-server"

pm2 startup
pm2 save

echo ""
echo "✅ ติดตั้งเสร็จแล้ว!"
echo ""
echo "📋 ขั้นตอนต่อไป:"
echo "   1. ล็อกอิน LINE ครั้งแรก → รัน: bash login-line.sh"
echo "   2. ดู API server: pm2 logs line-dashboard-api"
echo "   3. เช็ค status: pm2 status"
echo ""
echo "🌐 API รันที่: http://$(hostname -I | awk '{print $1}'):8080"
