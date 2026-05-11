"""
backup-scanner.py — สแกนกลุ่มไลน์สำรองโดยเฉพาะ
อ่าน backup-groups.json → สแกนแต่ละกลุ่ม (รองรับหลายหน้า) → POST /api/backup-accounts
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
from selenium.common.exceptions import (
    NoSuchElementException,
    ElementClickInterceptedException,
    StaleElementReferenceException,
    TimeoutException,
)

BACKUP_GROUPS_FILE  = "data/backup-groups.json"
API_BASE            = os.environ.get("API_BASE", "http://localhost:3000/api")
BACKUP_ACCOUNTS_URL = f"{API_BASE}/backup-accounts"
CHROME_PROFILE_DIR  = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile")
SCAN_INTERVAL       = int(os.environ.get("BACKUP_SCAN_INTERVAL", "120"))  # ทุก 2 นาที

# XPath ที่ใช้ค้นหา pagination ของหน้า LINE OA Manager
_NEXT_BTN_XPATHS = [
    # ลูกศร ">" / "›" / "Next"
    "//button[contains(@aria-label,'next') or contains(@aria-label,'Next')]",
    "//a[contains(@aria-label,'next') or contains(@aria-label,'Next')]",
    "//*[contains(@class,'pagination')]//*[contains(text(),'>') or contains(text(),'›') or contains(text(),'»')]",
    "//*[contains(@class,'next') and not(@disabled)]",
    "//*[contains(@class,'pager-next') and not(@disabled)]",
]

_PAGE_NUM_XPATHS = [
    "//*[contains(@class,'pagination')]//button[not(@disabled)][normalize-space(text())]",
    "//*[contains(@class,'pagination')]//a[not(@disabled)][normalize-space(text())]",
    "//*[contains(@class,'pager')]//button[not(@disabled)][normalize-space(text())]",
    "//*[contains(@class,'pager')]//a[not(@disabled)][normalize-space(text())]",
]


# ─────────────────────────────────────────────────────────────────────────────

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


# ─── Pagination helpers ───────────────────────────────────────────────────────

def _detect_total_pages(driver):
    """พยายามหาจำนวนหน้าทั้งหมดจาก pagination element"""
    for xpath in _PAGE_NUM_XPATHS:
        try:
            btns = driver.find_elements(By.XPATH, xpath)
            nums = []
            for b in btns:
                t = b.text.strip()
                if t.isdigit():
                    nums.append(int(t))
            if nums:
                return max(nums)
        except Exception:
            pass

    # ลองดูจาก URL parameter ?page=N หรือ text "หน้า X / Y"
    try:
        body = driver.find_element(By.TAG_NAME, "body").text
        import re
        m = re.search(r"(\d+)\s*/\s*(\d+)", body)
        if m:
            return int(m.group(2))
    except Exception:
        pass

    return 1  # ไม่พบ pagination → หน้าเดียว


def _get_page_urls(group_url, total_pages):
    """
    สร้าง URL ของแต่ละหน้า
    รองรับทั้ง ?page=N และ &page=N
    """
    urls = [group_url]
    if total_pages <= 1:
        return urls

    base = group_url.split("?")[0]
    qs   = group_url.split("?")[1] if "?" in group_url else ""

    import re, urllib.parse as up
    params = dict(p.split("=", 1) for p in qs.split("&") if "=" in p) if qs else {}

    for p in range(2, total_pages + 1):
        params["page"] = str(p)
        qs_new = "&".join(f"{k}={v}" for k, v in params.items())
        urls.append(f"{base}?{qs_new}")

    return urls


def _click_page_button(driver, wait, page_num):
    """คลิกปุ่มหมายเลขหน้า page_num ใน pagination"""
    for xpath in _PAGE_NUM_XPATHS:
        try:
            btns = driver.find_elements(By.XPATH, xpath)
            for btn in btns:
                if btn.text.strip() == str(page_num):
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    time.sleep(0.3)
                    btn.click()
                    time.sleep(2)
                    return True
        except (StaleElementReferenceException, ElementClickInterceptedException):
            pass
    return False


def _click_next_button(driver):
    """คลิกปุ่ม Next / ›  — คืน True ถ้าสำเร็จ"""
    for xpath in _NEXT_BTN_XPATHS:
        try:
            btns = driver.find_elements(By.XPATH, xpath)
            for btn in btns:
                if btn.is_enabled() and btn.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    time.sleep(0.3)
                    btn.click()
                    time.sleep(2)
                    return True
        except (StaleElementReferenceException, ElementClickInterceptedException,
                NoSuchElementException):
            pass
    return False


# ─── Collect account links from current page ─────────────────────────────────

def _collect_accounts_on_page(driver):
    """Scroll หน้าปัจจุบัน แล้วเก็บ account URL ทั้งหมด"""
    accounts = set()
    last_height = 0
    for _ in range(8):
        driver.execute_script("window.scrollBy(0, 600);")
        time.sleep(0.8)
        links = driver.find_elements(By.XPATH, "//a[contains(@href,'/account/')]")
        for l in links:
            href = l.get_attribute("href")
            if href:
                accounts.add(href.split("?")[0])
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height
    return accounts


def collect_all_accounts(driver, wait, group_url):
    """
    เข้า group_url แล้วดึง account URL **ทุกหน้า**
    กลยุทธ์:
      1. ตรวจจำนวนหน้าทั้งหมดจาก pagination element
      2. ถ้า URL รองรับ ?page=N → navigate ตรง
      3. ถ้าไม่ → คลิกปุ่มหมายเลขหน้า → ถ้าไม่ได้ → คลิก next ›
    """
    driver.get(group_url)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(2)

    all_accounts = set()

    # หน้าแรก
    page_accounts = _collect_accounts_on_page(driver)
    all_accounts.update(page_accounts)

    total_pages = _detect_total_pages(driver)
    print(f"   📄 ตรวจพบ {total_pages} หน้า")

    if total_pages <= 1:
        return list(all_accounts)

    # ── วิธีที่ 1: navigate ผ่าน URL ?page=N ──────────────────────────────
    page_urls = _get_page_urls(group_url, total_pages)
    if len(page_urls) > 1:
        print(f"   🔗 ใช้ URL pagination (?page=N)")
        for pg_num, pg_url in enumerate(page_urls[1:], start=2):
            print(f"   ➡️  หน้า {pg_num}/{total_pages}")
            try:
                driver.get(pg_url)
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(2)
                pg_accounts = _collect_accounts_on_page(driver)
                if not pg_accounts:
                    print(f"   ⚠️  หน้า {pg_num} ไม่มี account — หยุดวน")
                    break
                all_accounts.update(pg_accounts)
                print(f"      +{len(pg_accounts)} account (รวม {len(all_accounts)})")
            except Exception as e:
                print(f"   ❌ หน้า {pg_num} error: {e}")
        return list(all_accounts)

    # ── วิธีที่ 2: คลิกปุ่มหมายเลขหน้า ──────────────────────────────────
    print(f"   🖱️  ใช้การคลิกปุ่ม pagination")
    for pg_num in range(2, total_pages + 1):
        print(f"   ➡️  หน้า {pg_num}/{total_pages}")
        # โหลดกลับไปที่ group_url ก่อนเพื่อ reset state
        driver.get(group_url)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(1.5)
        if not _click_page_button(driver, wait, pg_num):
            # ── วิธีที่ 3: คลิก next › ────────────────────────────────
            for _ in range(pg_num - 1):
                if not _click_next_button(driver):
                    print(f"   ⚠️  ไม่พบปุ่ม next — หยุดที่หน้า {pg_num}")
                    return list(all_accounts)
        pg_accounts = _collect_accounts_on_page(driver)
        if not pg_accounts:
            print(f"   ⚠️  หน้า {pg_num} ไม่มี account — หยุดวน")
            break
        all_accounts.update(pg_accounts)
        print(f"      +{len(pg_accounts)} account (รวม {len(all_accounts)})")

    return list(all_accounts)


# ─── Account detail ───────────────────────────────────────────────────────────

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


# ─── Main scan ────────────────────────────────────────────────────────────────

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
                acc_urls = collect_all_accounts(driver, wait, group_url)
                print(f"   รวมพบ {len(acc_urls)} account (ทุกหน้า)")

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
            res = requests.post(BACKUP_ACCOUNTS_URL, json={"accounts": found}, timeout=15)
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
