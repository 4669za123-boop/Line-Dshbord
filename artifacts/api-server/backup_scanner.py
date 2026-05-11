"""
backup_scanner.py — สแกนกลุ่มไลน์สำรองแบบต่อเนื่อง
อ่าน URL กลุ่มจาก data/backup-groups.json
เข้าแต่ละกลุ่มด้วย Selenium → ดึง URL บัญชีภายใน → ดึงชื่อ + ไอดีไลน์
จับคู่กับเว็บไซต์ → POST ผลลัพธ์ไปยัง /api/backup-accounts
รันซ้ำทุก SCAN_INTERVAL_SECONDS วินาที (ค่าเริ่มต้น 300 = 5 นาที)
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

GROUPS_FILE  = "data/backup-groups.json"
WEBSITES_FILE = "data/websites.json"
API_BASE     = os.environ.get("API_URL", "http://localhost:3000/api")
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/root/.line-chrome-profile")
SCAN_INTERVAL_SECONDS = int(os.environ.get("BACKUP_SCAN_INTERVAL", "300"))  # 5 นาที


def load_groups():
    try:
        with open(GROUPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        groups = [g for g in data if g.get("url") and g.get("role")]
        print(f"✅ GROUPS: {len(groups)} กลุ่ม")
        return groups
    except Exception as e:
        print("❌ load groups error:", e)
        return []


def load_websites():
    try:
        with open(WEBSITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [{"id": w["id"], "name": w["name"]} for w in data if w.get("id") and w.get("name")]
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
                print(f"✅ ใช้ Chrome binary: {binary}")
                break

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"⚠️  webdriver_manager ล้มเหลว: {e} — ลอง default")
        return webdriver.Chrome(options=options)


def extract_account_id(url):
    try:
        part = url.split("/account/")[-1]
        return part.split("?")[0].replace("@", "").lower().strip()
    except:
        return ""


def detect_role_from_page(driver, default_role):
    """ตรวจประเภทหลัก/ฝากถอนจากเนื้อหาหน้ากลุ่ม"""
    try:
        text = driver.find_element(By.TAG_NAME, "body").text.lower()
        if "ฝากถอน" in text or "deposit" in text:
            return "deposit"
        if "หลัก" in text or "main" in text:
            return "main"
    except:
        pass
    return default_role


def get_account_links(driver):
    accounts = set()
    for _ in range(8):
        driver.execute_script("window.scrollBy(0, 800);")
        time.sleep(0.8)
        links = driver.find_elements(By.XPATH, "//a[contains(@href,'/account/')]")
        for link in links:
            href = link.get_attribute("href")
            if href:
                accounts.add(href.split("?")[0])
    return list(accounts)


def get_line_name(driver):
    selectors = ["h1", "h2", "[class*='name']", "[class*='title']"]
    for sel in selectors:
        try:
            el = driver.find_element(By.CSS_SELECTOR, sel)
            text = el.text.strip()
            if text and len(text) > 1:
                return text
        except:
            continue
    try:
        return driver.title.strip()
    except:
        return ""


def match_website(line_name, websites):
    """จับคู่ชื่อไลน์กับเว็บไซต์ด้วย substring match (ยาวที่สุดชนะ)"""
    name_lower = line_name.lower().replace(" ", "")
    best = None
    best_len = 0
    for site in websites:
        site_key = site["name"].lower().replace(" ", "")
        if site_key and site_key in name_lower:
            if len(site_key) > best_len:
                best = site
                best_len = len(site_key)
    if best:
        return best["id"], best["name"]
    return None, None


def run_scan():
    """รัน 1 รอบการสแกนทุกกลุ่ม"""
    print(f"\n{'='*50}")
    print("🗂️  BACKUP SCANNER: เริ่มรอบการสแกน")
    print(f"{'='*50}")

    groups = load_groups()
    if not groups:
        print("⚠️  ไม่พบกลุ่มไลน์สำรอง — รอการเพิ่มกลุ่มใหม่")
        return

    websites = load_websites()
    print(f"✅ เว็บไซต์: {len(websites)} รายการ (ลำดับจากแดชบอร์ด)")

    driver = connect()
    wait = WebDriverWait(driver, 20)
    results = []

    for group in groups:
        group_id  = group["id"]
        group_url = group["url"]
        default_role = group["role"]
        print(f"\n🌐 สแกนกลุ่ม: {group_url} (default: {default_role})")

        try:
            driver.get(group_url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)

            role = detect_role_from_page(driver, default_role)
            print(f"   ประเภท: {role}")

            account_links = get_account_links(driver)
            print(f"   พบ {len(account_links)} บัญชี")

            for acc_url in account_links:
                line_account_id = extract_account_id(acc_url)
                if not line_account_id:
                    continue

                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(1.5)

                    line_name = get_line_name(driver) or f"@{line_account_id}"
                    website_id, website_name = match_website(line_name, websites)
                    confirmed = website_id is not None

                    results.append({
                        "groupId":        group_id,
                        "groupUrl":       group_url,
                        "lineName":       line_name,
                        "lineAccountId":  f"@{line_account_id}",
                        "lineAccountUrl": acc_url,
                        "role":           role,
                        "websiteId":      website_id,
                        "websiteName":    website_name,
                        "confirmed":      confirmed,
                    })

                    icon = "✅" if confirmed else "⚠️ "
                    print(f"   {icon} {line_name} → {website_name or 'รอการยืนยัน'}")

                except Exception as e:
                    print(f"   ❌ บัญชี {acc_url}: {e}")
                    continue

        except Exception as e:
            print(f"❌ กลุ่ม {group_url}: {e}")
            continue

    driver.quit()

    if not results:
        print("⚠️  ไม่พบบัญชีในรอบนี้")
        return

    try:
        res = requests.post(
            f"{API_BASE}/backup-accounts",
            json={"accounts": results},
            timeout=15,
        )
        confirmed_count = sum(1 for r in results if r["confirmed"])
        pending_count = len(results) - confirmed_count
        print(f"\n✅ อัปเดต {len(results)} บัญชี "
              f"(หลัก/ฝากถอน: {confirmed_count}, รอยืนยัน: {pending_count}) "
              f"→ API ({res.status_code})")
    except Exception as e:
        print(f"❌ POST /api/backup-accounts ล้มเหลว: {e}")

    print("✅ รอบการสแกนเสร็จสิ้น")


def main():
    print("🗂️  BACKUP SCANNER เริ่มทำงาน (continuous mode)")
    print(f"   สแกนซ้ำทุก {SCAN_INTERVAL_SECONDS} วินาที ({SCAN_INTERVAL_SECONDS//60} นาที)")

    while True:
        try:
            run_scan()
        except Exception as e:
            print(f"❌ เกิดข้อผิดพลาดใน run_scan: {e}")

        print(f"\n⏳ รอ {SCAN_INTERVAL_SECONDS} วินาทีก่อนสแกนรอบถัดไป...")
        time.sleep(SCAN_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
