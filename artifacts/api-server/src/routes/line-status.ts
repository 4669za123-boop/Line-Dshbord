import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "discovered-lines.json");
const suspendedFilePath = path.join(dataDir, "suspended-lines.json");

// ไฟล์ backup pool
const BACKUP_FILES = {
  main:    path.join(dataDir, "backup-accounts-main.json"),
  deposit: path.join(dataDir, "backup-accounts-deposit.json"),
  pending: path.join(dataDir, "backup-accounts-pending.json"),
} as const;

export type DiscoveredLine = {
  id: string;
  name: string;
  status: "normal" | "inactive";
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit" | null;
};

export type SuspendedLine = {
  id: string;
  name: string;
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit";
  suspendedAt: string;
};

type BackupAccount = {
  id: string;
  groupId: string;
  groupUrl: string;
  lineName: string;
  lineAccountId: string;
  lineAccountUrl: string;
  role: "main" | "deposit";
  websiteId: string | null;
  websiteName: string | null;
  confirmed: boolean;
  scannedAt: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: discovered-lines
// ──────────────────────────────────────────────────────────────────────────────

function readDiscovered(): Record<string, DiscoveredLine> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeDiscovered(data: Record<string, DiscoveredLine>) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: suspended-lines
// ──────────────────────────────────────────────────────────────────────────────

function readSuspended(): SuspendedLine[] {
  try {
    if (!fs.existsSync(suspendedFilePath)) return [];
    return JSON.parse(fs.readFileSync(suspendedFilePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeSuspended(data: SuspendedLine[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(suspendedFilePath, JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: backup pool
// ──────────────────────────────────────────────────────────────────────────────

function readBackup(section: keyof typeof BACKUP_FILES): BackupAccount[] {
  try {
    const fp = BACKUP_FILES[section];
    if (!fs.existsSync(fp)) return [];
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return [];
  }
}

function writeBackup(section: keyof typeof BACKUP_FILES, data: BackupAccount[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(BACKUP_FILES[section], JSON.stringify(data, null, 2));
}

/**
 * ค้นหา backup account จาก URL ของ LINE account
 * คืน { account, section } หรือ null
 */
function findBackupByUrl(
  url: string,
): { account: BackupAccount; section: keyof typeof BACKUP_FILES } | null {
  for (const section of ["main", "deposit", "pending"] as const) {
    const accounts = readBackup(section);
    const found = accounts.find((a) => a.lineAccountUrl === url);
    if (found) return { account: found, section };
  }
  return null;
}

/**
 * ลบ backup account ออกจาก pool ทุก section
 */
function removeBackupById(id: string) {
  for (const section of ["main", "deposit", "pending"] as const) {
    const data = readBackup(section).filter((a) => a.id !== id);
    writeBackup(section, data);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/line-status
router.get("/line-status", (_req, res) => {
  res.json(readDiscovered());
});

// GET /api/discovered-lines
router.get("/discovered-lines", (_req, res) => {
  res.json(Object.values(readDiscovered()));
});

// GET /api/suspended-lines
router.get("/suspended-lines", (_req, res) => {
  res.json(readSuspended());
});

// POST /api/line-status — checker โพสต์สถานะ + ข้อมูล account
router.post("/line-status", (req, res) => {
  const { statuses } = req.body as {
    statuses: Record<
      string,
      { name?: string; status: string; site: string; siteId?: string; url?: string }
    >;
  };

  if (!statuses || typeof statuses !== "object") {
    res.status(400).json({ error: "invalid payload" });
    return;
  }

  const current   = readDiscovered();
  const suspended = readSuspended();
  const suspendedIds = new Set(suspended.map((s) => s.id));
  let replacements = 0;

  for (const [lineId, entry] of Object.entries(statuses)) {
    const existing = current[lineId];

    // ── ไลน์โดนระงับ ────────────────────────────────────────────────────────
    if (entry.status === "suspended") {
      if (existing?.role === "main" || existing?.role === "deposit") {
        // เก็บไว้ใน suspended
        if (!suspendedIds.has(lineId)) {
          suspended.push({
            id:          lineId,
            name:        existing.name,
            site:        existing.site,
            siteId:      existing.siteId,
            url:         existing.url,
            role:        existing.role,
            suspendedAt: new Date().toISOString(),
          });
          suspendedIds.add(lineId);
        }
        delete current[lineId];
      } else {
        // ยังไม่ได้กำหนด role → ลบทิ้ง
        delete current[lineId];
      }
      continue;
    }

    // ── ไลน์ปกติ: ตรวจว่าเป็นการสับเปลี่ยนจาก backup pool ────────────────
    const accUrl    = entry.url ?? existing?.url ?? "";
    const siteId    = entry.siteId ?? existing?.siteId ?? "";
    const siteName  = entry.site;
    const backupHit = accUrl ? findBackupByUrl(accUrl) : null;

    if (backupHit && !existing) {
      // LINE ใหม่ที่ URL ตรงกับ backup pool → สับเปลี่ยนอัตโนมัติ
      const backupRole = backupHit.account.role;

      // หา suspended LINE ที่ตรงกับ siteId + role
      const suspIdx = suspended.findIndex(
        (s) => s.siteId === siteId && s.role === backupRole,
      );

      // เพิ่มเข้า discovered ด้วย role จาก backup
      current[lineId] = {
        id:     lineId,
        name:   entry.name ?? lineId,
        status: "normal",
        site:   siteName,
        siteId,
        url:    accUrl,
        role:   backupRole,
      };

      // ลบออกจาก backup pool
      removeBackupById(backupHit.account.id);

      // ลบออกจาก suspended (ถ้ามี)
      if (suspIdx !== -1) {
        suspended.splice(suspIdx, 1);
      }

      replacements++;
      console.log(
        `🔄 AUTO-REPLACE: ${entry.name ?? lineId} เข้าแทน suspended [${backupRole}] ที่ ${siteName}`,
      );
    } else {
      // LINE ปกติ — อัปเดตหรือเพิ่มใหม่ (คง role เดิมไว้)
      current[lineId] = {
        id:     lineId,
        name:   entry.name ?? existing?.name ?? lineId,
        status: entry.status === "normal" ? "normal" : "inactive",
        site:   siteName,
        siteId,
        url:    accUrl,
        role:   existing?.role ?? null,
      };
    }
  }

  writeDiscovered(current);
  writeSuspended(suspended);
  res.json({
    ok:           true,
    active:       Object.keys(current).length,
    suspended:    suspended.length,
    replacements,
  });
});

// PUT /api/discovered-lines/:id/role
router.put("/discovered-lines/:id/role", (req, res) => {
  const { id }   = req.params;
  const { role } = req.body as { role: "main" | "deposit" | null };

  if (role !== "main" && role !== "deposit" && role !== null) {
    res.status(400).json({ error: "role must be main, deposit, or null" });
    return;
  }

  const data = readDiscovered();
  if (!data[id]) {
    res.status(404).json({ error: "line not found" });
    return;
  }

  data[id].role = role;
  writeDiscovered(data);
  res.json({ ok: true, line: data[id] });
});

// DELETE /api/discovered-lines/:id
router.delete("/discovered-lines/:id", (req, res) => {
  const { id } = req.params;
  const data   = readDiscovered();
  delete data[id];
  writeDiscovered(data);
  res.json({ ok: true });
});

// DELETE /api/suspended-lines/:id
router.delete("/suspended-lines/:id", (req, res) => {
  const { id } = req.params;
  const data   = readSuspended().filter((s) => s.id !== id);
  writeSuspended(data);
  res.json({ ok: true });
});

export default router;
