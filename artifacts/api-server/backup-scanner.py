"""
backup-scanner.py — สแกนกลุ่มไลน์สำรองโดยเฉพาะ
อ่าน backup-groups.json → สแกนแต่ละกลุ่ม → POST /api/backup-accounts
ทำงานแยกจาก checker.py เพื่อไม่ให้ blocking กัน
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

BACKUP_GROUPS_FILE  = "data/backup-groups.json"
API_BASE            = os.environ.get("API_BASE", "http://localhost:3000/api")
BACKUP_ACCOUNTS_URL = f"{API_BASE}/backup-accounts"
CHROME_PROFILE_DIR  = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile")
SCAN_INTERVAL       = int(os.environ.get("BACKUP_SCAN_INTERVAL", "120"))  # ทุก 2 นาที


def load_backup_groups():
    try:
        with open(BACKUP_GROUPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        groups = [g for g in data if g.get("url") and g.get("role")]
        print(f"✅ BACKUP GROUPS: {len(groups)} รายการ")
        return groups
    except FileNotFoundError:
        print("⚠️  ยังไม่มี backup-groups.json")
        return []
    except Exception as e:
        print("❌ load backup-groups error:", e)
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
    """Scroll + เก็บ URL ทุก account ในกลุ่ม"""
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


def get_account_name(driver, fallback):
    try:
        for el in driver.find_elements(By.TAG_NAME, "h1"):
            name = el.text.strip()
            if name and len(name) < 100 and name.lower() != "line":
                return name
        title = driver.title
        if title:
            for sep in [" | ", " - "]:
                if sep in title:
                    part = title.split(sep)[0].strip()
                    if part and len(part) < 100:
                        return part
            if len(title) < 100:
                return title.strip()
        for m in driver.find_elements(By.XPATH, "//meta[@property='og:title']"):
            c = m.get_attribute("content")
            if c and len(c) < 100:
                return c.strip()
    except Exception as e:
        print(f"   ⚠️  get_account_name: {e}")
    return fallback


def run_scan():
    print(f"\n{'='*55}")
    print("📦 BACKUP-SCANNER: เริ่มสแกนกลุ่มสำรอง")
    print(f"{'='*55}")

    groups = load_backup_groups()
    if not groups:
        print("⏭️  ไม่มีกลุ่มสำรอง — รอการเพิ่ม")
        return

    driver = connect()
    wait   = WebDriverWait(driver, 20)
    found  = []

    try:
        for bg in groups:
            group_id   = bg["id"]
            group_url  = bg["url"]
            group_role = bg["role"]
            role_label = "ไลน์หลัก" if group_role == "main" else "ไลน์ฝากถอน"
            print(f"\n📂 [{role_label}] {group_url}")

            try:
                driver.get(group_url)
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(2)

                acc_urls = get_accounts(driver)
                print(f"   พบ {len(acc_urls)} account")

                for acc_url in acc_urls:
                    line_id = extract_id_from_url(acc_url)
                    if not line_id:
                        continue
                    try:
                        driver.get(acc_url)
                        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                        time.sleep(2)

                        line_name = get_account_name(driver, line_id)
                        print(f"   ✅ {line_name} (@{line_id})")

                        found.append({
                            "groupId":        group_id,
                            "groupUrl":       group_url,
                            "lineName":       line_name,
                            "lineAccountId":  line_id,
                            "lineAccountUrl": acc_url,
                            "role":           group_role,
                            "websiteId":      None,
                            "websiteName":    None,
                            "confirmed":      False,
                            "scannedAt":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })
                    except Exception as e:
                        print(f"   ❌ account error ({line_id}):", e)

            except Exception as e:
                print(f"❌ group error:", e)
    finally:
        driver.quit()

    if found:
        try:
            res = requests.post(BACKUP_ACCOUNTS_URL, json={"accounts": found}, timeout=10)
            print(f"\n✅ บันทึกไลน์สำรอง {len(found)} บัญชี → ({res.status_code})")
        except Exception as e:
            print("❌ POST /api/backup-accounts ล้มเหลว:", e)
    else:
        print("\n⚠️  ไม่พบ account ใดเลยในกลุ่มสำรอง")

    print("\n✅ BACKUP-SCANNER รอบนี้เสร็จสมบูรณ์")


def main():
    print(f"📦 BACKUP-SCANNER START (สแกนทุก {SCAN_INTERVAL} วินาที)")
    while True:
        try:
            run_scan()
        except Exception as e:
            print(f"❌ run_scan error: {e}")
        print(f"\n⏳ รอ {SCAN_INTERVAL} วินาทีก่อนรอบถัดไป...")
        time.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    main()
