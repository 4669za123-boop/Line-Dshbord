"""
scan_one.py — สแกนกลุ่มไลน์เดียว (on-demand)
รับ argument: group_url
ส่งออก JSON ไปยัง stdout: {"ok": true, "accounts": [...]}
debug output ไปยัง stderr
"""
import sys
import json
import time
import os
import platform

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

CHROME_PROFILE_DIR = os.environ.get(
    "CHROME_PROFILE_SCAN",
    "/home/thaieasyvps/.line-chrome-profile-backup",
)

ACCOUNT_XPATH = (
    "//a[contains(@href,'/account/')"
    " and not(ancestor::nav)"
    " and not(ancestor::aside)"
    " and not(ancestor::header)"
    "]"
)


def dbg(msg):
    print(msg, file=sys.stderr, flush=True)


def connect():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-extensions")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--password-store=basic")
    options.add_argument("--memory-pressure-off")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    if os.path.exists(CHROME_PROFILE_DIR):
        for lock_file in ["SingletonLock", "SingletonSocket", "SingletonCookie"]:
            lp = os.path.join(CHROME_PROFILE_DIR, lock_file)
            if os.path.exists(lp):
                try:
                    os.remove(lp)
                except Exception:
                    pass
        options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
        dbg(f"✅ Chrome profile: {CHROME_PROFILE_DIR}")
    else:
        dbg(f"⚠️  ไม่พบ profile: {CHROME_PROFILE_DIR}")

    if platform.system() == "Linux":
        import glob as _glob
        candidates = (
            [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
            ]
            + _glob.glob("/nix/store/*chromium*/bin/chromium")
        )
        for binary in candidates:
            if os.path.exists(binary):
                options.binary_location = binary
                dbg(f"✅ Chrome: {binary}")
                break

    for cd_path in [
        "/tmp/chromedriver-linux64/chromedriver",
        "/home/thaieasyvps/chromedriver",
        "/usr/local/bin/chromedriver",
        "/usr/bin/chromedriver",
    ]:
        if os.path.exists(cd_path):
            try:
                driver = webdriver.Chrome(service=Service(cd_path), options=options)
                dbg(f"✅ chromedriver: {cd_path}")
                return driver
            except Exception as e:
                dbg(f"⚠️  {cd_path}: {e}")

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    except Exception:
        return webdriver.Chrome(options=options)


def extract_id(url):
    try:
        return url.rstrip("/").split("/")[-1].replace("@", "").lower()
    except Exception:
        return ""


def get_name(driver, fallback):
    try:
        for tag in ["h2", "h1"]:
            for el in driver.find_elements(By.TAG_NAME, tag):
                t = el.text.strip()
                if t and len(t) < 100 and t.lower() not in ("line", "line official account manager"):
                    return t
        title = driver.title or ""
        for sep in [" | ", " - "]:
            if sep in title:
                p = title.split(sep)[0].strip()
                if p and len(p) < 100:
                    return p
        for m in driver.find_elements(By.XPATH, "//meta[@property='og:title']"):
            c = m.get_attribute("content")
            if c and len(c) < 100:
                return c.strip()
    except Exception:
        pass
    return fallback


def is_suspended(driver):
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        return (
            "ถูกระงับ" in text
            or "ระงับการใช้งาน" in text
            or "suspended" in text.lower()
        )
    except Exception:
        return False


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: scan_one.py <group_url>"}))
        sys.exit(1)

    group_url = sys.argv[1]
    dbg(f"🔍 SCAN_ONE เริ่มสแกน: {group_url}")

    driver = None
    try:
        driver = connect()
        wait = WebDriverWait(driver, 20)

        driver.get(group_url)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(2)

        acc_urls = set()
        for _ in range(8):
            driver.execute_script("window.scrollBy(0, 800);")
            time.sleep(0.8)
            for l in driver.find_elements(By.XPATH, ACCOUNT_XPATH):
                href = l.get_attribute("href")
                if href:
                    acc_urls.add(href.split("?")[0])

        dbg(f"   พบ {len(acc_urls)} account links")

        accounts = []
        for acc_url in acc_urls:
            line_id = extract_id(acc_url)
            if not line_id:
                continue
            try:
                driver.get(acc_url)
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(1.5)
                name = get_name(driver, line_id)
                status = "suspended" if is_suspended(driver) else "normal"
                accounts.append({"lineId": line_id, "name": name, "url": acc_url, "status": status})
                dbg(f"   ✅ {name} ({line_id}) → {status}")
            except Exception as e:
                dbg(f"   ❌ {line_id}: {e}")
                accounts.append({"lineId": line_id, "name": line_id, "url": acc_url, "status": "normal"})

        print(json.dumps({"ok": True, "accounts": accounts}), flush=True)

    except Exception as e:
        dbg(f"❌ error: {e}")
        print(json.dumps({"ok": False, "error": str(e)}), flush=True)
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    main()
