"""
checker.py — ตรวจสถานะ LINE OA (ออนไลน์ / โดนระงับ)
รันต่อเนื่องทุก 1 นาที → อัปเดตสถานะบน Dashboard แบบเรียลไทม์
เมื่อพบไลน์โดนระงับ → trigger auto_failover.promote_backup() อัตโนมัติ
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

import auto_failover

WEBSITES_FILE = "data/websites.json"
DATA_FILE = "data/lines.json"
API_URL = os.environ.get("API_URL", "http://localhost:8080/api/line-status")
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile")
CHECK_INTERVAL = int(os.environ.get("CHECK_INTERVAL", "60"))  # วินาที


def load_websites():
    try:
        with open(WEBSITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        sites = [w for w in data if w.get("url") and w.get("name")]
        print(f"✅ WEBSITES: {len(sites)} รายการ")
        return sites
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


def load_website_map() -> dict:
    """คืน dict ชื่อเว็บ → { id, url } สำหรับใช้ใน failover"""
    try:
        with open(WEBSITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {w["name"]: {"id": w.get("id", ""), "url": w["url"]} for w in data if w.get("name") and w.get("url")}
    except Exception as e:
        print("❌ load website map error:", e)
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
    except Exception:
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
    except Exception:
        pass
    return False


def run_check():
    print(f"\n{'='*55}")
    print("🔍 CHECKER: เริ่มรอบตรวจสถานะ")
    print(f"{'='*55}")

    # reset ตัวป้องกัน backup ซ้ำสำหรับรอบใหม่
    auto_failover.reset_cycle()

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลเว็บไซต์")
        return

    data_map = load_data_map()
    website_map = load_website_map()
    driver = connect()
    wait = WebDriverWait(driver, 20)
    statuses = {}

    # รายการที่โดนระงับ: { line_id → { type, site, group_url, website_id } }
    suspended_accounts: dict = {}

    # ─── ขั้นตอน 1: ตรวจสถานะ ───
    for website in websites:
        site_name = website["name"]
        group_url = website["url"]
        print(f"\n🌐 เข้าเว็บ: {site_name} → {group_url}")

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

                        # เก็บไว้สำหรับ failover
                        site_info = website_map.get(site, {})
                        suspended_accounts[line_id] = {
                            "type":       line_type,
                            "site":       site,
                            "group_url":  site_info.get("url", group_url),
                            "website_id": site_info.get("id", ""),
                        }
                    else:
                        status = "normal"
                        print(f"   ✅ {line_id} ({site} / {line_type}) → ออนไลน์")

                    statuses[line_id] = {
                        "status": status,
                        "type":   line_type,
                        "site":   site,
                    }

                except Exception as e:
                    print(f"   ❌ {line_id} error:", e)
                    statuses[line_id] = {
                        "status": "inactive",
                        "type":   line_type,
                        "site":   site,
                    }

        except Exception as e:
            print(f"❌ group error ({site_name}):", e)

    # ─── ขั้นตอน 2: POST สถานะขึ้น Dashboard ───
    try:
        res = requests.post(API_URL, json={"statuses": statuses}, timeout=10)
        print(f"\n✅ อัปเดตสถานะ {len(statuses)} บัญชี → Dashboard ({res.status_code})")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว:", e)

    # ─── ขั้นตอน 3: Auto-Failover สำหรับทุก account ที่โดนระงับ ───
    if suspended_accounts:
        print(f"\n🔄 AUTO-FAILOVER: พบ {len(suspended_accounts)} บัญชีที่โดนระงับ")
        for line_id, info in suspended_accounts.items():
            try:
                result = auto_failover.promote_backup(
                    driver=driver,
                    suspended_line_id=line_id,
                    role=info["type"],
                    site_name=info["site"],
                    group_url=info["group_url"],
                    website_id=info["website_id"],
                )
                if result["ok"]:
                    print(f"   ✅ Failover OK: {line_id} → {result.get('newLineId', '?')}")
                    # แจ้ง API ว่า ID เก่าไม่ต้องแสดง suspended อีกต่อไป
                    try:
                        requests.post(
                            API_URL,
                            json={"statuses": {line_id: {"status": "inactive", "type": info["type"], "site": info["site"]}}},
                            timeout=5,
                        )
                    except Exception:
                        pass
                else:
                    print(f"   ⚠️  Failover ไม่สำเร็จ: {line_id} — {result.get('message')}")
            except Exception as e:
                print(f"   ❌ Failover error ({line_id}): {e}")
    else:
        print("\n✅ ทุกไลน์ปกติ — ไม่จำเป็นต้องสับเปลี่ยน")

    driver.quit()
    print("\n✅ CHECKER รอบนี้เสร็จสมบูรณ์")


def main():
    print(f"🔍 CHECKER START (ตรวจทุก {CHECK_INTERVAL} วินาที)")
    while True:
        try:
            run_check()
        except Exception as e:
            print(f"❌ run_check error: {e}")
        print(f"\n⏳ รอ {CHECK_INTERVAL} วินาทีก่อนรอบถัดไป...")
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
