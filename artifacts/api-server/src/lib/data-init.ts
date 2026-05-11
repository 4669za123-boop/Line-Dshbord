/**
 * data-init.ts — รัน 1 ครั้งตอน server start
 * สร้าง data/ และไฟล์ JSON ทั้งหมดที่จำเป็น (ถ้ายังไม่มี)
 */
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

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

export function initDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("[data-init] สร้าง data/");
  }
  for (const [filename, defaultValue] of Object.entries(DEFAULTS)) {
    ensureFile(filename, defaultValue);
  }
}
