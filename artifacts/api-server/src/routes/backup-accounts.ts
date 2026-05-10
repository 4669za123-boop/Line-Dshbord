import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();
const dataDir = path.join(process.cwd(), "data");

// 3 ไฟล์แยกตามประเภท
const FILE = {
  main:    path.join(dataDir, "backup-accounts-main.json"),
  deposit: path.join(dataDir, "backup-accounts-deposit.json"),
  pending: path.join(dataDir, "backup-accounts-pending.json"),
} as const;

const WEBSITES_FILE = path.join(dataDir, "websites.json");

export type BackupAccount = {
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

type Section = "main" | "deposit" | "pending";

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readSection(section: Section): BackupAccount[] {
  try {
    if (!fs.existsSync(FILE[section])) return [];
    return JSON.parse(fs.readFileSync(FILE[section], "utf-8"));
  } catch {
    return [];
  }
}

function writeSection(section: Section, data: BackupAccount[]) {
  ensureDir();
  fs.writeFileSync(FILE[section], JSON.stringify(data, null, 2));
}

/** อ่านลำดับเว็บจาก websites.json เพื่อเรียงบัญชี */
function getWebsiteOrder(): string[] {
  try {
    if (!fs.existsSync(WEBSITES_FILE)) return [];
    const sites = JSON.parse(fs.readFileSync(WEBSITES_FILE, "utf-8")) as { id: string }[];
    return sites.map((s) => s.id);
  } catch {
    return [];
  }
}

function sortByWebsite(accounts: BackupAccount[]): BackupAccount[] {
  const order = getWebsiteOrder();
  const idx = (id: string | null) => {
    if (!id) return 99999;
    const i = order.indexOf(id);
    return i === -1 ? 99999 : i;
  };
  return [...accounts].sort((a, b) => idx(a.websiteId) - idx(b.websiteId));
}

// GET /api/backup-accounts → { main, deposit, pending } เรียงตาม website order
router.get("/backup-accounts", (_req, res) => {
  res.json({
    main:    sortByWebsite(readSection("main")),
    deposit: sortByWebsite(readSection("deposit")),
    pending: readSection("pending"),
  });
});

// POST /api/backup-accounts — scanner upsert ผลลัพธ์ แยกใส่ main/deposit/pending
router.post("/backup-accounts", (req, res) => {
  const { accounts } = req.body as { accounts: Omit<BackupAccount, "id">[] };
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: "accounts must be an array" });
    return;
  }

  for (const acc of accounts) {
    const section: Section = acc.confirmed
      ? (acc.role as "main" | "deposit")
      : "pending";

    const data = readSection(section);
    const idx = data.findIndex((e) => e.lineAccountUrl === acc.lineAccountUrl);
    if (idx !== -1) {
      // อัปเดต — รักษา confirmed/websiteId ที่ user กำหนดไว้แล้ว
      const existing = data[idx];
      data[idx] = {
        ...existing,
        lineName: acc.lineName || existing.lineName,
        lineAccountId: acc.lineAccountId || existing.lineAccountId,
        scannedAt: new Date().toISOString(),
      };
    } else {
      data.push({ ...acc, id: randomUUID(), scannedAt: new Date().toISOString() });
    }
    writeSection(section, sortByWebsite(data));
  }

  res.json({ ok: true, count: accounts.length });
});

// PUT /api/backup-accounts/:id/confirm — ย้ายจาก pending → main/deposit
router.put("/backup-accounts/:id/confirm", (req, res) => {
  const { id } = req.params;
  const { websiteId, websiteName } = req.body as { websiteId: string; websiteName: string };

  // หาใน pending ก่อน
  const pending = readSection("pending");
  const accIdx = pending.findIndex((a) => a.id === id);
  if (accIdx === -1) {
    res.status(404).json({ error: "account not found in pending" });
    return;
  }

  const acc = pending[accIdx];
  const confirmed: BackupAccount = { ...acc, websiteId, websiteName, confirmed: true };
  const section: Section = acc.role as "main" | "deposit";

  // ลบออกจาก pending
  pending.splice(accIdx, 1);
  writeSection("pending", pending);

  // เพิ่มเข้า main หรือ deposit แล้วเรียงใหม่
  const dest = readSection(section);
  dest.push(confirmed);
  writeSection(section, sortByWebsite(dest));

  res.json({ ok: true });
});

// DELETE /api/backup-accounts/:id — ลบจากทุก section
router.delete("/backup-accounts/:id", (req, res) => {
  const { id } = req.params;
  const sections: Section[] = ["main", "deposit", "pending"];
  for (const s of sections) {
    const data = readSection(s).filter((a) => a.id !== id);
    writeSection(s, data);
  }
  res.json({ ok: true });
});

export default router;
