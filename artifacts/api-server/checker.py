"""
checker.py — ตรวจสถานะ LINE OA กลุ่มหลัก
สแกน account จาก websites.json → POST /api/line-status
(ตรวจการระงับ + trigger auto-replace หาก URL ตรงกับ backup pool)
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

WEBSITES_FILE  = "data/websites.json"
API_BASE       = os.environ.get("API_BASE", "http://localhost:8080/api")
LINE_STATUS_URL = f"{API_BASE}/line-status"
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile-v2")
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
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--remote-debugging-port=0")
    options.add_argument("--password-store=basic")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    if os.path.exists(CHROME_PROFILE_DIR):
        # ลบ singleton lock ก่อนเสมอ เพื่อไม่ให้ชนกับ Chrome อื่น
        for lock_file in ["SingletonLock", "SingletonSocket", "SingletonCookie"]:
            lock_path = os.path.join(CHROME_PROFILE_DIR, lock_file)
            if os.path.exists(lock_path):
                try:
                    os.remove(lock_path)
                except Exception:
                    pass
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

    # ลอง chromedriver ที่ติดตั้งไว้ก่อน
    chromedriver_candidates = [
        "/tmp/chromedriver-linux64/chromedriver",
        "/home/thaieasyvps/chromedriver",
        "/usr/local/bin/chromedriver",
        "/usr/bin/chromedriver",
    ]
    for cd_path in chromedriver_candidates:
        if os.path.exists(cd_path):
            try:
                service = Service(cd_path)
                driver = webdriver.Chrome(service=service, options=options)
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                print(f"✅ ใช้ chromedriver: {cd_path}")
                return driver
            except Exception as e:
                print(f"⚠️  {cd_path} ไม่ได้: {e}")

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    except Exception as e:
        print(f"⚠️  webdriver_manager ไม่ได้: {e} — ลอง default")
        driver = webdriver.Chrome(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver


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
    try:
        for tag in ["h2", "h1"]:
            els = driver.find_elements(By.TAG_NAME, tag)
            for el in els:
                name = el.text.strip()
                if name and len(name) < 100 and name.lower() not in ("line", "line official account manager"):
                    return name
        title = driver.title
        if title:
            for sep in [" | ", " - "]:
                if sep in title:
                    name = title.split(sep)[0].strip()
                    if name and len(name) < 100 and name.lower() != "line official account manager":
                        return name
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
    print("🔍 CHECKER: เริ่มรอบตรวจสถานะกลุ่มหลัก")
    print(f"{'='*55}")

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลกลุ่มหลัก")
        return

    driver   = connect()
    wait     = WebDriverWait(driver, 20)
    statuses = {}

    def _restart_driver():
        nonlocal driver, wait
        try:
            driver.quit()
        except Exception:
            pass
        print("🔄 Restart Chrome...")
        driver = connect()
        wait   = WebDriverWait(driver, 20)

    def _is_session_dead(e):
        msg = str(e).lower()
        return "invalid session id" in msg or "session not created" in msg or "no such session" in msg

    for website in websites:
        site_id   = website.get("id", "")
        site_name = website["name"]
        group_url = website["url"]
        print(f"\n🌐 เข้ากลุ่ม: {site_name} → {group_url}")

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
                    if _is_session_dead(e):
                        print(f"   ⚠️  Chrome crash ตอนตรวจ {line_id} — restart")
                        _restart_driver()
                    else:
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
            if _is_session_dead(e):
                print("   🔄 Chrome crash ตอนเข้ากลุ่ม — restart แล้วสแกนต่อ")
                _restart_driver()

    try:
        driver.quit()
    except Exception:
        pass

    try:
        res = requests.post(LINE_STATUS_URL, json={"statuses": statuses}, timeout=10)
        try:
            data = res.json()
            msg = f"active={data.get('active',0)}, suspended={data.get('suspended',0)}"
            if data.get("replacements", 0) > 0:
                msg += f", 🔄 auto-replaced={data['replacements']}"
            print(f"\n✅ อัปเดต {len(statuses)} บัญชี ({res.status_code}) — {msg}")
        except Exception:
            print(f"❌ POST /api/line-status → HTTP {res.status_code}, body: {res.text[:300]!r}")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว (connection):", e)

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
