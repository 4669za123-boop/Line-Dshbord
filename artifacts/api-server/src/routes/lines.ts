import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const discoveredFilePath = path.join(dataDir, "discovered-lines.json");
const websitesFilePath   = path.join(dataDir, "websites.json");
const blacklistFilePath  = path.join(dataDir, "deleted-lines.json");

type StoredLine = {
  id: string;
  name: string;
  status: string;
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit" | null;
};

type Website = { id: string; name: string; url?: string };

function readDiscovered(): Record<string, StoredLine> {
  try {
    if (!fs.existsSync(discoveredFilePath)) return {};
    return JSON.parse(fs.readFileSync(discoveredFilePath, "utf-8"));
  } catch {
    return {};
  }
}

function readWebsites(): Website[] {
  try {
    if (!fs.existsSync(websitesFilePath)) return [];
    return JSON.parse(fs.readFileSync(websitesFilePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeDiscovered(data: Record<string, StoredLine>) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(discoveredFilePath, JSON.stringify(data, null, 2));
}

function readBlacklist(): Set<string> {
  try {
    if (!fs.existsSync(blacklistFilePath)) return new Set();
    const arr = JSON.parse(fs.readFileSync(blacklistFilePath, "utf-8"));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function addToBlacklist(id: string) {
  const list = readBlacklist();
  list.add(id);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(blacklistFilePath, JSON.stringify([...list], null, 2));
}

// GET /api/lines — คืนรายการ LINE ทั้งหมด (map field ให้ตรงกับ frontend)
router.get("/lines", (_req, res) => {
  const discovered = readDiscovered();
  const websites = readWebsites();
  const websiteMap = new Map(websites.map((w) => [w.id, w.name]));

  const websiteByName = new Map(websites.map((w) => [w.name.toLowerCase(), w]));

  const lines = Object.values(discovered).map((line) => {
    let resolvedId   = line.siteId;
    let resolvedName = websiteMap.get(line.siteId) ?? line.site;

    if (!resolvedId && line.site) {
      const matched = websiteByName.get(line.site.toLowerCase());
      if (matched) {
        resolvedId   = matched.id;
        resolvedName = matched.name;
      }
    }

    return {
      id:          line.id,
      name:        line.name,
      lineId:      line.id,
      websiteId:   resolvedId,
      websiteName: resolvedName,
      url:         line.url,
      role:        line.role,
      status:      line.status === "normal" ? "normal" : "inactive",
    };
  });

  res.json(lines);
});

// DELETE /api/discovered-lines/:id — ลบ LINE account + บันทึกลง blacklist ถาวร
router.delete("/discovered-lines/:id", (req, res) => {
  const { id } = req.params;
  const discovered = readDiscovered();
  delete discovered[id];
  writeDiscovered(discovered);
  addToBlacklist(id);
  res.json({ ok: true });
});

export default router;
