import { useEffect, useState, useCallback, useRef } from "react";
import { Sidebar, type PageType } from "@/components/dashboard/sidebar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { NotificationSettingsPage } from "@/components/dashboard/notification-settings-page";
import {
  BackupPoolPage,
  type BackupLine,
  type BackupAccount,
  type BackupLineRole,
} from "@/components/dashboard/backup-pool-page";
import type { Website } from "@/components/dashboard/types";
import type { DiscoveredLine } from "@/components/dashboard/line-card";

// ─── localStorage cache ───────────────────────────────────────────────────────
const CACHE_KEY = "line_dashboard_v2";

interface CacheShape {
  websites:              Website[];
  lines:                 DiscoveredLine[];
  backupLines:           BackupLine[];
  backupAccountsMain:    BackupAccount[];
  backupAccountsDeposit: BackupAccount[];
  backupAccountsPending: BackupAccount[];
}

const EMPTY_CACHE: CacheShape = {
  websites:              [],
  lines:                 [],
  backupLines:           [],
  backupAccountsMain:    [],
  backupAccountsDeposit: [],
  backupAccountsPending: [],
};

function loadCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    const parsed = JSON.parse(raw) as Partial<CacheShape>;
    return {
      websites:              Array.isArray(parsed.websites)              ? parsed.websites              : [],
      lines:                 Array.isArray(parsed.lines)                 ? parsed.lines                 : [],
      backupLines:           Array.isArray(parsed.backupLines)           ? parsed.backupLines           : [],
      backupAccountsMain:    Array.isArray(parsed.backupAccountsMain)    ? parsed.backupAccountsMain    : [],
      backupAccountsDeposit: Array.isArray(parsed.backupAccountsDeposit) ? parsed.backupAccountsDeposit : [],
      backupAccountsPending: Array.isArray(parsed.backupAccountsPending) ? parsed.backupAccountsPending : [],
    };
  } catch {
    return EMPTY_CACHE;
  }
}

