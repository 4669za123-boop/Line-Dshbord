"""
checker.py — ตรวจสถานะ LINE OA (ออนไลน์ / โดนระงับ)
สแกน account ทั้งหมดจาก group URL อัตโนมัติ
ดึงชื่อ LINE + ID แล้วเก็บไว้ในระบบ พร้อมตรวจสถานะ
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
API_URL = os.environ.get("API_URL", "http://localhost:3000/api/line-status")
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile")
CHECK_INTERVAL = int(os.environ.get("CHECK_INTERVAL", "60"))


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
        import glob as _glob
        candidates = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
        ] + _glob.glob("/nix/store/*chromium*/bin/chromium")
        for binary in candidates:
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


def get_account_name(driver, line_id):
    """ดึงชื่อ LINE OA จากหน้า account"""
    try:
        # ลอง h1 ก่อน
        h1_els = driver.find_elements(By.TAG_NAME, "h1")
        for el in h1_els:
            name = el.text.strip()
            if name and len(name) < 100 and name.lower() != "line":
                return name

        # ลอง title tag
        title = driver.title
        if title:
            # "ชื่อ | LINE Official Account Manager" หรือ "ชื่อ - LINE"
            for sep in [" | ", " - "]:
                if sep in title:
                    name = title.split(sep)[0].strip()
                    if name and len(name) < 100:
                        return name
            if len(title) < 100:
                return title.strip()

        # ลอง meta og:title
        metas = driver.find_elements(By.XPATH, "//meta[@property='og:title']")
        for m in metas:
            name = m.get_attribute("content")
            if name and len(name) < 100:
                return name.strip()

    except Exception as e:
        print(f"   ⚠️  get_account_name error: {e}")

    return line_id


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

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลเว็บไซต์")
        return

    driver = connect()
    wait = WebDriverWait(driver, 20)
    statuses = {}

    for website in websites:
        site_id = website.get("id", "")
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
                if not line_id:
                    continue

                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(2)

                    line_name = get_account_name(driver, line_id)

                    if check_banned(driver):
                        status = "suspended"
                        print(f"   🚨 {line_name} ({line_id}) → โดนระงับ")
                    else:
                        status = "normal"
                        print(f"   ✅ {line_name} ({line_id}) → ออนไลน์")

                    statuses[line_id] = {
                        "name":   line_name,
                        "status": status,
                        "site":   site_name,
                        "siteId": site_id,
                        "url":    acc_url,
                    }

                except Exception as e:
                    print(f"   ❌ {line_id} error:", e)
                    statuses[line_id] = {
                        "name":   line_id,
                        "status": "inactive",
                        "site":   site_name,
                        "siteId": site_id,
                        "url":    acc_url,
                    }

        except Exception as e:
            print(f"❌ group error ({site_name}):", e)

    try:
        res = requests.post(API_URL, json={"statuses": statuses}, timeout=10)
        print(f"\n✅ อัปเดตสถานะ {len(statuses)} บัญชี → Dashboard ({res.status_code})")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว:", e)

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
