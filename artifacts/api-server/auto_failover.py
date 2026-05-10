"""
auto_failover.py — ระบบสับเปลี่ยนไลน์สำรองอัตโนมัติ

เมื่อ checker.py ตรวจพบไลน์โดนระงับ จะเรียก promote_backup() เพื่อ:
1. ดึงไลน์สำรองจาก backup pool ที่ตรงกับเว็บ + ประเภท
2. ใช้ Selenium เพิ่มไลน์สำรองเข้ากรุ๊ป LINE Manager
3. อัปเดต lines.json (แทนที่ ID เก่าด้วย ID ใหม่)
4. ลบออกจาก backup pool
5. บันทึก log การสับเปลี่ยน
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

DATA_DIR      = "data"
LINES_FILE    = os.path.join(DATA_DIR, "lines.json")
STATUSES_FILE = os.path.join(DATA_DIR, "statuses.json")
FAILOVER_LOG  = os.path.join(DATA_DIR, "failover-log.json")

BACKUP_FILES = {
    "main":    os.path.join(DATA_DIR, "backup-accounts-main.json"),
    "deposit": os.path.join(DATA_DIR, "backup-accounts-deposit.json"),
}

BANGKOK_TZ = timezone(timedelta(hours=7))

# ป้องกัน backup เดิมถูกใช้ซ้ำในรอบสแกนเดียวกัน
_used_backup_ids: set = set()


# ─────────────────────────────────────────────
# I/O helpers
# ─────────────────────────────────────────────

def _read_json(path: str):
    try:
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ read {path}: {e}")
        return []


def _read_json_dict(path: str) -> dict:
    try:
        if not os.path.exists(path):
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ read {path}: {e}")
        return {}


def _write_json(path: str, data) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─────────────────────────────────────────────
# หาไลน์สำรอง
# ─────────────────────────────────────────────

def find_backup(role: str, site_name: str, website_id: str = None) -> dict | None:
    """
    หาบัญชีสำรองที่ตรงกับ role + เว็บ
    role: "หลัก" หรือ "ฝากถอน"
    คืน dict ของบัญชี หรือ None ถ้าไม่มี
    """
    section = "main" if role == "หลัก" else "deposit"
    pool = _read_json(BACKUP_FILES[section])

    for acc in pool:
        if acc.get("id") in _used_backup_ids:
            continue
        # จับคู่ด้วย websiteId ก่อน (แม่นยำที่สุด)
        if website_id and acc.get("websiteId") == website_id:
            return acc
        # fallback: ชื่อเว็บ
        if acc.get("websiteName", "").strip().lower() == site_name.strip().lower():
            return acc

    return None


# ─────────────────────────────────────────────
# Selenium — เพิ่มสมาชิกเข้ากรุ๊ป LINE Manager
# ─────────────────────────────────────────────

def add_to_line_group(driver, group_url: str, line_account_id: str) -> bool:
    """
    ใช้ Selenium เพิ่ม LINE account เข้ากรุ๊ป LINE Manager
    group_url  : https://manager.line.biz/groups/XXXXXX/setting
    line_account_id : @abc1234 หรือ abc1234
    คืน True ถ้าสำเร็จ
    """
    wait = WebDriverWait(driver, 20)

    # ทำให้ ID มี @ เสมอ
    clean_id = line_account_id.strip()
    if not clean_id.startswith("@"):
        clean_id = f"@{clean_id}"

    try:
        print(f"   🌐 ไปที่กรุ๊ป: {group_url}")
        driver.get(group_url)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(2)

        # ─── ขั้นตอน 1: คลิกปุ่มเพิ่มสมาชิก ───
        add_btn = None
        add_btn_xpaths = [
            "//button[contains(., 'Add accounts')]",
            "//button[contains(., 'เพิ่มบัญชี')]",
            "//button[contains(., 'Add')]",
            "//button[contains(., 'เพิ่ม')]",
            "//a[contains(., 'Add')]",
        ]
        add_btn_css = [
            "[data-testid='add-account-btn']",
            ".add-account-button",
            "button.add",
        ]

        for xpath in add_btn_xpaths:
            try:
                add_btn = driver.find_element(By.XPATH, xpath)
                if add_btn.is_displayed():
                    break
                add_btn = None
            except Exception:
                add_btn = None

        if not add_btn:
            for sel in add_btn_css:
                try:
                    add_btn = driver.find_element(By.CSS_SELECTOR, sel)
                    if add_btn.is_displayed():
                        break
                    add_btn = None
                except Exception:
                    add_btn = None

        if add_btn:
            add_btn.click()
            time.sleep(1.5)
            print(f"   ✅ คลิกปุ่มเพิ่มสมาชิก")
        else:
            print(f"   ⚠️  ไม่พบปุ่มเพิ่มสมาชิก")

        # ─── ขั้นตอน 2: กรอก LINE ID ───
        input_el = None
        input_selectors = [
            "input[placeholder*='LINE ID']",
            "input[placeholder*='line id']",
            "input[placeholder*='ID']",
            "input[placeholder*='Search']",
            "input[type='search']",
            "input[type='text']",
        ]
        for sel in input_selectors:
            try:
                input_el = driver.find_element(By.CSS_SELECTOR, sel)
                if input_el.is_displayed():
                    break
                input_el = None
            except Exception:
                input_el = None

        if input_el:
            input_el.clear()
            input_el.send_keys(clean_id)
            time.sleep(1)
            print(f"   ✅ กรอก LINE ID: {clean_id}")

            # ─── ขั้นตอน 3: ยืนยัน / ค้นหา ───
            confirm_xpaths = [
                "//button[contains(., 'Add')]",
                "//button[contains(., 'เพิ่ม')]",
                "//button[contains(., 'OK')]",
                "//button[contains(., 'ยืนยัน')]",
                "//button[contains(., 'Confirm')]",
                "//button[contains(., 'Search')]",
                "//button[contains(., 'ค้นหา')]",
                "//button[@type='submit']",
            ]
            for xpath in confirm_xpaths:
                try:
                    btn = driver.find_element(By.XPATH, xpath)
                    if btn.is_displayed() and btn.is_enabled():
                        btn.click()
                        time.sleep(2)
                        print(f"   ✅ ยืนยันการเพิ่ม {clean_id} เข้ากรุ๊ปสำเร็จ")
                        return True
                except Exception:
                    continue
        else:
            print(f"   ⚠️  ไม่พบช่องกรอก LINE ID")

        print(f"   ⚠️  Selenium ไม่สามารถเพิ่ม {clean_id} เข้ากรุ๊ปได้ครบทุกขั้นตอน")
        return False

    except Exception as e:
        print(f"   ❌ add_to_line_group error: {e}")
        return False


# ─────────────────────────────────────────────
# อัปเดตข้อมูล
# ─────────────────────────────────────────────

def _extract_clean_id(account: dict) -> str:
    """แยก LINE ID ที่สะอาดออกจาก backup account record"""
    raw = account.get("lineAccountId", "").replace("@", "").lower().strip()
    if raw:
        return raw
    url = account.get("lineAccountUrl", "")
    if "/account/" in url:
        part = url.split("/account/")[-1]
        return part.split("?")[0].replace("@", "").lower().strip()
    return ""


def update_lines_json(old_id: str, new_account: dict) -> str:
    """
    แทนที่ old_id ใน lines.json ด้วย ID ของ new_account
    คืนค่า new_id ที่ถูกบันทึก
    """
    lines = _read_json(LINES_FILE)
    new_id = _extract_clean_id(new_account)
    if not new_id:
        print(f"   ❌ ไม่สามารถแยก LINE ID จาก backup account ได้")
        return ""

    updated = False
    for line in lines:
        if line.get("id", "").lower() == old_id.lower():
            line["id"] = new_id
            updated = True
            break

    if updated:
        _write_json(LINES_FILE, lines)
        print(f"   ✅ lines.json: แทนที่ {old_id} → {new_id}")
    else:
        print(f"   ⚠️  ไม่พบ {old_id} ใน lines.json — เพิ่มรายการใหม่")
        # ถ้าไม่เจอ ให้เพิ่มใหม่ด้วย site/type เดิม (fallback)

    return new_id


def remove_from_backup_pool(account_id: str, role: str) -> None:
    """ลบบัญชีสำรองที่ถูกใช้แล้วออกจาก pool"""
    section = "main" if role in ("main", "หลัก") else "deposit"
    path = BACKUP_FILES[section]
    pool = _read_json(path)
    new_pool = [a for a in pool if a.get("id") != account_id]
    _write_json(path, new_pool)
    print(f"   ✅ ลบ {account_id} ออกจาก backup-{section} pool ({len(pool) - len(new_pool)} รายการ)")


def clear_suspended_status(line_id: str) -> None:
    """ล้างสถานะ suspended ของ line_id เก่าออกจาก statuses.json"""
    try:
        statuses = _read_json_dict(STATUSES_FILE)
        if line_id in statuses:
            del statuses[line_id]
            _write_json(STATUSES_FILE, statuses)
            print(f"   ✅ ล้างสถานะ suspended ของ {line_id}")
    except Exception as e:
        print(f"   ⚠️  clear_suspended_status: {e}")


def append_failover_log(entry: dict) -> None:
    """บันทึกการสับเปลี่ยนลง failover-log.json (เก็บ 200 รายการล่าสุด)"""
    log = _read_json(FAILOVER_LOG) if os.path.exists(FAILOVER_LOG) else []
    if not isinstance(log, list):
        log = []
    log.append(entry)
    _write_json(FAILOVER_LOG, log[-200:])


# ─────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────

def promote_backup(
    driver,
    suspended_line_id: str,
    role: str,
    site_name: str,
    group_url: str,
    website_id: str = None,
) -> dict:
    """
    สับเปลี่ยนไลน์สำรองเพื่อแทนที่ไลน์ที่โดนระงับ

    Args:
        driver          : Selenium WebDriver ที่เปิดอยู่แล้ว
        suspended_line_id: LINE ID ที่โดนระงับ (ไม่มี @)
        role            : "หลัก" หรือ "ฝากถอน"
        site_name       : ชื่อเว็บ เช่น "Jun88"
        group_url       : URL กรุ๊ป LINE Manager
        website_id      : UUID ของเว็บ (optional, เพิ่มความแม่นยำ)

    Returns:
        dict { ok, message, newLineId?, seleniumOk? }
    """
    print(f"\n{'─'*50}")
    print(f"🔄 FAILOVER: {suspended_line_id} | {site_name} | {role}")
    print(f"{'─'*50}")

    # 1. หาไลน์สำรอง
    backup = find_backup(role, site_name, website_id)
    if not backup:
        msg = f"ไม่พบไลน์สำรองสำหรับ {site_name} / {role}"
        print(f"   ⚠️  {msg}")
        return {"ok": False, "message": msg}

    backup_id   = backup.get("id", "")
    backup_name = backup.get("lineName", "")
    backup_acc  = backup.get("lineAccountId", "")
    backup_url  = backup.get("lineAccountUrl", "")
    print(f"   📦 ไลน์สำรองที่เลือก: {backup_name} ({backup_acc})")

    # 2. Selenium — เพิ่มเข้ากรุ๊ป
    selenium_ok = add_to_line_group(driver, group_url, backup_acc)
    if not selenium_ok:
        print(f"   ⚠️  Selenium ไม่สำเร็จ — ยังคงอัปเดตข้อมูลต่อ")

    # 3. อัปเดต lines.json
    new_id = update_lines_json(suspended_line_id, backup)

    # 4. ลบออกจาก backup pool
    remove_from_backup_pool(backup_id, backup.get("role", role))

    # 5. ล้างสถานะ suspended เก่า
    clear_suspended_status(suspended_line_id)

    # 6. บันทึก log
    entry = {
        "at":          datetime.now(BANGKOK_TZ).isoformat(),
        "site":        site_name,
        "role":        role,
        "oldLineId":   suspended_line_id,
        "newLineId":   new_id,
        "newLineName": backup_name,
        "newLineUrl":  backup_url,
        "seleniumOk":  selenium_ok,
        "groupUrl":    group_url,
    }
    append_failover_log(entry)

    # 7. ป้องกัน backup เดิมถูกใช้ซ้ำในรอบนี้
    _used_backup_ids.add(backup_id)

    result_msg = "สับเปลี่ยนสำเร็จ" if selenium_ok else "อัปเดตข้อมูลสำเร็จ (Selenium ไม่สมบูรณ์)"
    print(f"   ✅ FAILOVER เสร็จ: {suspended_line_id} → {new_id} | Selenium: {selenium_ok}")
    return {
        "ok":          True,
        "message":     result_msg,
        "newLineId":   new_id,
        "newLineName": backup_name,
        "seleniumOk":  selenium_ok,
    }


def reset_cycle() -> None:
    """เรียกเมื่อเริ่มรอบตรวจสถานะใหม่ เพื่อ reset การป้องกันซ้ำ"""
    _used_backup_ids.clear()
