import time
import requests
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WEBHOOK_URL = "https://discord.com/api/webhooks/1500401729387364524/zFTtXlU1J5L6bObpjsT9cQsNdFA-jkNQYlYfYzEP--SOk0OU1Q6R5RVDbwZfXsTPsfiJ"

GROUP_URLS = [
    "https://manager.line.biz/groups/284033/setting",
    "https://manager.line.biz/groups/274572/setting",
    "https://manager.line.biz/groups/274574/setting",
    "https://manager.line.biz/groups/273467/setting",
    "https://manager.line.biz/groups/281962/setting",
    "https://manager.line.biz/groups/282784/setting",
    "https://manager.line.biz/groups/291757/setting",
    "https://manager.line.biz/groups/291413/setting",
    "https://manager.line.biz/groups/293859/setting",
    "https://manager.line.biz/groups/293858/setting"
]

DATA_FILE = "data/lines.json"


# 🔥 โหลด + ล้าง + เอาลำดับเว็บ
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
        site_order = []

        for item in raw:
            raw_id = item.get("id") or item.get("url")
            line_id = extract(raw_id)

            if not line_id:
                continue

            site = item.get("site", "")
            line_type = item.get("type", "")

            # 🔥 ตัวล่าสุดทับของเก่า
            cleaned[line_id] = {
                "id": line_id,
                "type": line_type,
                "site": site
            }

            # 🔥 เก็บลำดับเว็บตาม dashboard
            if site and site not in site_order:
                site_order.append(site)

        # =========================================
        # 🔥 เรียง + จัดลำดับข้อมูลใหม่
        # =========================================

        result = []

        for site in site_order:
            site_items = [i for i in cleaned.values() if i["site"] == site]

            # ✔ หลักขึ้นก่อน ฝากถอนทีหลัง
            site_items.sort(key=lambda x: 0 if x["type"] == "หลัก" else 1)

            result.extend(site_items)

        # 🔥 เขียนทับ DATA ใหม่ (ลบตัวซ้ำ)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        # 🔥 แปลงเป็น map
        data_map = {item["id"]: item for item in result}

        print(f"✅ CLEAN DATA: {len(result)} รายการ")

        return data_map, site_order

    except Exception as e:
        print("❌ load data error:", e)
        return {}, []


def extract_id_from_url(url):
    try:
        return url.split("/")[-1].replace("@", "").lower()
    except:
        return ""


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


def check_banned(driver):
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        if "ถูกระงับ" in text or "suspended" in text.lower():
            return True
    except:
        pass
    return False


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

                    num = ''.join([c for c in val if c.isdigit()])
                    if num:
                        return int(num)

        return 0
    except:
        return 0


def send(text):
    try:
        requests.post(WEBHOOK_URL, json={"content": text})
    except:
        print("❌ discord error")


def main():
    print("🚀 BOT START")

    driver = connect()
    wait = WebDriverWait(driver, 20)

    data_map, site_order = load_and_clean_data()
    summary = {}

    for url in GROUP_URLS:
        try:
            driver.get(url)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(2)

            accounts = get_accounts(driver)

            for acc_url in accounts:
                try:
                    driver.get(acc_url)
                    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(2)

                    line_id = extract_id_from_url(acc_url)

                    if line_id not in data_map:
                        continue

                    info = data_map[line_id]
                    site = info["site"]
                    line_type = info["type"]

                    if site not in summary:
                        summary[site] = {
                            "main": 0,
                            "deposit": 0,
                            "banned": []
                        }

                    if check_banned(driver):
                        summary[site]["banned"].append(line_id)
                        print(f"🚨 {line_id} → ไลน์บิน")
                        continue

                    unread = get_unread(driver)

                    print(f"📊 {line_id} → {unread}")

                    if line_type == "หลัก":
                        summary[site]["main"] += unread
                    else:
                        summary[site]["deposit"] += unread

                except Exception as e:
                    print("acc error:", e)
                    continue

        except Exception as e:
            print("group error:", e)

    # 🔥 สร้างข้อความ (เรียงตาม Dashboard)
    text = "📊 LINE OA STATUS\n\n"

    for site in site_order:
        if site not in summary:
            continue

        val = summary[site]

        text += f"{site}\n"
        text += f"ไลน์หลัก {val['main']} แชท\n"
        text += f"ฝากถอน {val['deposit']} แชท\n"

        if val["banned"]:
            text += "🚨 ไลน์บิน:\n"
            for b in val["banned"]:
                text += f"- {b}\n"

        text += "--------------------\n\n"

    send(text)

    driver.quit()
    print("✅ DONE")


if __name__ == "__main__":
    main()