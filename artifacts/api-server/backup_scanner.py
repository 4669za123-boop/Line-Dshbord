"""
backup_scanner.py — สแกนกลุ่มไลน์สำรอง
อ่าน URL กลุ่มจาก data/backup-groups.json
เข้าแต่ละกลุ่มด้วย Selenium → ดึง URL บัญชีภายใน → ดึงชื่อ + ไอดีไลน์
จับคู่กับเว็บไซต์ → POST ผลลัพธ์ไปยัง /api/backup-accounts
"""

import time
import json
import os
import re
import platform
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

GROUPS_FILE = "data/backup-groups.json"
WEBSITES_FILE = "data/websites.json"
API_BASE = os.environ.get("API_URL", "http://localhost:8080/api")
CHROME_PROFILE_DIR = os.environ.get("CHROME_PROFILE_DIR", "/root/.line-chrome-profile")


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
        for binary in [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
        ]:
            if os.path.exists(binary):
                options.binary_location = binary
                break

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"⚠️  webdriver_manager ล้มเหลว: {e} — ลอง default")
        return webdriver.Chrome(options=options)


def extract_account_id(url):
    """ดึง LINE ID จาก URL เช่น .../account/@abc123 → abc123"""
    try:
        part = url.split("/account/")[-1]
        return part.split("?")[0].replace("@", "").lower().strip()
    except:
        return ""


def detect_role_from_page(driver, default_role):
    """ตรวจสอบประเภทจากเนื้อหาหน้ากลุ่ม"""
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
    """ดึง URL ของบัญชี LINE ในหน้ากลุ่ม (scroll ซ้ำเพื่อโหลด lazy content)"""
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
    """ดึงชื่อไลน์จากหน้าบัญชี"""
    selectors = [
        "h1", "h2",
        "[class*='name']",
        "[class*='title']",
        "title",
    ]
    for sel in selectors:
        try:
            el = driver.find_element(By.CSS_SELECTOR, sel)
            text = el.text.strip() if sel != "title" else driver.title.strip()
            if text and len(text) > 1:
                return text
        except:
            continue
    # fallback: ใช้ page title
    try:
        return driver.title.strip()
    except:
        return ""


def match_website(line_name, websites):
    """
    จับคู่ชื่อไลน์กับเว็บไซต์โดยดูว่าชื่อไลน์มีชื่อเว็บอยู่ไหม
    คืน (websiteId, websiteName) หรือ (None, None) ถ้าไม่มั่นใจ
    """
    name_lower = line_name.lower()
    best = None
    best_len = 0
    for site in websites:
        site_name = site["name"].lower()
        # ตรวจสอบทั้งแบบ exact substr และ fuzzy (ตัดช่องว่าง)
        if site_name in name_lower or site_name.replace(" ", "") in name_lower.replace(" ", ""):
            if len(site_name) > best_len:
                best = site
                best_len = len(site_name)
    if best:
        return best["id"], best["name"]
    return None, None


def main():
    print("🔍 BACKUP SCANNER START")

    groups = load_groups()
    if not groups:
        print("❌ ไม่พบกลุ่มไลน์สำรอง — ตรวจสอบ data/backup-groups.json")
        return

    websites = load_websites()
    print(f"✅ เว็บไซต์: {len(websites)} รายการ")

    driver = connect()
    wait = WebDriverWait(driver, 20)
    results = []

    for group in groups:
        group_id = group["id"]
        group_url = group["url"]
        default_role = group["role"]  # "main" หรือ "deposit"
        print(f"\n🌐 สแกนกลุ่ม: {group_url} (ค่าเริ่มต้น: {default_role})")

        try:
            driver.get(group_url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)

            # ตรวจสอบประเภทจากหน้ากลุ่ม (อาจมีระบุไว้)
            role = detect_role_from_page(driver, default_role)
            print(f"   ประเภท: {role}")

            account_links = get_account_links(driver)
            print(f"   พบ {len(account_links)} บัญชี")

            for acc_url in account_links:
                line_account_id = extract_account_id(acc_url)
                if not line_account_id:
                    continue

                print(f"   → ตรวจสอบ: {acc_url}")
                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(1.5)

                    line_name = get_line_name(driver)
                    if not line_name:
                        line_name = f"@{line_account_id}"

                    website_id, website_name = match_website(line_name, websites)
                    confirmed = website_id is not None

                    result = {
                        "groupId": group_id,
                        "groupUrl": group_url,
                        "lineName": line_name,
                        "lineAccountId": f"@{line_account_id}",
                        "lineAccountUrl": acc_url,
                        "role": role,
                        "websiteId": website_id,
                        "websiteName": website_name,
                        "confirmed": confirmed,
                    }
                    results.append(result)

                    status_icon = "✅" if confirmed else "⚠️"
                    print(f"   {status_icon} {line_name} ({line_account_id}) → {website_name or 'ไม่ทราบเว็บ'}")

                except Exception as e:
                    print(f"   ❌ error บัญชี {acc_url}: {e}")
                    continue

        except Exception as e:
            print(f"❌ error กลุ่ม {group_url}: {e}")
            continue

    driver.quit()

    if not results:
        print("⚠️ ไม่พบบัญชีในกลุ่มใดเลย")
        return

    # POST ผลลัพธ์ไปยัง API
    try:
        res = requests.post(
            f"{API_BASE}/backup-accounts",
            json={"accounts": results},
            timeout=15,
        )
        print(f"\n✅ อัปเดต {len(results)} บัญชีสำรอง → Dashboard ({res.status_code})")
    except Exception as e:
        print(f"❌ POST /api/backup-accounts ล้มเหลว: {e}")

    print("✅ BACKUP SCANNER DONE")


if __name__ == "__main__":
    main()
