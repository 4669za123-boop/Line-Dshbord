#!/bin/bash
# ====================================================
# login-line.sh — เปิด Chrome มีหน้าต่างผ่าน VNC เพื่อล็อกอิน LINE
# รันครั้งเดียว แล้วบอทจะใช้ session นั้นได้ตลอด
# ====================================================

PROFILE_DIR="${PROFILE_DIR:-/home/thaieasyvps/.line-chrome-profile}"
VNC_PORT=5900
DISPLAY_NUM=99

echo "🔐 เตรียมล็อกอิน LINE OA..."

# เริ่ม virtual display
Xvfb :${DISPLAY_NUM} -screen 0 1920x1080x24 &
XVFB_PID=$!
sleep 2

# เริ่ม VNC server (ไม่ใช้รหัสผ่าน สำหรับ local เท่านั้น)
x11vnc -display :${DISPLAY_NUM} -nopw -listen localhost -xkb -forever &
VNC_PID=$!
sleep 2

echo ""
echo "📺 VNC พร้อมแล้ว!"
echo "   เชื่อมด้วย SSH tunnel:"
echo "   ssh -L 5900:localhost:5900 root@$(hostname -I | awk '{print $1}')"
echo "   แล้วเปิด VNC Viewer → localhost:5900"
echo ""
echo "🌐 Chrome กำลังเปิด LINE OA..."
echo "   ล็อกอินให้เสร็จ แล้วกด Ctrl+C เพื่อบันทึก session"
echo ""

# เปิด Chrome ไปที่ LINE OA Manager
DISPLAY=:${DISPLAY_NUM} google-chrome \
  --user-data-dir="${PROFILE_DIR}" \
  --no-first-run \
  --no-default-browser-check \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  https://manager.line.biz/ &
CHROME_PID=$!

# รอจนกด Ctrl+C
trap "echo ''; echo '✅ บันทึก session เรียบร้อย! Profile อยู่ที่: ${PROFILE_DIR}'; \
  kill $CHROME_PID $VNC_PID $XVFB_PID 2>/dev/null; exit 0" INT

echo "⏳ กำลังรอ... (กด Ctrl+C หลังจากล็อกอิน LINE เสร็จแล้ว)"
wait $CHROME_PID

kill $VNC_PID $XVFB_PID 2>/dev/null
echo "✅ บันทึก session เรียบร้อย! Profile อยู่ที่: ${PROFILE_DIR}"
