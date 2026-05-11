import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "backup-groups.json");

type BackupGroupRecord = {
  id: string;
  url: string;
  role: "main" | "deposit";
  addedAt: string;
};

type BackupAccount = {
  id: string;
  groupId: string;
  websiteId: string | null;
  websiteName: string | null;
  confirmed: boolean;
  [key: string]: unknown;
};

const ACCOUNT_FILES = {
  main:    path.join(dataDir, "backup-accounts-main.json"),
  deposit: path.join(dataDir, "backup-accounts-deposit.json"),
  pending: path.join(dataDir, "backup-accounts-pending.json"),
} as const;

function readGroups(): BackupGroupRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeGroups(data: BackupGroupRecord[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/** ลบ backup accounts ทุกตัวที่มาจากกลุ่มนี้ ออกจากทุก section */
function removeAccountsByGroupId(groupId: string) {
  for (const [, filePath] of Object.entries(ACCOUNT_FILES)) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const data: BackupAccount[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const filtered = data.filter((a) => a.groupId !== groupId);
      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
    } catch {
      // ignore
    }
  }
}

router.get("/backup-groups", (_req, res) => {
  res.json(readGroups());
});

router.post("/backup-groups", (req, res) => {
  const { url, role } = req.body as { url: string; role: "main" | "deposit" };
  if (!url?.trim() || !["main", "deposit"].includes(role)) {
    res.status(400).json({ error: "url and role (main|deposit) are required" });
    return;
  }
  const existing = readGroups();
  const duplicate = existing.find((g) => g.url === url.trim() && g.role === role);
  if (duplicate) {
    res.status(200).json(duplicate);
    return;
  }
  const record: BackupGroupRecord = {
    id: randomUUID(),
    url: url.trim(),
    role,
    addedAt: new Date().toISOString(),
  };
  writeGroups([...existing, record]);
  res.status(201).json(record);
});

router.delete("/backup-groups/:id", (req, res) => {
  const { id } = req.params;
  const all = readGroups();
  const target = all.find((g) => g.id === id);

  // ลบกลุ่มออก
  writeGroups(all.filter((g) => g.id !== id));

  // ลบ backup accounts ทุกตัวที่สแกนมาจากกลุ่มนี้
  if (target) {
    removeAccountsByGroupId(id);
  }

  res.json({ ok: true });
});

export default router;
