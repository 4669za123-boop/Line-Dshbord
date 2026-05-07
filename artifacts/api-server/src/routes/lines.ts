import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "lines.json");
const websitesFilePath = path.join(dataDir, "websites.json");

let lastBotRunAt = 0;
const BOT_COOLDOWN_MS = 60_000;

export function runBotDirect() {
  const now = Date.now();
  if (now - lastBotRunAt < BOT_COOLDOWN_MS) return;
  lastBotRunAt = now;
  exec("python bot.py", (err, stdout, stderr) => {
    if (err) console.error("[bot]", err.message);
    if (stdout) console.log("[bot]", stdout.trim());
    if (stderr) console.warn("[bot]", stderr.trim());
  });
}

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

function readWebsiteOrder(): string[] {
  try {
    if (!fs.existsSync(websitesFilePath)) return [];
    const file = fs.readFileSync(websitesFilePath, "utf-8");
    const sites = JSON.parse(file) as { id: string; name: string; url: string }[];
    return sites.map((s) => s.name);
  } catch {
    return [];
  }
}

function sortByDashboardOrder(
  data: { id: string; type: string; site: string }[],
  siteOrder: string[],
): { id: string; type: string; site: string }[] {
  return [...data].sort((a, b) => {
    const ai = siteOrder.indexOf(a.site);
    const bi = siteOrder.indexOf(b.site);
    const siteA = ai === -1 ? Infinity : ai;
    const siteB = bi === -1 ? Infinity : bi;
    if (siteA !== siteB) return siteA - siteB;
    // ภายในเว็บเดียวกัน: หลัก ก่อน ฝากถอน
    const typeOrder = (t: string) => (t === "หลัก" ? 0 : 1);
    return typeOrder(a.type) - typeOrder(b.type);
  });
}

router.post("/add-line", (req, res) => {
  const { url, type, site } = req.body as { url: string; type: string; site: string };

  let data = readData();

  const newId = extractId(url);

  // normalise ids
  data = data.map((item) => {
    const raw = (item as unknown as Record<string, string>).url || item.id || "";
    return { id: extractId(raw), type: item.type, site: item.site };
  });

  // remove old entry with same id, then add new one
  data = data.filter((item) => item.id !== newId);
  data.push({ id: newId, type, site });

  // re-sort to match dashboard website order
  const siteOrder = readWebsiteOrder();
  if (siteOrder.length > 0) {
    data = sortByDashboardOrder(data, siteOrder);
  }

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
  const secret = process.env["BOT_SECRET"];
  const provided = req.headers["x-bot-secret"] as string | undefined;
  if (!secret || !provided || provided !== secret) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const now = Date.now();
  if (now - lastBotRunAt < BOT_COOLDOWN_MS) {
    const retryAfter = Math.ceil((BOT_COOLDOWN_MS - (now - lastBotRunAt)) / 1000);
    res.status(429).json({ ok: false, error: "Too many requests", retryAfterSeconds: retryAfter });
    return;
  }

  lastBotRunAt = now;
  req.log.info("Running bot.py");
  runBotDirect();
  res.json({ ok: true, message: "Bot started" });
});

export default router;
