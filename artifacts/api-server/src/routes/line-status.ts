import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "statuses.json");

export type StatusEntry = {
  status: "normal" | "suspended" | "inactive";
  type: string;
  site: string;
};

function readStatuses(): Record<string, StatusEntry> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeStatuses(data: Record<string, StatusEntry>) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/line-status", (_req, res) => {
  res.json(readStatuses());
});

router.post("/line-status", (req, res) => {
  const { statuses } = req.body as { statuses: Record<string, StatusEntry> };
  if (!statuses || typeof statuses !== "object") {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  const current = readStatuses();
  const merged = { ...current, ...statuses };
  writeStatuses(merged);
  res.json({ ok: true, count: Object.keys(merged).length });
});

export default router;
