import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "websites.json");
const linesFilePath = path.join(dataDir, "lines.json");

type WebsiteRecord = { id: string; name: string; url: string };
type LineRecord = { id: string; type: string; site: string };

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

function readLines(): LineRecord[] {
  try {
    if (!fs.existsSync(linesFilePath)) return [];
    return JSON.parse(fs.readFileSync(linesFilePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeLines(data: LineRecord[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(linesFilePath, JSON.stringify(data, null, 2));
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
  const target = all.find((w) => w.id === id);

  const remaining = all.filter((w) => w.id !== id);
  writeWebsites(remaining);

  if (target) {
    const lines = readLines().filter((l) => l.site !== target.name);
    writeLines(lines);
  }

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

  const reordered = ids
    .map((id) => idToSite.get(id))
    .filter((w): w is WebsiteRecord => w !== undefined);

  const missing = all.filter((w) => !ids.includes(w.id));
  const final = [...reordered, ...missing];
  writeWebsites(final);

  const siteOrder = final.map((w) => w.name);
  const lines = readLines();
  const sortedLines = [...lines].sort((a, b) => {
    const ai = siteOrder.indexOf(a.site);
    const bi = siteOrder.indexOf(b.site);
    const siteA = ai === -1 ? Infinity : ai;
    const siteB = bi === -1 ? Infinity : bi;
    if (siteA !== siteB) return siteA - siteB;
    const typeOrder = (t: string) => (t === "หลัก" ? 0 : 1);
    return typeOrder(a.type) - typeOrder(b.type);
  });
  writeLines(sortedLines);

  res.json({ ok: true });
});

export default router;
