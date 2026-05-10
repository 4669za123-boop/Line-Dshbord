import { Router } from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const LOG_FILE = path.join(dataDir, "failover-log.json");

export type FailoverLogEntry = {
  at: string;
  site: string;
  role: string;
  oldLineId: string;
  newLineId: string;
  newLineName: string;
  newLineUrl: string;
  seleniumOk: boolean;
  groupUrl: string;
};

function readLog(): FailoverLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// GET /api/failover-log — ดึงประวัติการสับเปลี่ยน
router.get("/failover-log", (_req, res) => {
  const log = readLog();
  // คืนล่าสุดก่อน
  res.json([...log].reverse());
});

// POST /api/failover/trigger — trigger สับเปลี่ยนด้วยมือ (manual failover)
// Body: { lineId, role, siteName, websiteId }
router.post("/failover/trigger", (req, res) => {
  const { lineId, role, siteName, websiteId } = req.body as {
    lineId: string;
    role: string;
    siteName: string;
    websiteId?: string;
  };

  if (!lineId || !role || !siteName) {
    res.status(400).json({ error: "lineId, role, siteName are required" });
    return;
  }

  const rootDir = process.cwd();
  const cmd = `python3 -c "
import sys
sys.path.insert(0, '.')
import auto_failover, json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--disable-gpu')

try:
    driver = webdriver.Chrome(options=opts)
    result = auto_failover.promote_backup(
        driver=driver,
        suspended_line_id=${JSON.stringify(lineId)},
        role=${JSON.stringify(role)},
        site_name=${JSON.stringify(siteName)},
        group_url='',
        website_id=${JSON.stringify(websiteId ?? "")},
    )
    driver.quit()
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'ok': False, 'message': str(e)}))
"`;

  exec(cmd, { cwd: rootDir, timeout: 120_000 }, (err, stdout, stderr) => {
    if (err) {
      req.log.error({ err, stderr }, "manual failover failed");
      res.status(500).json({ ok: false, message: err.message });
      return;
    }
    try {
      const result = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
      res.json(result);
    } catch {
      res.json({ ok: true, message: "triggered", raw: stdout });
    }
  });
});

export default router;
