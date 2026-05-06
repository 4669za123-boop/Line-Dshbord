import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
const filePath = path.join(dataDir, "websites.json");

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
  const data = readWebsites().filter((w) => w.id !== id);
  writeWebsites(data);
  res.json({ ok: true });
});

export default router;
