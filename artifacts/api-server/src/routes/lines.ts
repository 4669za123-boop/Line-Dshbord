import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const discoveredFilePath = path.join(dataDir, "discovered-lines.json");

type DiscoveredLine = {
  id: string;
  name: string;
  status: string;
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit" | null;
};

function readDiscovered(): Record<string, DiscoveredLine> {
  try {
    if (!fs.existsSync(discoveredFilePath)) return {};
    return JSON.parse(fs.readFileSync(discoveredFilePath, "utf-8"));
  } catch {
    return {};
  }
}

// GET /api/lines — คืนรายการ LINE ทั้งหมด
router.get("/lines", (_req, res) => {
  const discovered = readDiscovered();
  res.json(Object.values(discovered));
});

export default router;
