import time
import requests
import json
import os
import platform
from datetime import datetime, timezone, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BANGKOK_TZ = timezone(timedelta(hours=7))

WEBHOOK_URL = os.environ.get(
    "DISCORD_WEBHOOK_URL",
    "https://discord.com/api/webhooks/1500401729387364524/zFTtXlU1J5L6bObpjsT9cQsNdFA-jkNQYlYfYzEP--SOk0OU1Q6R5RVDbwZfXsTPsfiJ"
)

WEBSITES_FILE = "data/websites.json"
DATA_FILE = "data/lines.json"
API_STATUS_URL = os.environ.get("API_URL", "http://localhost:8080/api/line-status")
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/root/.line-chrome-profile")


def get_shift_label():
    now = datetime.now(BANGKOK_TZ)
    hour = now.hour
    time_str = now.strftime("%H:%M")
    shift = "กะเช้า" if 8 <= hour < 20 else "กะดึก"
    return shift, time_str


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


def load_and_clean_data():
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
            if not line_id:
                continue
            cleaned[line_id] = {
                "id": line_id,
                "type": item.get("type", ""),
                "site": item.get("site", "")
            }
        print(f"✅ CLEAN DATA: {len(cleaned)} รายการ")
        return cleaned
    except Exception as e:
        print("❌ load data error:", e)
        return {}


def load_realtime_statuses() -> dict:
    """ดึงสถานะเรียลไทม์จาก Dashboard API (อัปเดตโดย checker.py)"""
    try:
        res = requests.get(API_STATUS_URL, timeout=5)
        data = res.json()
        print(f"✅ โหลดสถานะจาก Dashboard: {len(data)} บัญชี")
        return data
    except Exception as e:
        print(f"⚠️  โหลดสถานะจาก API ไม่ได้: {e} — จะเช็คโดยตรงแทน")
        return {}


def extract_id_from_url(url):
    try:
        return url.split("/")[-1].replace("@", "").lower()
    except:
        return ""


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


def get_unread(driver):
    try:
        for _ in range(8):
            driver.execute_script("window.scrollBy(0, 800);")
            time.sleep(0.5)
        text = driver.find_element(By.TAG_NAME, "body").text
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if "แชทล่าสุด" in line or "Recent chats" in line:
                for j in range(i + 1, i + 6):
                    if j >= len(lines):
                        break
                    val = lines[j].strip()
                    if val.isdigit():
                        return int(val)
                    num = "".join([c for c in val if c.isdigit()])
                    if num:
                        return int(num)
        return 0
    except:
        return 0


def send(text):
    try:
        requests.post(WEBHOOK_URL, json={"content": text}, timeout=10)
        print("✅ ส่ง Discord สำเร็จ")
    except:
        print("❌ discord error")


def main():
    print("🚀 BOT START")

    driver = connect()
    wait = WebDriverWait(driver, 20)

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลเว็บไซต์")
        driver.quit()
        return

    data_map = load_and_clean_data()

    # ดึงสถานะเรียลไทม์จาก Dashboard (checker.py อัปเดตอยู่แล้ว)
    realtime_statuses = load_realtime_statuses()

    summary = {}

    for website in websites:
        site_name = website["name"]
        group_url = website["url"]
        try:
            driver.get(group_url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)
            accounts = get_accounts(driver)

            for acc_url in accounts:
                try:
                    line_id = extract_id_from_url(acc_url)
                    if line_id not in data_map:
                        continue

                    info = data_map[line_id]
                    site = info["site"]
                    line_type = info["type"]

                    if site not in summary:
                        summary[site] = {
                            "main": None,   # None = ยังไม่ได้เซต
                            "deposit": None,
                        }

                    # เช็คสถานะจาก Dashboard API (เรียลไทม์)
                    status_entry = realtime_statuses.get(line_id, {})
                    is_suspended = (
                        isinstance(status_entry, dict) and
                        status_entry.get("status") == "suspended"
                    )

                    if is_suspended:
                        # บิน → ไม่ต้องนับแชท
                        print(f"🚨 {line_id} ({site} / {line_type}) → โดนระงับ (จาก Dashboard)")
                        if line_type == "หลัก":
                            summary[site]["main"] = "suspended"
                        else:
                            summary[site]["deposit"] = "suspended"
                    else:
                        # ออนไลน์ → เข้าไปนับแชท
                        driver.get(acc_url)
                        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                        time.sleep(2)
                        unread = get_unread(driver)
                        print(f"📊 {line_id} ({site} / {line_type}) → {unread} แชท")
                        if line_type == "หลัก":
                            if summary[site]["main"] != "suspended":
                                summary[site]["main"] = (summary[site]["main"] or 0) + unread
                        else:
                            if summary[site]["deposit"] != "suspended":
                                summary[site]["deposit"] = (summary[site]["deposit"] or 0) + unread

                except Exception as e:
                    print("acc error:", e)
                    continue

        except Exception as e:
            print(f"group error ({site_name}):", e)

    # สร้างข้อความส่ง Discord
    shift, run_time = get_shift_label()
    text = f"📊 ตรวจสอบจำนวนแชท{shift}\nเวลา {run_time} น.\n\n"

    for website in websites:
        site = website["name"]
        if site not in summary:
            continue

        val = summary[site]
        main_val = val["main"]
        deposit_val = val["deposit"]

        text += f"{site}\n"

        # ไลน์หลัก
        if main_val == "suspended":
            text += "ไลน์หลัก โดนระงับ\n"
        elif main_val is None:
            text += "ไลน์หลัก —\n"
        else:
            text += f"ไลน์หลัก {main_val} แชท\n"

        # ไลน์ฝากถอน
        if deposit_val == "suspended":
            text += "ฝากถอน โดนระงับ\n"
        elif deposit_val is None:
            text += "ฝากถอน —\n"
        else:
            text += f"ฝากถอน {deposit_val} แชท\n"

        text += "--------------------\n\n"

    send(text)
    driver.quit()
    print("✅ DONE")


if __name__ == "__main__":
    main()
