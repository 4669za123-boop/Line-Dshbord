"""
checker.py — ตรวจสถานะ LINE OA (ออนไลน์ / โดนระงับ)
- เช็คทุกรอบ → เทียบกับสถานะก่อนหน้า
- ถ้าพบว่าเพิ่งบิน (normal → suspended) → แจ้ง Discord ทันที
"""
import time
import json
import os
import platform
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WEBSITES_FILE = "data/websites.json"
DATA_FILE = "data/lines.json"
API_URL = os.environ.get("API_URL", "http://localhost:8080/api/line-status")
DISCORD_WEBHOOK_URL = os.environ.get(
    "DISCORD_WEBHOOK_URL",
    "https://discord.com/api/webhooks/1500401729387364524/zFTtXlU1J5L6bObpjsT9cQsNdFA-jkNQYlYfYzEP--SOk0OU1Q6R5RVDbwZfXsTPsfiJ"
)

CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/root/.line-chrome-profile")


def load_websites():
    try:
        with open(WEBSITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        websites = []
        for item in data:
            url = item.get("url", "").strip()
            name = item.get("name", "").strip()
            if url and name:
                websites.append({"name": name, "url": url})
        print(f"✅ WEBSITES: {len(websites)} รายการ")
        return websites
    except Exception as e:
        print("❌ load websites error:", e)
        return []


def load_data_map():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)

        def extract(x):
            if not x:
                return ""
            if "/account/" in x:
                return x.split("/account/")[1].replace("@", "").lower()
            return x.replace("@", "").lower()

        cleaned = {}
        for item in raw:
            raw_id = item.get("id") or item.get("url")
            line_id = extract(raw_id)
            if line_id:
                cleaned[line_id] = {
                    "type": item.get("type", ""),
                    "site": item.get("site", ""),
                }
        print(f"✅ DATA MAP: {len(cleaned)} รายการ")
        return cleaned
    except Exception as e:
        print("❌ load data error:", e)
        return {}


def get_previous_statuses() -> dict:
    """ดึงสถานะรอบก่อนหน้าจาก API"""
    try:
        res = requests.get(API_URL, timeout=5)
        return res.json()
    except:
        return {}


def connect():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")

    if os.path.exists(CHROME_PROFILE_DIR):
        options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
        print(f"✅ ใช้ Chrome profile: {CHROME_PROFILE_DIR}")
    else:
        print(f"⚠️  ไม่พบ Chrome profile ที่ {CHROME_PROFILE_DIR}")

    if platform.system() == "Linux":
        for binary in [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
        ]:
            if os.path.exists(binary):
                options.binary_location = binary
                print(f"✅ ใช้ Chrome: {binary}")
                break

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"⚠️  webdriver_manager ไม่ได้: {e} — ลอง default")
        return webdriver.Chrome(options=options)


def get_accounts(driver):
    accounts = set()
    for _ in range(6):
        driver.execute_script("window.scrollBy(0, 800);")
        time.sleep(1)
        links = driver.find_elements(By.XPATH, "//a[contains(@href,'/account/')]")
        for l in links:
            href = l.get_attribute("href")
            if href:
                accounts.add(href.split("?")[0])
    return list(accounts)


def extract_id_from_url(url):
    try:
        return url.split("/")[-1].replace("@", "").lower()
    except:
        return ""


def check_banned(driver):
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        if (
            "ถูกระงับ" in text
            or "ระงับการใช้งาน" in text
            or "suspended" in text.lower()
        ):
            return True
    except:
        pass
    return False


def send_discord_alert(alerts: list):
    """ส่งแจ้งเตือน Discord ทันทีเมื่อไลน์บิน"""
    if not alerts or not DISCORD_WEBHOOK_URL:
        return
    text = "🚨 **แจ้งเตือนด่วน! ไลน์บิน**\n\n"
    for a in alerts:
        label = "ไลน์หลัก" if a["type"] == "หลัก" else "ไลน์ฝากถอน"
        text += f"❌ **{a['site']}** — {label}\n"
        text += f"   LINE ID: `{a['id']}`\n\n"
    text += "⚠️ กรุณาตรวจสอบและเปลี่ยนไลน์ด่วน!"
    try:
        requests.post(DISCORD_WEBHOOK_URL, json={"content": text}, timeout=10)
        print(f"🚨 ส่ง Discord alert {len(alerts)} รายการ")
    except Exception as e:
        print("❌ discord alert error:", e)


def main():
    print("🔍 CHECKER START")

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลเว็บไซต์")
        return

    data_map = load_data_map()

    # ดึงสถานะรอบก่อนหน้า เพื่อเปรียบเทียบ
    previous = get_previous_statuses()

    driver = connect()
    wait = WebDriverWait(driver, 20)

    statuses = {}
    newly_banned = []  # รายการที่เพิ่งบินรอบนี้

    for website in websites:
        site_name = website["name"]
        group_url = website["url"]
        print(f"🌐 เข้าเว็บ: {site_name} → {group_url}")

        try:
            driver.get(group_url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)

            accounts = get_accounts(driver)
            print(f"   พบ {len(accounts)} account links")

            for acc_url in accounts:
                line_id = extract_id_from_url(acc_url)
                if line_id not in data_map:
                    continue

                info = data_map[line_id]
                line_type = info["type"]
                site = info["site"]

                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(2)

                    if check_banned(driver):
                        status = "suspended"
                        label = "ไลน์หลัก" if line_type == "หลัก" else "ไลน์ฝากถอน"
                        print(f"   🚨 {line_id} ({site} / {label}) → โดนระงับ")

                        # เช็คว่าเพิ่งบินรอบนี้หรือบินมาแล้ว
                        prev_status = previous.get(line_id, {})
                        was_normal = (
                            not prev_status or
                            prev_status.get("status") == "normal" or
                            prev_status.get("status") == "inactive"
                        )
                        if was_normal:
                            newly_banned.append({
                                "id": line_id,
                                "type": line_type,
                                "site": site,
                            })
                            print(f"   ⚡ ใหม่! เพิ่งบินรอบนี้ → จะแจ้ง Discord")
                        else:
                            print(f"   ℹ️  บินมาแล้วตั้งแต่รอบก่อน ไม่ส่งซ้ำ")
                    else:
                        status = "normal"
                        print(f"   ✅ {line_id} ({site} / {line_type}) → ออนไลน์")

                    statuses[line_id] = {
                        "status": status,
                        "type": line_type,
                        "site": site,
                    }

                except Exception as e:
                    print(f"   ❌ {line_id} error:", e)
                    statuses[line_id] = {
                        "status": "inactive",
                        "type": line_type,
                        "site": site,
                    }
                    continue

        except Exception as e:
            print(f"❌ group error ({site_name}):", e)
            continue

    driver.quit()

    # ส่งสถานะไปเก็บที่ API
    try:
        res = requests.post(API_URL, json={"statuses": statuses}, timeout=10)
        print(f"✅ ส่งสถานะ {len(statuses)} บัญชี → {res.status_code}")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว:", e)

    # ส่ง Discord alert ทันทีถ้ามีไลน์บินใหม่
    if newly_banned:
        send_discord_alert(newly_banned)
    else:
        print("✅ ไม่มีไลน์บินใหม่รอบนี้")

    print("✅ CHECKER DONE")


if __name__ == "__main__":
    main()
