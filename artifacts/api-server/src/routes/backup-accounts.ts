import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "backup-accounts.json");

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

function readAccounts(): BackupAccount[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeAccounts(data: BackupAccount[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/backup-accounts", (_req, res) => {
  res.json(readAccounts());
});

// scanner POSTs an array of accounts to upsert
router.post("/backup-accounts", (req, res) => {
  const { accounts } = req.body as { accounts: Omit<BackupAccount, "id">[] };
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: "accounts must be an array" });
    return;
  }

  const existing = readAccounts();

  for (const acc of accounts) {
    const idx = existing.findIndex(
      (e) => e.lineAccountUrl === acc.lineAccountUrl,
    );
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...acc, scannedAt: new Date().toISOString() };
    } else {
      existing.push({ ...acc, id: randomUUID(), scannedAt: new Date().toISOString() });
    }
  }

  writeAccounts(existing);
  res.json({ ok: true, count: accounts.length });
});

// confirm account to a website (manual assignment from UI)
router.put("/backup-accounts/:id/confirm", (req, res) => {
  const { id } = req.params;
  const { websiteId, websiteName } = req.body as { websiteId: string; websiteName: string };
  const data = readAccounts().map((a) =>
    a.id === id ? { ...a, websiteId, websiteName, confirmed: true } : a,
  );
  writeAccounts(data);
  res.json({ ok: true });
});

router.delete("/backup-accounts/:id", (req, res) => {
  const { id } = req.params;
  const data = readAccounts().filter((a) => a.id !== id);
  writeAccounts(data);
  res.json({ ok: true });
});

export default router;
