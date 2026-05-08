"""
checker.py — ตรวจสถานะ LINE OA (ออนไลน์ / โดนระงับ) ทุก 1 นาที
เรียกจาก scheduler.ts ของ server แล้วส่งผลไปที่ POST /api/line-status
"""
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

DATA_FILE = "data/lines.json"
API_URL = "http://localhost:8080/api/line-status"


def load_lines():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("❌ load lines error:", e)
        return []


def connect():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument(r"--user-data-dir=C:\selenium_profile")
    return webdriver.Chrome(options=options)


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

    lines = load_lines()
    if not lines:
        print("❌ ไม่มีข้อมูล lines.json")
        return

    driver = connect()
    wait = WebDriverWait(driver, 15)
    statuses = {}

    for item in lines:
        line_id = item.get("id", "")
        if not line_id:
            continue

        url = f"https://manager.line.biz/account/@{line_id}"
        try:
            driver.get(url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)

            if check_banned(driver):
                statuses[line_id] = "suspended"
                print(f"🚨 {line_id} → โดนระงับ")
            else:
                statuses[line_id] = "normal"
                print(f"✅ {line_id} → ออนไลน์")

        except Exception as e:
            print(f"❌ {line_id} error:", e)
            statuses[line_id] = "inactive"

    driver.quit()

    try:
        res = requests.post(API_URL, json={"statuses": statuses}, timeout=10)
        print(f"✅ ส่งสถานะ {len(statuses)} บัญชี → {res.status_code}")
    except Exception as e:
        print("❌ POST /api/line-status ล้มเหลว:", e)

    print("✅ CHECKER DONE")


if __name__ == "__main__":
    main()
