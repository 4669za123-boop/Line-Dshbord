import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { runBotDirect } from "../routes/lines.js";
import { logger } from "./logger.js";

const schedulesPath = path.join(process.cwd(), "data", "schedules.json");
const rootDir = process.cwd();

const TIMEZONE = "Asia/Bangkok";

// backup_scanner รันทุก 5 นาที
const BACKUP_SCANNER_INTERVAL_TICKS = 5;

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
let scannerRunning = false;
let tickCount = 0;

function runCheckerDirect() {
  if (checkerRunning) {
    logger.info("⏭️  Checker already running, skipping this tick");
    return;
  }
  checkerRunning = true;
  logger.info("🔍 Checker: starting status scan");
  const proc = exec("python3 checker.py", { cwd: rootDir });
  proc.stdout?.on("data", (d) => process.stdout.write(d));
  proc.stderr?.on("data", (d) => process.stderr.write(d));
  proc.on("exit", (code) => {
    checkerRunning = false;
    logger.info({ code }, "🔍 Checker: finished — จะรันรอบถัดไปใน 1 นาที");
  });
}

function runBackupScannerDirect() {
  if (scannerRunning) {
    logger.info("⏭️  Backup scanner already running, skipping this tick");
    return;
  }
  scannerRunning = true;
  logger.info("🗂️  Backup Scanner: starting group scan");
  const proc = exec("python3 backup_scanner.py", { cwd: rootDir });
  proc.stdout?.on("data", (d) => process.stdout.write(d));
  proc.stderr?.on("data", (d) => process.stderr.write(d));
  proc.on("exit", (code) => {
    scannerRunning = false;
    logger.info({ code }, `🗂️  Backup Scanner: finished — จะรันรอบถัดไปใน ${BACKUP_SCANNER_INTERVAL_TICKS} นาที`);
  });
}

function tick() {
  tickCount++;
  const now = getBangkokHHMM();

  // checker ทุก 1 นาที
  runCheckerDirect();

  // backup scanner ทุก 5 นาที
  if (tickCount % BACKUP_SCANNER_INTERVAL_TICKS === 0) {
    runBackupScannerDirect();
  }

  // bot (Discord) ตามเวลาที่ตั้งไว้
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
    `🗓️  Scheduler started — checker ทุก 1 นาที | backup scanner ทุก ${BACKUP_SCANNER_INTERVAL_TICKS} นาที | bot ตาม schedule (Asia/Bangkok)`
  );
  setInterval(tick, 60_000);
  // รัน backup scanner ทันทีที่เริ่ม (tick แรก)
  tick();
}
