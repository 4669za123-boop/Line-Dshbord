"""
auto_failover.py — ระบบสับเปลี่ยนไลน์สำรองอัตโนมัติ

เมื่อ checker.py ตรวจพบไลน์โดนระงับ จะเรียก promote_backup() เพื่อ:
1. หาไลน์สำรองจาก backup pool ที่ตรงกับเว็บ + ประเภท
2. ใช้ Selenium เข้าหน้า Group Settings ของเว็บนั้น:
   a. ลบบัญชีที่โดนระงับออกจากกรุ๊ป (ค้นหาจาก LINE ID)
   b. กดปุ่ม "เพิ่ม" แล้วเลื่อนหาชื่อบัญชีสำรอง (lineName) แล้วกด "เพิ่มบัญชี"
3. อัปเดต lines.json (แทนที่ ID เก่าด้วย ID ใหม่)
4. ลบออกจาก backup pool
5. บันทึก log การสับเปลี่ยน

ลำดับขั้นตอน:
  Selenium (ลบ+เพิ่ม) → อัปเดตข้อมูล → checker.py รอบถัดไปยืนยันสถานะ
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

DATA_DIR      = "data"
LINES_FILE    = os.path.join(DATA_DIR, "lines.json")
STATUSES_FILE = os.path.join(DATA_DIR, "statuses.json")
FAILOVER_LOG  = os.path.join(DATA_DIR, "failover-log.json")

BACKUP_FILES = {
    "main":    os.path.join(DATA_DIR, "backup-accounts-main.json"),
    "deposit": os.path.join(DATA_DIR, "backup-accounts-deposit.json"),
}

BANGKOK_TZ = timezone(timedelta(hours=7))
WAIT_TIMEOUT = 15

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
# Selenium — ลบบัญชีเก่า + เพิ่มบัญชีใหม่
# ─────────────────────────────────────────────

def _wait_click(driver, by, selector, timeout=WAIT_TIMEOUT):
    """รอให้ element คลิกได้แล้วคลิก"""
    el = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, selector))
    )
    el.click()
    return el


def _wait_visible(driver, by, selector, timeout=WAIT_TIMEOUT):
    """รอให้ element มองเห็น"""
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, selector))
    )


def remove_account_from_group(driver, suspended_line_id: str) -> bool:
    """
    ลบบัญชีที่โดนระงับออกจากกรุ๊ป LINE Manager
    ค้นหาจาก LINE ID ในลิงก์ href ของแถวในตาราง
    คืน True ถ้าลบสำเร็จ
    """
    print(f"   🗑️  ลบบัญชี: {suspended_line_id}")
    clean_id = suspended_line_id.replace("@", "").lower().strip()

    max_pages = 5
    for page in range(max_pages):
        # หาแถวที่มี href ของบัญชีที่ต้องการลบ
        rows = driver.find_elements(
            By.XPATH,
            f"//tr[.//a[contains(@href,'{clean_id}')]] | "
            f"//div[contains(@class,'account-row') and .//a[contains(@href,'{clean_id}')]]"
        )

        if rows:
            try:
                # กดปุ่ม "ลบ" ในแถวนั้น
                delete_btn = rows[0].find_element(
                    By.XPATH,
                    ".//button[normalize-space()='ลบ'] | "
                    ".//button[normalize-space()='Remove'] | "
                    ".//button[contains(@class,'delete') or contains(@class,'remove')]"
                )
                delete_btn.click()
                print(f"   ✅ กดปุ่ม 'ลบ' สำหรับบัญชี {clean_id}")
                time.sleep(1.5)

                # ถ้ามี confirm dialog ให้กด confirm
                try:
                    confirm = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable(
                            (By.XPATH,
                             "//button[contains(@class,'confirm')] | "
                             "//button[normalize-space()='ตกลง'] | "
                             "//button[normalize-space()='ยืนยัน'] | "
                             "//button[normalize-space()='OK']")
                        )
                    )
                    confirm.click()
                    print(f"   ✅ ยืนยันการลบแล้ว")
                    time.sleep(1.5)
                except TimeoutException:
                    pass  # ไม่มี confirm dialog ก็ผ่าน

                print(f"   ✅ ลบบัญชี {clean_id} สำเร็จ!")
                return True

            except NoSuchElementException:
                print(f"   ⚠️  พบแถวแต่ไม่พบปุ่มลบ")
                return False

        # ลองไปหน้าถัดไป
        try:
            next_btn = driver.find_element(
                By.XPATH,
                "//button[@aria-label='Next page'] | "
                "//a[contains(@class,'next') and not(@disabled)]"
            )
            next_btn.click()
            time.sleep(2)
        except NoSuchElementException:
            break  # ไม่มีหน้าถัดไป

    print(f"   ⚠️  ไม่พบบัญชี {clean_id} ในกรุ๊ป")
    return False


def add_account_to_group(driver, backup_line_name: str) -> bool:
    """
    เพิ่มบัญชีสำรองเข้ากรุ๊ป LINE Manager
    ค้นหาจาก lineName โดยเลื่อน scroll ใน modal
    คืน True ถ้าเพิ่มสำเร็จ
    """
    print(f"   ➕ เพิ่มบัญชี: {backup_line_name}")

    try:
        # กดปุ่ม "เพิ่ม" (ปุ่มสีเขียวในส่วน การจัดการบัญชี)
        _wait_click(
            driver,
            By.XPATH,
            "//button[contains(@class,'btn') and normalize-space()='เพิ่ม'] | "
            "//button[normalize-space()='Add'] | "
            "//button[normalize-space()='เพิ่ม']"
        )
        print(f"   ✅ กดปุ่ม 'เพิ่ม' แล้ว")
        time.sleep(1.5)

        # รอ modal เปิด
        _wait_visible(
            driver,
            By.XPATH,
            "//div[contains(@class,'modal') and "
            "  .//*[contains(text(),'เพิ่มบัญชีนี้ที่กลุ่ม') or contains(text(),'Add account')]]"
        )
        print(f"   ✅ Modal เปิดแล้ว")

        # เลื่อนหาชื่อบัญชีใน list ฝั่งซ้าย
        account_found = False
        max_scroll = 15

        for _ in range(max_scroll):
            # หา item ที่ตรงชื่อ (ค้นหาแบบ contains เพื่อรองรับ emoji/ชื่อพิเศษ)
            items = driver.find_elements(
                By.XPATH,
                f"//div[contains(@class,'modal')]"
                f"//li[contains(normalize-space(),'{backup_line_name}')] | "
                f"//div[contains(@class,'modal')]"
                f"//div[contains(@class,'account-item') and contains(normalize-space(),'{backup_line_name}')]"
            )

            if items:
                items[0].click()
                print(f"   ✅ เลือกบัญชี '{backup_line_name}' แล้ว")
                account_found = True
                break

            # scroll ลงใน list
            try:
                scrollable = driver.find_element(
                    By.XPATH,
                    "//div[contains(@class,'modal')]//ul[contains(@class,'account-list')] | "
                    "//div[contains(@class,'modal')]//div[contains(@class,'list-wrap')]"
                )
                driver.execute_script("arguments[0].scrollTop += 150", scrollable)
            except NoSuchElementException:
                break
            time.sleep(0.5)

        if not account_found:
            print(f"   ⚠️  ไม่พบบัญชี '{backup_line_name}' ใน modal list")
            # ปิด modal แล้วคืน False
            try:
                driver.find_element(
                    By.XPATH,
                    "//div[contains(@class,'modal')]//button[contains(@class,'close') or normalize-space()='ยกเลิก' or normalize-space()='Cancel']"
                ).click()
            except Exception:
                pass
            return False

        time.sleep(0.5)

        # กดปุ่ม "เพิ่มบัญชี" (สีเขียว ใน modal)
        _wait_click(
            driver,
            By.XPATH,
            "//div[contains(@class,'modal')]//button[contains(normalize-space(),'เพิ่มบัญชี')] | "
            "//div[contains(@class,'modal')]//button[contains(normalize-space(),'Add account')]"
        )
        print(f"   ✅ กดปุ่ม 'เพิ่มบัญชี' แล้ว")
        time.sleep(2)

        # รอ modal ปิด
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.invisibility_of_element_located(
                (By.XPATH,
                 "//div[contains(@class,'modal') and "
                 "  .//*[contains(text(),'เพิ่มบัญชีนี้ที่กลุ่ม') or contains(text(),'Add account')]]")
            )
        )
        print(f"   ✅ เพิ่มบัญชี '{backup_line_name}' สำเร็จ!")
        return True

    except Exception as e:
        print(f"   ❌ add_account_to_group error: {e}")
        return False


def swap_line_in_group(
    driver,
    group_url: str,
    suspended_line_id: str,
    backup_line_name: str,
) -> bool:
    """
    สับเปลี่ยนไลน์ในกรุ๊ป LINE Manager:
      1. เปิดหน้า Group Settings
      2. ลบบัญชีที่โดนระงับ (ค้นหาจาก suspended_line_id)
      3. เพิ่มบัญชีสำรอง (ค้นหาจาก backup_line_name ใน modal)
    คืน True ถ้าทั้งลบและเพิ่มสำเร็จ
    """
    wait = WebDriverWait(driver, WAIT_TIMEOUT)

    try:
        print(f"   🌐 เปิดหน้า Group Settings: {group_url}")
        driver.get(group_url)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(3)  # รอหน้าโหลดสมบูรณ์

        # STEP 1: ลบบัญชีเก่าก่อน
        removed = remove_account_from_group(driver, suspended_line_id)
        if not removed:
            print(f"   ⚠️  ลบบัญชีเก่าไม่สำเร็จ — ยังคงดำเนินการเพิ่มบัญชีใหม่ต่อ")

        # STEP 2: เพิ่มบัญชีใหม่
        added = add_account_to_group(driver, backup_line_name)

        return added

    except Exception as e:
        print(f"   ❌ swap_line_in_group error: {e}")
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
        print(f"   ⚠️  ไม่พบ {old_id} ใน lines.json")

    return new_id


def remove_from_backup_pool(account_id: str, role: str) -> None:
    """ลบบัญชีสำรองที่ถูกใช้แล้วออกจาก pool (เพราะถูกดึงไปแสดงในแดชบอร์ดแล้ว)"""
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

    ลำดับการทำงาน:
      1. หาไลน์สำรองจาก pool
      2. Selenium: เปิด Group Settings → ลบไลน์เก่า → เพิ่มไลน์สำรอง
         (ไลน์ใหม่ปรากฏในแดชบอร์ดทันที)
      3. อัปเดต lines.json
      4. ลบออกจาก backup pool (เพราะถูกดึงไปใช้แล้ว)
      5. ล้างสถานะ suspended เก่า
      6. บันทึก log
      → checker.py รอบถัดไปจะตรวจยืนยันสถานะออนไลน์เอง

    Args:
        driver          : Selenium WebDriver ที่เปิดอยู่แล้ว
        suspended_line_id: LINE ID ที่โดนระงับ (ไม่มี @)
        role            : "หลัก" หรือ "ฝากถอน"
        site_name       : ชื่อเว็บ เช่น "Jun88"
        group_url       : URL หน้า Group Settings ของ LINE Manager
        website_id      : UUID ของเว็บ (optional, เพิ่มความแม่นยำ)

    Returns:
        dict { ok, message, newLineId?, newLineName?, seleniumOk? }
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

    backup_id        = backup.get("id", "")
    backup_line_name = backup.get("lineName", "")
    backup_acc_id    = backup.get("lineAccountId", "")
    backup_url       = backup.get("lineAccountUrl", "")

    print(f"   📦 ไลน์สำรองที่เลือก: {backup_line_name} ({backup_acc_id})")

    if not backup_line_name:
        msg = f"backup account ไม่มีชื่อ (lineName) — ไม่สามารถหาในกรุ๊ปได้"
        print(f"   ❌ {msg}")
        return {"ok": False, "message": msg}

    # 2. Selenium — ลบบัญชีเก่า แล้วเพิ่มบัญชีใหม่เข้ากรุ๊ป
    #    (ทำก่อนอัปเดตข้อมูล เพื่อให้ไลน์ใหม่แสดงในแดชบอร์ดทันที)
    selenium_ok = swap_line_in_group(
        driver=driver,
        group_url=group_url,
        suspended_line_id=suspended_line_id,
        backup_line_name=backup_line_name,
    )
    if not selenium_ok:
        print(f"   ⚠️  Selenium ไม่สำเร็จ — ยังคงอัปเดตข้อมูลต่อ")

    # 3. อัปเดต lines.json (แทนที่ ID เก่าด้วย ID ใหม่)
    new_id = update_lines_json(suspended_line_id, backup)

    # 4. ลบออกจาก backup pool
    #    (ไลน์ถูกดึงไปแสดงในแดชบอร์ดแล้ว จึงต้องเอาออกจากรายการสำรอง)
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
        "newLineName": backup_line_name,
        "newLineUrl":  backup_url,
        "seleniumOk":  selenium_ok,
        "groupUrl":    group_url,
    }
    append_failover_log(entry)

    # 7. ป้องกัน backup เดิมถูกใช้ซ้ำในรอบนี้
    _used_backup_ids.add(backup_id)

    result_msg = "สับเปลี่ยนสำเร็จ" if selenium_ok else "อัปเดตข้อมูลสำเร็จ (Selenium ไม่สมบูรณ์)"
    print(f"   ✅ FAILOVER เสร็จ: {suspended_line_id} → {new_id} ({backup_line_name}) | Selenium: {selenium_ok}")
    return {
        "ok":          True,
        "message":     result_msg,
        "newLineId":   new_id,
        "newLineName": backup_line_name,
        "seleniumOk":  selenium_ok,
    }


def reset_cycle() -> None:
    """เรียกเมื่อเริ่มรอบตรวจสถานะใหม่ เพื่อ reset การป้องกันซ้ำ"""
    _used_backup_ids.clear()
