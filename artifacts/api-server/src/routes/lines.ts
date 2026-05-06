import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
const filePath = path.join(dataDir, "lines.json");

let lastBotRunAt = 0;
const BOT_COOLDOWN_MS = 60_000;

function extractId(input: string): string {
  if (!input) return "";
  if (input.includes("/account/")) {
    return input.split("/account/")[1].replace("@", "").toLowerCase();
  }
  return input.replace("@", "").toLowerCase();
}

function readData(): { id: string; type: string; site: string }[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const file = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(file);
  } catch {
    return [];
  }
}

router.post("/add-line", (req, res) => {
  const { url, type, site } = req.body as { url: string; type: string; site: string };

  let data = readData();

  const newId = extractId(url);

  data = data.map((item) => {
    const raw = item.url || item.id || "";
    return {
      id: extractId(raw as string),
      type: item.type,
      site: item.site,
    };
  });

  data = data.filter((item) => item.id !== newId);
  data.push({ id: newId, type, site });

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ ok: true });
});

router.post("/add-time", (req, res) => {
  const { time } = req.body as { time: string };
  req.log.info({ time }, "Schedule time added");
  res.json({ ok: true, time });
});

router.post("/run-bot", (req, res) => {
  const now = Date.now();
  if (now - lastBotRunAt < BOT_COOLDOWN_MS) {
    const retryAfter = Math.ceil((BOT_COOLDOWN_MS - (now - lastBotRunAt)) / 1000);
    res.status(429).json({ ok: false, error: "Too many requests", retryAfterSeconds: retryAfter });
    return;
  }

  lastBotRunAt = now;
  req.log.info("Running bot.py");

  exec("python bot.py", (err, stdout, stderr) => {
    if (err) req.log.error({ err }, "Bot error");
    if (stdout) req.log.info(stdout);
    if (stderr) req.log.warn(stderr);
    const success = !err;
    req.log.info({ success }, "Bot run complete");
  });

  res.json({ ok: true, message: "Bot started" });
});

export default router;
