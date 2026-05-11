import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "discovered-lines.json");
const suspendedFilePath = path.join(dataDir, "suspended-lines.json");

export type DiscoveredLine = {
  id: string;
  name: string;
  status: "normal" | "inactive";
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit" | null;
};

export type SuspendedLine = {
  id: string;
  name: string;
  site: string;
  siteId: string;
  url: string;
  role: "main" | "deposit";
  suspendedAt: string;
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

function readSuspended(): SuspendedLine[] {
  try {
    if (!fs.existsSync(suspendedFilePath)) return [];
    return JSON.parse(fs.readFileSync(suspendedFilePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeSuspended(data: SuspendedLine[]) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(suspendedFilePath, JSON.stringify(data, null, 2));
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

// GET /api/suspended-lines — คืนรายการที่โดนระงับ
router.get("/suspended-lines", (_req, res) => {
  res.json(readSuspended());
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
  const suspended = readSuspended();
  const suspendedIds = new Set(suspended.map((s) => s.id));

  for (const [lineId, entry] of Object.entries(statuses)) {
    const existing = current[lineId];

    if (entry.status === "suspended") {
      // ถ้า line นี้มี role กำหนดแล้ว → ย้ายไปยัง suspended-lines
      if (existing?.role === "main" || existing?.role === "deposit") {
        if (!suspendedIds.has(lineId)) {
          suspended.push({
            id: lineId,
            name: existing.name,
            site: existing.site,
            siteId: existing.siteId,
            url: existing.url,
            role: existing.role,
            suspendedAt: new Date().toISOString(),
          });
          suspendedIds.add(lineId);
        }
        delete current[lineId];
      } else {
        // ยังไม่ได้กำหนด role → ลบทิ้ง ไม่ต้องเก็บ
        delete current[lineId];
      }
    } else {
      // normal หรือ inactive → อัปเดตหรือเพิ่มใหม่
      current[lineId] = {
        id: lineId,
        name: entry.name ?? existing?.name ?? lineId,
        status: (entry.status === "normal" ? "normal" : "inactive") as "normal" | "inactive",
        site: entry.site,
        siteId: entry.siteId ?? existing?.siteId ?? "",
        url: entry.url ?? existing?.url ?? "",
        role: existing?.role ?? null,
      };
    }
  }

  writeDiscovered(current);
  writeSuspended(suspended);
  res.json({ ok: true, active: Object.keys(current).length, suspended: suspended.length });
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

// DELETE /api/suspended-lines/:id — ลบออกจาก suspended
router.delete("/suspended-lines/:id", (req, res) => {
  const { id } = req.params;
  const data = readSuspended().filter((s) => s.id !== id);
  writeSuspended(data);
  res.json({ ok: true });
});

export default router;
