/**
 * data-init.ts — รัน 1 ครั้งตอน server start
 * สร้าง data/ และไฟล์ JSON ทั้งหมดที่จำเป็น (ถ้ายังไม่มี)
 * พร้อม migrate ข้อมูลรูปแบบเก่าไปรูปแบบใหม่
 */
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

/** ค่า default สำหรับแต่ละไฟล์ */
const DEFAULTS: Record<string, unknown> = {
  "websites.json":                 [],
  "discovered-lines.json":         {},
  "suspended-lines.json":          [],
  "backup-groups.json":            [],
  "backup-accounts-main.json":     [],
  "backup-accounts-deposit.json":  [],
  "backup-accounts-pending.json":  [],
  "schedules.json":                ["09:00", "14:00", "20:00"],
};

function ensureFile(filename: string, defaultValue: unknown) {
  const fp = path.join(dataDir, filename);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(defaultValue, null, 2));
    console.log(`[data-init] สร้าง ${filename}`);
  }
}

/**
 * Migrate lines.json (array เก่า) → discovered-lines.json (Record ใหม่)
 * ถ้า discovered-lines.json ว่างเปล่าและ lines.json มีข้อมูล
 */
function migrateOldLines() {
  const oldFile  = path.join(dataDir, "lines.json");
  const newFile  = path.join(dataDir, "discovered-lines.json");

  try {
    if (!fs.existsSync(oldFile)) return;

    const oldRaw  = fs.readFileSync(oldFile, "utf-8");
    const newRaw  = fs.readFileSync(newFile, "utf-8");
    const oldData = JSON.parse(oldRaw);
    const newData = JSON.parse(newRaw);

    // migrate เฉพาะเมื่อ new file ยังว่าง
    if (
      Array.isArray(oldData) &&
      oldData.length > 0 &&
      typeof newData === "object" &&
      Object.keys(newData).length === 0
    ) {
      const migrated: Record<string, unknown> = {};
      for (const line of oldData) {
        const id = line.id ?? line.lineId ?? line.lineAccountId;
        if (!id) continue;
        migrated[id] = {
          id,
          name:   line.name   ?? line.lineName ?? id,
          status: line.status ?? "normal",
          site:   line.site   ?? line.websiteName ?? "",
          siteId: line.siteId ?? line.websiteId   ?? "",
          url:    line.url    ?? line.lineAccountUrl ?? "",
          role:   line.role   ?? null,
        };
      }
      if (Object.keys(migrated).length > 0) {
        fs.writeFileSync(newFile, JSON.stringify(migrated, null, 2));
        console.log(`[data-init] migrate ${Object.keys(migrated).length} lines จาก lines.json`);
      }
    }
  } catch {
    // ignore — ถ้า migrate ไม่ได้ก็ไม่เป็นไร
  }
}

export function initDataFiles() {
  // สร้าง data directory
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("[data-init] สร้าง data/");
  }

  // สร้างไฟล์ทั้งหมดที่จำเป็น
  for (const [filename, defaultValue] of Object.entries(DEFAULTS)) {
    ensureFile(filename, defaultValue);
  }

  // migrate ข้อมูลเก่า
  migrateOldLines();
}
