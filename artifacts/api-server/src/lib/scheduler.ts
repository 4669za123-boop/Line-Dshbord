import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runBotDirect } from "../routes/lines.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schedulesPath = path.join(__dirname, "..", "data", "schedules.json");

const TIMEZONE = "Asia/Bangkok";

function getBangkokHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function readScheduledTimes(): string[] {
  try {
    if (!fs.existsSync(schedulesPath)) return [];
    const raw = JSON.parse(fs.readFileSync(schedulesPath, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

let lastFiredMinute = "";

function tick() {
  const now = getBangkokHHMM();
  if (now === lastFiredMinute) return;

  const times = readScheduledTimes();
  if (times.includes(now)) {
    lastFiredMinute = now;
    logger.info({ time: now }, "⏰ Scheduler: matched schedule — running bot");
    runBotDirect();
  }
}

export function startScheduler() {
  logger.info("🗓️  Scheduler started (checking every minute, Asia/Bangkok)");
  setInterval(tick, 60_000);
  tick();
}
