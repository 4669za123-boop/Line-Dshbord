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
  suggestedWebsiteId: string | null;
  suggestedWebsiteName: string | null;
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

type WebsiteRecord = { id: string; name: string; url?: string };

/** อ่านเว็บทั้งหมด */
function readWebsites(): WebsiteRecord[] {
  try {
    if (!fs.existsSync(WEBSITES_FILE)) return [];
    return JSON.parse(fs.readFileSync(WEBSITES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/** อ่านลำดับเว็บจาก websites.json เพื่อเรียงบัญชี */
function getWebsiteOrder(): string[] {
  return readWebsites().map((s) => s.id);
}

/**
 * ตรวจชื่อ LINE → หาว่าตรงกับเว็บไหน
 * คืน { match, suggestion }
 *   match      = { id, name } ถ้าเจอแน่นอน 1 เว็บ, null ถ้าไม่แน่ใจ
 *   suggestion = { id, name } เว็บที่น่าจะเป็น (เลือก match แรก หรือ match ที่ยาวที่สุด)
 */
function autoMatchWebsite(
  lineName: string,
  websites: WebsiteRecord[],
): { match: { id: string; name: string } | null; suggestion: { id: string; name: string } | null } {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9ก-๙]/gi, "");

  const lineNorm = normalize(lineName);

  const matches = websites.filter((w) => {
    const wNorm = normalize(w.name);
    if (!wNorm) return false;
    return lineNorm.includes(wNorm);
  });

  if (matches.length === 1) {
    const m = { id: matches[0].id, name: matches[0].name };
    return { match: m, suggestion: m };
  }

  if (matches.length > 1) {
    // เลือก suggestion = เว็บที่ชื่อยาวที่สุด (เจาะจงที่สุด)
    const best = matches.reduce((a, b) =>
      normalize(b.name).length > normalize(a.name).length ? b : a,
    );
    return { match: null, suggestion: { id: best.id, name: best.name } };
  }

  return { match: null, suggestion: null };
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

/** backfill websiteName จาก websiteId สำหรับบัญชีเก่าที่ไม่มี websiteName */
function enrichWebsiteNames(accounts: BackupAccount[], websites: WebsiteRecord[]): BackupAccount[] {
  const map = new Map(websites.map((w) => [w.id, w.name]));
  return accounts.map((acc) => {
    if (acc.websiteId && !acc.websiteName) {
      return { ...acc, websiteName: map.get(acc.websiteId) ?? null };
    }
    return acc;
  });
}

// GET /api/backup-accounts → { main, deposit, pending } เรียงตาม website order
router.get("/backup-accounts", (_req, res) => {
  const websites = readWebsites();
  const main    = enrichWebsiteNames(readSection("main"),    websites);
  const deposit = enrichWebsiteNames(readSection("deposit"), websites);
  const pending = enrichWebsiteNames(readSection("pending"), websites);
  res.json({
    main:    sortByWebsite(main),
    deposit: sortByWebsite(deposit),
    pending,
  });
});

// POST /api/backup-accounts — scanner upsert ผลลัพธ์ แยกใส่ main/deposit/pending
router.post("/backup-accounts", (req, res) => {
  const { accounts } = req.body as { accounts: Omit<BackupAccount, "id">[] };
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: "accounts must be an array" });
    return;
  }

  const websites = readWebsites();
  let autoAssigned = 0;
  let pendingCount = 0;

  for (const acc of accounts) {
    // ถ้ายังไม่มี websiteId → ลองหาจากชื่อ LINE อัตโนมัติ
    let resolvedAcc = { ...acc, suggestedWebsiteId: acc.suggestedWebsiteId ?? null, suggestedWebsiteName: acc.suggestedWebsiteName ?? null };
    if (!resolvedAcc.websiteId && resolvedAcc.lineName) {
      const { match, suggestion } = autoMatchWebsite(resolvedAcc.lineName, websites);
      if (match) {
        resolvedAcc.websiteId             = match.id;
        resolvedAcc.websiteName           = match.name;
        resolvedAcc.suggestedWebsiteId    = match.id;
        resolvedAcc.suggestedWebsiteName  = match.name;
        resolvedAcc.confirmed             = true;
        autoAssigned++;
      } else {
        resolvedAcc.confirmed             = false;
        resolvedAcc.websiteId             = null;
        resolvedAcc.websiteName           = null;
        resolvedAcc.suggestedWebsiteId    = suggestion?.id   ?? null;
        resolvedAcc.suggestedWebsiteName  = suggestion?.name ?? null;
        pendingCount++;
      }
    }

    const section: Section = resolvedAcc.confirmed
      ? (resolvedAcc.role as "main" | "deposit")
      : "pending";

    // ค้นหาใน section ที่คำนวณได้ และในทุก section (กรณี account ย้ายหมวด)
    let found = false;
    for (const s of ["main", "deposit", "pending"] as Section[]) {
      const data = readSection(s);
      const idx = data.findIndex((e) => e.lineAccountUrl === resolvedAcc.lineAccountUrl);
      if (idx !== -1) {
        const existing = data[idx];
        // ถ้า user เคยกำหนด websiteId ไว้แล้ว → รักษาไว้ ไม่ override
        const keepWebsite = existing.websiteId
          ? { websiteId: existing.websiteId, websiteName: existing.websiteName, confirmed: existing.confirmed }
          : { websiteId: resolvedAcc.websiteId, websiteName: resolvedAcc.websiteName, confirmed: resolvedAcc.confirmed };

        const targetSection: Section = keepWebsite.confirmed
          ? (resolvedAcc.role as "main" | "deposit")
          : "pending";

        const updated: BackupAccount = {
          ...existing,
          ...keepWebsite,
          lineName:      resolvedAcc.lineName || existing.lineName,
          lineAccountId: resolvedAcc.lineAccountId || existing.lineAccountId,
          scannedAt:     new Date().toISOString(),
        };

        if (s === targetSection) {
          data[idx] = updated;
          writeSection(s, sortByWebsite(data));
        } else {
          // ย้าย section (เช่น pending → main เมื่อ auto-match เจอ)
          data.splice(idx, 1);
          writeSection(s, sortByWebsite(data));
          const dest = readSection(targetSection);
          dest.push(updated);
          writeSection(targetSection, sortByWebsite(dest));
        }
        found = true;
        break;
      }
    }
    if (!found) {
      const data = readSection(section);
      data.push({ ...resolvedAcc, id: randomUUID(), scannedAt: new Date().toISOString() });
      writeSection(section, sortByWebsite(data));
    }
  }

  console.log(`📋 backup-accounts: รับ ${accounts.length} บัญชี → auto-assign ${autoAssigned}, pending ${pendingCount}`);
  res.json({ ok: true, count: accounts.length, autoAssigned, pending: pendingCount });
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
