import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "discovered-lines.json");
const suspendedFilePath = path.join(dataDir, "suspended-lines.json");
const websitesFilePath = path.join(dataDir, "websites.json");

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

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: websites (name-based siteId fallback)
// ──────────────────────────────────────────────────────────────────────────────

type WebsiteRecord = { id: string; name: string; url?: string };

function readWebsites(): WebsiteRecord[] {
  try {
    if (!fs.existsSync(websitesFilePath)) return [];
    return JSON.parse(fs.readFileSync(websitesFilePath, "utf-8"));
  } catch {
    return [];
  }
}

/** ถ้า siteId ว่าง → ค้นหาจากชื่อเว็บ */
function resolveSiteId(siteId: string, siteName: string, websites: WebsiteRecord[]): string {
  if (siteId) return siteId;
  return websites.find((w) => w.name === siteName)?.id ?? "";
}

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
    const data = JSON.parse(fs.readFileSync(suspendedFilePath, "utf-8"));
    return Array.isArray(data) ? data : [];
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

  const websites  = readWebsites();
  const current   = readDiscovered();
  const suspended = readSuspended();
  const suspendedIds = new Set(suspended.map((s) => s.id));
  let replacements = 0;

  for (const [lineId, entry] of Object.entries(statuses)) {
    const existing = current[lineId];

    // resolve siteId: ถ้าว่าง (เว็บไม่มี id field) → ค้นจากชื่อ
    const siteId   = resolveSiteId(entry.siteId ?? existing?.siteId ?? "", entry.site, websites);
    const siteName = entry.site;
    const accUrl   = entry.url ?? existing?.url ?? "";

    // ── ไลน์โดนระงับ ────────────────────────────────────────────────────────
    if (entry.status === "suspended") {
      if (existing?.role === "main" || existing?.role === "deposit") {
        if (!suspendedIds.has(lineId)) {
          suspended.push({
            id:          lineId,
            name:        existing.name,
            site:        existing.site,
            siteId:      existing.siteId || siteId,
            url:         existing.url,
            role:        existing.role,
            suspendedAt: new Date().toISOString(),
          });
          suspendedIds.add(lineId);
        }
        delete current[lineId];
      } else {
        delete current[lineId];
      }
      continue;
    }

    // ── ไลน์ปกติ: ตรวจว่าเป็นการสับเปลี่ยนจาก backup pool ────────────────
    const backupHit = accUrl ? findBackupByUrl(accUrl) : null;

    // trigger auto-replace เมื่อ:
    //  - URL ตรงกับ backup pool
    //  - และ account นั้นมีอยู่ใน discovered แต่ยังไม่มี role (unassigned เท่านั้น)
    //  - ถ้าไม่มีใน discovered (ถูกลบไปแล้ว) → ไม่เพิ่มกลับ
    const isUnassigned = !!existing && existing.role === null;

    if (backupHit && isUnassigned) {
      const backupRole = backupHit.account.role;

      // หา suspended LINE ที่ตรงกับ siteId + role (เพื่อ clear ออกจาก suspended)
      const suspIdx = suspended.findIndex(
        (s) => (s.siteId === siteId || s.site === siteName) && s.role === backupRole,
      );

      // เพิ่มเข้า discovered ด้วย role จาก backup pool
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
      if (suspIdx !== -1) suspended.splice(suspIdx, 1);

      replacements++;
      console.log(
        `🔄 AUTO-REPLACE: ${entry.name ?? lineId} (${backupRole}) เข้ากลุ่ม ${siteName} — ดึงจาก backup pool`,
      );
    } else if (existing) {
      // LINE ที่มีอยู่แล้ว → อัปเดต status เท่านั้น คง role เดิมไว้
      current[lineId] = {
        ...existing,
        name:   entry.name ?? existing.name,
        status: entry.status === "normal" ? "normal" : "inactive",
        site:   siteName,
        siteId: siteId || existing.siteId,
        url:    accUrl || existing.url,
      };
      // ถ้าไม่มีใน discovered → ข้ามไป ไม่เพิ่มอัตโนมัติ
      // (ต้องผ่าน scan dialog เท่านั้นถึงจะเพิ่มได้)
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
