import { exec } from "child_process";
import { logger } from "./logger.js";

const rootDir = process.cwd();

let checkerRunning = false;

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

export function startScheduler() {
  logger.info("🗓️  Scheduler started — checker ทุก 1 นาที");
  setInterval(runCheckerDirect, 60_000);
  runCheckerDirect();
}
