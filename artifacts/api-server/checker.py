"""
checker.py — ตรวจสถานะ LINE OA (ออนไลน์ / โดนระงับ)
เข้า URL เว็บ → ไล่ account links → เทียบกับ lines.json → ส่งสถานะ + type กลับ
"""
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WEBSITES_FILE = "data/websites.json"
DATA_FILE = "data/lines.json"
API_URL = "http://localhost:8080/api/line-status"


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
    """โหลด lines.json แล้วทำ dict { line_id: { type, site } } เหมือน bot.py"""
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


def connect():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument(r"--user-data-dir=C:\selenium_profile")
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


def main():
    print("🔍 CHECKER START")

    websites = load_websites()
    if not websites:
        print("❌ ไม่พบข้อมูลเว็บไซต์")
        return

    data_map = load_data_map()

    driver = connect()
    wait = WebDriverWait(driver, 20)

    # statuses: { line_id: { status, type, site } }
    statuses = {}

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

                # ข้ามถ้าไม่อยู่ใน lines.json
                if line_id not in data_map:
                    continue

                info = data_map[line_id]
                line_type = info["type"]   # "หลัก" หรือ "ฝากถอน"
                site = info["site"]

                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(2)

                    if check_banned(driver):
                        status = "suspended"
                        label = "ไลน์หลัก" if line_type == "หลัก" else "ไลน์ฝากถอน"
                        print(f"   🚨 {line_id} ({site} / {label}) → โดนระงับ")
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

    try:
        res = requests.post(API_URL, json={"statuses": statuses}, timeout=10)
        print(f"✅ ส่งสถานะ {len(statuses)} บัญชี → {res.status_code}")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว:", e)

    print("✅ CHECKER DONE")


if __name__ == "__main__":
    main()
