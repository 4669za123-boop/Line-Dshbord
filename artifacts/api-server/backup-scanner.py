"""
backup-scanner.py — สแกนกลุ่มไลน์สำรองโดยเฉพาะ
อ่าน backup-groups.json → สแกนแต่ละกลุ่ม (รองรับ N หน้า ไม่จำกัด) → POST /api/backup-accounts
ทำงานแยกจาก checker.py เพื่อไม่ให้ blocking กัน

กลยุทธ์ pagination (เรียงตามความน่าเชื่อถือ):
  1. คลิก next ›  ไปเรื่อยๆ จนไม่มีหรือ disabled  ← หลัก, ใช้ได้กับทุกจำนวนหน้า
  2. URL ?page=N ถ้า page 2 โหลดได้และมี account  ← ใช้เสริมยืนยัน
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
API_BASE            = os.environ.get("API_BASE", "http://localhost:8080/api")
BACKUP_ACCOUNTS_URL = f"{API_BASE}/backup-accounts"
CHROME_PROFILE_DIR  = os.environ.get("CHROME_PROFILE_DIR", "/home/thaieasyvps/.line-chrome-profile-backup")
SCAN_INTERVAL       = int(os.environ.get("BACKUP_SCAN_INTERVAL", "120"))  # ทุก 2 นาที
MAX_PAGES           = int(os.environ.get("MAX_PAGES", "200"))              # safety cap

# XPath ค้นหาปุ่ม Next  (ไม่ disabled)
_NEXT_XPATHS = [
    "//button[not(@disabled)][contains(@aria-label,'next') or contains(@aria-label,'Next')]",
    "//a[not(@disabled)][contains(@aria-label,'next') or contains(@aria-label,'Next')]",
    "//*[contains(@class,'pagination')]//button[not(@disabled)][normalize-space(text())='>' or normalize-space(text())='›' or normalize-space(text())='»' or normalize-space(text())='Next']",
    "//*[contains(@class,'pagination')]//a[not(@disabled)][normalize-space(text())='>' or normalize-space(text())='›' or normalize-space(text())='»' or normalize-space(text())='Next']",
    "//*[contains(@class,'pager-next') and not(contains(@class,'disabled'))]",
    "//*[contains(@class,'next-page') and not(contains(@class,'disabled'))]",
    # ลูกศร SVG ห่อด้วย button ที่ไม่ disabled
    "//button[not(@disabled)][.//*[local-name()='svg'] and (contains(@class,'next') or contains(@class,'forward'))]",
]

# XPath ตรวจว่าปุ่ม Next ถูก disabled แล้ว (หมดหน้าแล้ว)
_NEXT_DISABLED_XPATHS = [
    "//*[contains(@class,'pagination')]//button[@disabled][normalize-space(text())='>' or normalize-space(text())='›' or normalize-space(text())='»']",
    "//*[contains(@class,'pager-next') and contains(@class,'disabled')]",
    "//*[contains(@class,'next-page') and contains(@class,'disabled')]",
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
    options.add_argument("--password-store=basic")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

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
                print(f"✅ ใช้ chromedriver: {cd_path}")
                return driver
            except Exception:
                continue

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"⚠️  webdriver_manager ไม่ได้: {e} — ลอง default")
        return webdriver.Chrome(options=options)


# ─── Pagination ───────────────────────────────────────────────────────────────

_BAD_NAMES = {"line official account manager", "line", ""}


def _extract_name_from_row(link_el):
    """ดึงชื่อ account จาก row รอบๆ link บนหน้า group list"""
    for depth in range(1, 7):
        xpath = "/".join([".."] * depth)
        try:
            ancestor = link_el.find_element(By.XPATH, xpath)
            for line in ancestor.text.strip().split("\n"):
                t = line.strip()
                if t and len(t) < 80 and t.lower() not in _BAD_NAMES and "LINE Official" not in t:
                    return t
        except Exception:
            break
    return ""


def _collect_accounts_on_page(driver):
    """Scroll + เก็บ account URL → ชื่อ จากหน้าปัจจุบัน"""
    accounts = {}   # url → name
    last_h   = 0
    # ตัด nav/aside/header ออก เพื่อไม่ดูด sidebar/navigation accounts
    _ACCOUNT_XPATH = (
        "//a[contains(@href,'/account/')"
        " and not(ancestor::nav)"
        " and not(ancestor::aside)"
        " and not(ancestor::header)"
        "]"
    )
    for _ in range(10):
        driver.execute_script("window.scrollBy(0, 600);")
        time.sleep(0.7)
        links = driver.find_elements(By.XPATH, _ACCOUNT_XPATH)
        for l in links:
            href = l.get_attribute("href")
            if not href:
                continue
            url = href.split("?")[0]
            if url not in accounts:
                accounts[url] = _extract_name_from_row(l)
        new_h = driver.execute_script("return document.body.scrollHeight")
        if new_h == last_h:
            break
        last_h = new_h
    return accounts


def _is_next_disabled(driver):
    """คืน True ถ้าพบปุ่ม Next ที่ disabled อยู่"""
    for xpath in _NEXT_DISABLED_XPATHS:
        try:
            els = driver.find_elements(By.XPATH, xpath)
            if els:
                return True
        except Exception:
            pass
    return False


def _click_next(driver):
    """
    คลิกปุ่ม Next ›
    คืน True ถ้าคลิกสำเร็จ, False ถ้าไม่พบหรือ disabled
    """
    # ถ้า next disabled แน่นอนแล้ว → หยุดเลย
    if _is_next_disabled(driver):
        return False

    for xpath in _NEXT_XPATHS:
        try:
            els = driver.find_elements(By.XPATH, xpath)
            for el in els:
                if el.is_displayed():
                    driver.execute_script(
                        "arguments[0].scrollIntoView({block:'nearest'});", el
                    )
                    time.sleep(0.3)
                    try:
                        el.click()
                    except ElementClickInterceptedException:
                        driver.execute_script("arguments[0].click();", el)
                    time.sleep(2)
                    return True
        except (StaleElementReferenceException, NoSuchElementException):
            pass

    return False  # ไม่พบปุ่ม next เลย → หมดหน้าแล้ว


def _get_current_url_snapshot(driver):
    """ดึง URL + จำนวน account ปัจจุบัน เพื่อ detect ว่าหน้าเปลี่ยนจริงไหม"""
    try:
        return driver.current_url
    except Exception:
        return ""


def collect_all_accounts(driver, wait, group_url):
    """
    เข้า group_url แล้วดึง account URL **ทุกหน้า** ไม่จำกัดจำนวนหน้า
    ใช้วิธี: เก็บหน้าปัจจุบัน → คลิก Next → เก็บ → วนจนหมด
    """
    driver.get(group_url)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(2)

    all_accounts      = {}   # url → name
    page_num          = 1
    consecutive_same  = 0

    while page_num <= MAX_PAGES:
        pg_accounts = _collect_accounts_on_page(driver)   # dict url→name
        new_urls    = set(pg_accounts) - set(all_accounts)
        new_count   = len(new_urls)

        if page_num == 1:
            print(f"   📄 หน้า 1 — พบ {len(pg_accounts)} account")
        else:
            print(f"   ➡️  หน้า {page_num} — +{new_count} ใหม่ (รวม {len(all_accounts) + new_count})")

        if new_count == 0 and page_num > 1:
            consecutive_same += 1
            if consecutive_same >= 2:
                print(f"   ⚠️  ไม่มี account ใหม่ {consecutive_same} หน้าติดกัน → หยุด")
                break
        else:
            consecutive_same = 0

        all_accounts.update(pg_accounts)

        if not _click_next(driver):
            print(f"   ✅ ไม่มีหน้าถัดไป — สแกนครบ {page_num} หน้า")
            break

        time.sleep(2)

        test_accounts = _collect_accounts_on_page(driver)
        if test_accounts and set(test_accounts) == set(pg_accounts):
            print(f"   ✅ content ไม่เปลี่ยนหลังคลิก next — สแกนครบแล้ว")
            break

        page_num += 1

    print(f"   📦 รวมทั้งหมด {len(all_accounts)} account จาก {page_num} หน้า")
    return all_accounts   # dict url → name


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
                acc_dict = collect_all_accounts(driver, wait, group_url)  # url→name

                for acc_url, acc_name in acc_dict.items():
                    line_id = extract_id_from_url(acc_url)
                    if not line_id:
                        continue
                    # ถ้าชื่อว่างหรือเป็น generic name → เปิดหน้า account จริงเพื่อดึงชื่อ
                    bad = {"line official account manager", "line", ""}
                    if not acc_name or acc_name.lower() in bad or "LINE Official" in acc_name:
                        try:
                            driver.get(acc_url)
                            time.sleep(2)
                            acc_name = get_account_name(driver, "")
                            # กลับไปหน้า group (ไม่ต้อง scroll ใหม่ เพราะเก็บ acc_dict แล้ว)
                        except Exception as e:
                            print(f"   ⚠️  fetch account name: {e}")
                    line_name = acc_name if acc_name and acc_name.lower() not in bad else line_id
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
                        "confirmed":      True,
                        "scannedAt":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    })

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
