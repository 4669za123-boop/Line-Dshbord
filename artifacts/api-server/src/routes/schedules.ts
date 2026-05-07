import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "schedules.json");

const DEFAULT_TIMES = ["09:00", "14:00", "20:00"];
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function readTimes(): string[] {
  try {
    if (!fs.existsSync(filePath)) return [...DEFAULT_TIMES];
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(raw)) return [...DEFAULT_TIMES];
    const valid = raw.filter((t): t is string => typeof t === "string" && HH_MM.test(t.trim()));
    return valid.length > 0 ? valid : [...DEFAULT_TIMES];
  } catch {
    return [...DEFAULT_TIMES];
  }
}

function writeTimes(times: string[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(times, null, 2));
}

router.get("/schedules", (_req, res) => {
  res.json({ times: readTimes() });
});

router.put("/schedules", (req, res) => {
  const { times } = req.body as { times: unknown };
  if (!Array.isArray(times)) {
    res.status(400).json({ error: "times must be an array" });
    return;
  }
  const valid = times.filter((t): t is string => typeof t === "string" && HH_MM.test(t.trim()));
  const sorted = [...valid].sort((a, b) => a.localeCompare(b));
  writeTimes(sorted);
  res.json({ times: sorted });
});

router.delete("/schedules/:time", (req, res) => {
  const target = decodeURIComponent(req.params.time).trim();
  const current = readTimes();
  const updated = current.filter((t) => t !== target);
  writeTimes(updated);
  res.json({ times: updated });
});

export default router;
