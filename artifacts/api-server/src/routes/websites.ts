import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

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

type DiscoveredLine = {
  id: string; name: string; status: string;
  site: string; siteId: string; url: string;
  role: "main" | "deposit" | null;
};

type BackupAccount = {
  id: string; groupId: string; websiteId: string | null;
  websiteName: string | null; confirmed: boolean;
  role: "main" | "deposit"; [key: string]: unknown;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function readWebsites(): WebsiteRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch { return []; }
}

function writeWebsites(data: WebsiteRecord[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readDiscovered(): Record<string, DiscoveredLine> {
  try {
    if (!fs.existsSync(discoveredFilePath)) return {};
    return JSON.parse(fs.readFileSync(discoveredFilePath, "utf-8"));
  } catch { return {}; }
}

function writeDiscovered(data: Record<string, DiscoveredLine>) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(discoveredFilePath, JSON.stringify(data, null, 2));
}

function removeDiscoveredBySite(siteId: string) {
  try {
    const data = readDiscovered();
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v.siteId !== siteId),
    );
    writeDiscovered(filtered);
  } catch { /* ignore */ }
}

function removeSuspendedBySite(siteId: string) {
  try {
    if (!fs.existsSync(suspendedFilePath)) return;
    const data = JSON.parse(fs.readFileSync(suspendedFilePath, "utf-8")) as { siteId: string }[];
    fs.writeFileSync(
      suspendedFilePath,
      JSON.stringify(data.filter((v) => v.siteId !== siteId), null, 2),
    );
  } catch { /* ignore */ }
}

function resetBackupAccountsBySite(siteId: string) {
  const pendingFile = ACCOUNT_FILES.pending;
  for (const section of ["main", "deposit"] as const) {
    const sectionFile = ACCOUNT_FILES[section];
    try {
      if (!fs.existsSync(sectionFile)) continue;
      const data: BackupAccount[] = JSON.parse(fs.readFileSync(sectionFile, "utf-8"));
      const toReset = data.filter((a) => a.websiteId === siteId);
      const toKeep  = data.filter((a) => a.websiteId !== siteId);
      fs.writeFileSync(sectionFile, JSON.stringify(toKeep, null, 2));
      if (toReset.length === 0) continue;
      const pending: BackupAccount[] = fs.existsSync(pendingFile)
        ? JSON.parse(fs.readFileSync(pendingFile, "utf-8"))
        : [];
      for (const entry of toReset) {
        if (!pending.find((p) => p.id === entry.id)) {
          pending.push({ ...entry, websiteId: null, websiteName: null, confirmed: false });
        }
      }
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
    } catch { /* ignore */ }
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

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
  writeWebsites([...readWebsites(), site]);
  res.status(201).json(site);
});

router.delete("/websites/:id", (req, res) => {
  const { id } = req.params;
  writeWebsites(readWebsites().filter((w) => w.id !== id));
  removeDiscoveredBySite(id);
  removeSuspendedBySite(id);
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
  const map = new Map(all.map((w) => [w.id, w]));
  const reordered = ids.map((id) => map.get(id)).filter((w): w is WebsiteRecord => !!w);
  const missing   = all.filter((w) => !ids.includes(w.id));
  writeWebsites([...reordered, ...missing]);
  res.json({ ok: true });
});

// ── On-demand scan ────────────────────────────────────────────────────────────

router.post("/websites/:id/scan", (req, res) => {
  const website = readWebsites().find((w) => w.id === req.params.id);
  if (!website) {
    res.json({ ok: false, error: "website not found" });
    return;
  }

  let stdout = "";
  let responded = false;

  const proc = spawn("python3", ["scan_one.py", website.url], {
    cwd: process.cwd(),
  });

  proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
  proc.stderr.on("data", () => {});

  const timer = setTimeout(() => {
    if (responded) return;
    responded = true;
    try { proc.kill(); } catch { /* ignore */ }
    res.json({ ok: false, error: "scan timeout (120s)" });
  }, 120_000);

  proc.on("close", () => {
    clearTimeout(timer);
    if (responded) return;
    responded = true;
    try {
      const lines = stdout.trim().split("\n").filter((l) => l.trim().startsWith("{"));
      const last  = lines.pop();
      if (!last) throw new Error("no JSON output");
      res.json(JSON.parse(last));
    } catch {
      res.json({ ok: false, error: "scan failed — ไม่ได้รับผลลัพธ์จาก scanner" });
    }
  });

  proc.on("error", (err) => {
    clearTimeout(timer);
    if (responded) return;
    responded = true;
    res.json({ ok: false, error: err.message });
  });
});

// ── Save scan result (with roles) ─────────────────────────────────────────────

router.post("/websites/:id/save-scan", (req, res) => {
  const { id } = req.params;
  const { accounts } = req.body as {
    accounts: Array<{
      lineId: string; name: string; url: string;
      status: string; role: "main" | "deposit";
    }>;
  };

  const website = readWebsites().find((w) => w.id === id);
  if (!website) {
    res.status(404).json({ error: "website not found" });
    return;
  }
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: "accounts must be an array" });
    return;
  }

  const discovered = readDiscovered();
  let saved = 0;
  for (const acc of accounts) {
    if (!acc.lineId || !acc.role) continue;
    discovered[acc.lineId] = {
      id:     acc.lineId,
      name:   acc.name || acc.lineId,
      status: acc.status === "suspended" ? "inactive" : "normal",
      site:   website.name,
      siteId: id,
      url:    acc.url,
      role:   acc.role,
    };
    saved++;
  }
  writeDiscovered(discovered);
  res.json({ ok: true, saved });
});

export default router;
