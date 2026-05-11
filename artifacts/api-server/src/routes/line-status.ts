import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "discovered-lines.json");

export type DiscoveredLine = {
  id: string;
  name: string;
  status: "normal" | "suspended" | "inactive";
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit" | null;
};

function readDiscovered(): Record<string, DiscoveredLine> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeDiscovered(data: Record<string, DiscoveredLine>) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET /api/line-status — คืน discovered lines ทั้งหมด
router.get("/line-status", (_req, res) => {
  res.json(readDiscovered());
});

// GET /api/discovered-lines — คืนเป็น array
router.get("/discovered-lines", (_req, res) => {
  const data = readDiscovered();
  res.json(Object.values(data));
});

// POST /api/line-status — checker โพสต์สถานะ + ข้อมูล account
router.post("/line-status", (req, res) => {
  const { statuses } = req.body as {
    statuses: Record<
      string,
      { name?: string; status: string; site: string; siteId?: string; url?: string }
    >;
  };

  if (!statuses || typeof statuses !== "object") {
    res.status(400).json({ error: "invalid payload" });
    return;
  }

  const current = readDiscovered();

  for (const [lineId, entry] of Object.entries(statuses)) {
    const existing = current[lineId];
    current[lineId] = {
      id: lineId,
      name: entry.name ?? existing?.name ?? lineId,
      status: (entry.status as DiscoveredLine["status"]) ?? "inactive",
      site: entry.site,
      siteId: entry.siteId ?? existing?.siteId ?? "",
      url: entry.url ?? existing?.url ?? "",
      role: existing?.role ?? null,
    };
  }

  writeDiscovered(current);
  res.json({ ok: true, count: Object.keys(current).length });
});

// PUT /api/discovered-lines/:id/role — กำหนดบทบาท หลัก/ฝากถอน
router.put("/discovered-lines/:id/role", (req, res) => {
  const { id } = req.params;
  const { role } = req.body as { role: "main" | "deposit" | null };

  if (role !== "main" && role !== "deposit" && role !== null) {
    res.status(400).json({ error: "role must be main, deposit, or null" });
    return;
  }

  const data = readDiscovered();
  if (!data[id]) {
    res.status(404).json({ error: "line not found" });
    return;
  }

  data[id].role = role;
  writeDiscovered(data);
  res.json({ ok: true, line: data[id] });
});

// DELETE /api/discovered-lines/:id — ลบ account ออกจากระบบ
router.delete("/discovered-lines/:id", (req, res) => {
  const { id } = req.params;
  const data = readDiscovered();
  delete data[id];
  writeDiscovered(data);
  res.json({ ok: true });
});

export default router;
