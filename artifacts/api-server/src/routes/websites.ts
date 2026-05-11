import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

const dataDir = path.join(process.cwd(), "data");
const filePath            = path.join(dataDir, "websites.json");
const discoveredFilePath  = path.join(dataDir, "discovered-lines.json");
const suspendedFilePath   = path.join(dataDir, "suspended-lines.json");

const ACCOUNT_FILES = {
  main:    path.join(dataDir, "backup-accounts-main.json"),
  deposit: path.join(dataDir, "backup-accounts-deposit.json"),
  pending: path.join(dataDir, "backup-accounts-pending.json"),
} as const;

type WebsiteRecord = { id: string; name: string; url: string };

type BackupAccount = {
  id: string;
  groupId: string;
  websiteId: string | null;
  websiteName: string | null;
  confirmed: boolean;
  role: "main" | "deposit";
  [key: string]: unknown;
};

function readWebsites(): WebsiteRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeWebsites(data: WebsiteRecord[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/** ลบ discovered-lines ที่ผูกกับ siteId นี้ */
function removeDiscoveredBySite(siteId: string) {
  try {
    if (!fs.existsSync(discoveredFilePath)) return;
    const data = JSON.parse(fs.readFileSync(discoveredFilePath, "utf-8")) as Record<string, { siteId: string }>;
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v.siteId !== siteId)
    );
    fs.writeFileSync(discoveredFilePath, JSON.stringify(filtered, null, 2));
  } catch {
    // ignore
  }
}

/** ลบ suspended-lines ที่ผูกกับ siteId นี้ */
function removeSuspendedBySite(siteId: string) {
  try {
    if (!fs.existsSync(suspendedFilePath)) return;
    const data = JSON.parse(fs.readFileSync(suspendedFilePath, "utf-8")) as Record<string, { siteId: string }>;
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v.siteId !== siteId)
    );
    fs.writeFileSync(suspendedFilePath, JSON.stringify(filtered, null, 2));
  } catch {
    // ignore
  }
}

/**
 * backup accounts ที่ websiteId ตรงกัน → reset กลับเป็น pending
 * (เพราะเว็บถูกลบ ไม่รู้จะ assign ให้ใครแล้ว)
 */
function resetBackupAccountsBySite(siteId: string) {
  const pendingFile = ACCOUNT_FILES.pending;

  for (const section of ["main", "deposit"] as const) {
    const sectionFile = ACCOUNT_FILES[section];
    try {
      if (!fs.existsSync(sectionFile)) continue;
      const data: BackupAccount[] = JSON.parse(fs.readFileSync(sectionFile, "utf-8"));

      const toReset  = data.filter((a) => a.websiteId === siteId);
      const toKeep   = data.filter((a) => a.websiteId !== siteId);

      // เขียน section ที่เหลือ
      fs.writeFileSync(sectionFile, JSON.stringify(toKeep, null, 2));

      if (toReset.length === 0) continue;

      // ย้ายไป pending พร้อม reset websiteId/confirmed
      const pending: BackupAccount[] = fs.existsSync(pendingFile)
        ? JSON.parse(fs.readFileSync(pendingFile, "utf-8"))
        : [];

      const resetEntries = toReset.map((a) => ({
        ...a,
        websiteId:   null,
        websiteName: null,
        confirmed:   false,
      }));

      // upsert — ถ้ามีอยู่แล้วใน pending ข้ามได้
      for (const entry of resetEntries) {
        if (!pending.find((p) => p.id === entry.id)) {
          pending.push(entry);
        }
      }

      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    } catch {
      // ignore
    }
  }
}

router.get("/websites", (_req, res) => {
  res.json(readWebsites());
});

router.post("/websites", (req, res) => {
  const { name, url } = req.body as { name: string; url: string };
  if (!name?.trim() || !url?.trim()) {
    res.status(400).json({ error: "name and url are required" });
    return;
  }
  const site: WebsiteRecord = { id: randomUUID(), name: name.trim(), url: url.trim() };
  const data = [...readWebsites(), site];
  writeWebsites(data);
  res.status(201).json(site);
});

router.delete("/websites/:id", (req, res) => {
  const { id } = req.params;
  const all = readWebsites();
  writeWebsites(all.filter((w) => w.id !== id));

  // ลบ discovered-lines ของเว็บนี้
  removeDiscoveredBySite(id);

  // ลบ suspended-lines ของเว็บนี้
  removeSuspendedBySite(id);

  // reset backup accounts ที่ผูกกับเว็บนี้กลับเป็น pending
  resetBackupAccountsBySite(id);

  res.json({ ok: true });
});

router.put("/websites/reorder", (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: "ids must be an array" });
    return;
  }

  const all = readWebsites();
  const idToSite = new Map(all.map((w) => [w.id, w]));
  const reordered = ids.map((id) => idToSite.get(id)).filter((w): w is WebsiteRecord => w !== undefined);
  const missing = all.filter((w) => !ids.includes(w.id));
  writeWebsites([...reordered, ...missing]);

  res.json({ ok: true });
});

export default router;
