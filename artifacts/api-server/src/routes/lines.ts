import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const discoveredFilePath = path.join(dataDir, "discovered-lines.json");
const websitesFilePath = path.join(dataDir, "websites.json");

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

export default router;
