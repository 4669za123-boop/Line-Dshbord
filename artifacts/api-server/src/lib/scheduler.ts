import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { runBotDirect } from "../routes/lines.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schedulesPath = path.join(__dirname, "..", "data", "schedules.json");
const rootDir = path.join(__dirname, "..");

const TIMEZONE = "Asia/Bangkok";
const CHECKER_INTERVAL_MINUTES = 5;

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
let checkerRunning = false;
let checkerTickCount = 0;

function runCheckerDirect() {
  if (checkerRunning) {
    logger.info("⏭️  Checker already running, skipping");
    return;
  }
  checkerRunning = true;
  logger.info("🔍 Checker: starting status scan");
  const proc = exec("python3 checker.py", { cwd: rootDir });
  proc.stdout?.on("data", (d) => process.stdout.write(d));
  proc.stderr?.on("data", (d) => process.stderr.write(d));
  proc.on("exit", (code) => {
    checkerRunning = false;
    logger.info({ code }, "🔍 Checker: finished");
  });
}

function tick() {
  const now = getBangkokHHMM();

  // รัน checker ทุก CHECKER_INTERVAL_MINUTES นาที (ไม่ใช่ทุกนาที)
  checkerTickCount++;
  if (checkerTickCount >= CHECKER_INTERVAL_MINUTES) {
    checkerTickCount = 0;
    runCheckerDirect();
  }

  // รัน bot (Discord) ตามเวลาที่ตั้งไว้
  if (now === lastFiredMinute) return;
  const times = readScheduledTimes();
  if (times.includes(now)) {
    lastFiredMinute = now;
    logger.info({ time: now }, "⏰ Scheduler: matched schedule — running bot");
    runBotDirect();
  }
}

export function startScheduler() {
  logger.info(
    `🗓️  Scheduler started — checker ทุก ${CHECKER_INTERVAL_MINUTES} นาที, bot ตาม schedule (Asia/Bangkok)`
  );
  setInterval(tick, 60_000);
  tick();
}