function saveCache(data: CacheShape) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage เต็ม หรือ private mode → ไม่เป็นไร
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");

  // โหลด state จาก localStorage ทันที → ไม่มี flash หน้าว่าง
  const cached = useRef(loadCache());

  const [websites,              setWebsites]              = useState<Website[]>(cached.current.websites);
  const [lines,                 setLines]                 = useState<DiscoveredLine[]>(cached.current.lines);
  const [backupLines,           setBackupLines]           = useState<BackupLine[]>(cached.current.backupLines);
  const [backupAccountsMain,    setBackupAccountsMain]    = useState<BackupAccount[]>(cached.current.backupAccountsMain);
  const [backupAccountsDeposit, setBackupAccountsDeposit] = useState<BackupAccount[]>(cached.current.backupAccountsDeposit);
  const [backupAccountsPending, setBackupAccountsPending] = useState<BackupAccount[]>(cached.current.backupAccountsPending);

  // sync cache ทุกครั้งที่ state เปลี่ยน
  useEffect(() => {
    saveCache({
      websites,
      lines,
      backupLines,
      backupAccountsMain,
      backupAccountsDeposit,
      backupAccountsPending,
    });
  }, [websites, lines, backupLines, backupAccountsMain, backupAccountsDeposit, backupAccountsPending]);

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(() => {
    fetch("/api/websites")
      .then((r) => r.json())
      .then((data: Website[]) => {
        if (Array.isArray(data)) setWebsites(data);
      })
      .catch(() => {});

    fetch("/api/lines")
      .then((r) => r.json())
      .then((data: DiscoveredLine[]) => {
        if (Array.isArray(data)) setLines(data);
      })
      .catch(() => {});
  }, []);

  const fetchBackupData = useCallback(() => {
    fetch("/api/backup-groups")
      .then((r) => r.json())
      .then((data: BackupLine[]) => {
        if (Array.isArray(data)) setBackupLines(data);
      })
      .catch(() => {});

    fetch("/api/backup-accounts")
      .then((r) => r.json())
      .then((data: { main: BackupAccount[]; deposit: BackupAccount[]; pending: BackupAccount[] }) => {
        if (data && typeof data === "object") {
          setBackupAccountsMain(data.main ?? []);
          setBackupAccountsDeposit(data.deposit ?? []);
          setBackupAccountsPending(data.pending ?? []);
        }
      })
      .catch(() => {});
  }, []);

  // โหลดครั้งแรก
  useEffect(() => {
    fetchDashboard();
    fetchBackupData();
  }, [fetchDashboard, fetchBackupData]);

  // รีเฟรชทุก 15 วินาที
  useEffect(() => {
    const id = setInterval(() => {
      fetchDashboard();
      fetchBackupData();
    }, 15_000);
    return () => clearInterval(id);
  }, [fetchDashboard, fetchBackupData]);

  // ── Dashboard handlers ──────────────────────────────────────────────────────

  const handleAddWebsite = async (name: string, url: string) => {
    const trimmed = name.trim();
    if (!trimmed || !url.trim()) return;
    try {
      const res  = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, url: url.trim() }),
      });
      const site: Website = await res.json();
      setWebsites((prev) => {
        if (prev.find((w) => w.id === site.id)) return prev;
        return [...prev, site];
      });
    } catch {}
  };

  const handleRemoveWebsite = async (id: string) => {
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setLines((prev) => prev.filter((l) => l.websiteId !== id));
    try { await fetch(`/api/websites/${id}`, { method: "DELETE" }); } catch {}
  };

  const handleReorderWebsites = async (orderedIds: string[]) => {
    const idToWebsite = new Map(websites.map((w) => [w.id, w]));
    const reordered   = orderedIds.map((id) => idToWebsite.get(id)).filter((w): w is Website => !!w);
    const missing     = websites.filter((w) => !orderedIds.includes(w.id));
    setWebsites([...reordered, ...missing]);
    try {
      await fetch("/api/websites/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });
    } catch {}
  };

  const handleAssignRole = async (lineId: string, role: "main" | "deposit") => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, role } : l)));
    try {
      await fetch(`/api/discovered-lines/${lineId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch {}
  };

  const handleRemoveLine = async (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    try { await fetch(`/api/discovered-lines/${lineId}`, { method: "DELETE" }); } catch {}
  };

  // ── Backup pool handlers ────────────────────────────────────────────────────

  const handleAddBackup = async (url: string, role: BackupLineRole) => {
    try {
      const res   = await fetch("/api/backup-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, role }),
      });
      const group: BackupLine = await res.json();
      setBackupLines((prev) => {
        if (prev.find((l) => l.id === group.id)) return prev;
        return [...prev, group];
      });
    } catch {}
  };

  const handleRemoveBackup = async (id: string) => {
    setBackupLines((prev) => prev.filter((l) => l.id !== id));
    // ลบ backup accounts ที่สแกนมาจากกลุ่มนี้ออกจาก UI ด้วย
    setBackupAccountsMain((prev)    => prev.filter((a) => a.groupId !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.groupId !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.groupId !== id));
    try { await fetch(`/api/backup-groups/${id}`, { method: "DELETE" }); } catch {}
  };

  const handleRemoveBackupAccount = async (id: string) => {
    setBackupAccountsMain((prev)    => prev.filter((a) => a.id !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
    try { await fetch(`/api/backup-accounts/${id}`, { method: "DELETE" }); } catch {}
  };

  const handleConfirmBackupAccount = async (
    id: string,
    websiteId: string,
    websiteName: string,
  ) => {
    const acc = backupAccountsPending.find((a) => a.id === id);
    if (acc) {
      const confirmed = { ...acc, websiteId, websiteName, confirmed: true };
      setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
      if (acc.role === "main") setBackupAccountsMain((prev) => [...prev, confirmed]);
      else setBackupAccountsDeposit((prev) => [...prev, confirmed]);
    }
    try {
      await fetch(`/api/backup-accounts/${id}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, websiteName }),
      });
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <DashboardContent
            websites={websites}
            lines={lines}
            onAddWebsite={handleAddWebsite}
            onRemoveWebsite={handleRemoveWebsite}
            onReorderWebsites={handleReorderWebsites}
            onAssignRole={handleAssignRole}
            onRemoveLine={handleRemoveLine}
          />
        );
      case "backup-pool":
        return (
          <BackupPoolPage
            websites={websites}
            backupLines={backupLines}
            backupAccountsMain={backupAccountsMain}
            backupAccountsDeposit={backupAccountsDeposit}
            backupAccountsPending={backupAccountsPending}
            onAddBackup={handleAddBackup}
            onRemoveBackup={handleRemoveBackup}
            onRemoveBackupAccount={handleRemoveBackupAccount}
            onConfirmBackupAccount={handleConfirmBackupAccount}
          />
        );
      case "notification-settings":
        return <NotificationSettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="transition-opacity duration-300">{renderPage()}</div>
    </div>
  );
}
