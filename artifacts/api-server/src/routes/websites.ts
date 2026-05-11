import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "websites.json");
const discoveredFilePath = path.join(dataDir, "discovered-lines.json");

type WebsiteRecord = { id: string; name: string; url: string };

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
  const remaining = all.filter((w) => w.id !== id);
  writeWebsites(remaining);
  removeDiscoveredBySite(id);
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
