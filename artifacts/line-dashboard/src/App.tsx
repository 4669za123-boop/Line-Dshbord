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

const CACHE_KEY = "line_dashboard_v2";

interface CacheShape {
  websites:              Website[];
  lines:                 DiscoveredLine[];
  backupLines:           BackupLine[];
  backupAccountsMain:    BackupAccount[];
  backupAccountsDeposit: BackupAccount[];
  backupAccountsPending: BackupAccount[];
  suspendedCount:        number;
}

const EMPTY_CACHE: CacheShape = {
  websites:              [],
  lines:                 [],
  backupLines:           [],
  backupAccountsMain:    [],
  backupAccountsDeposit: [],
  backupAccountsPending: [],
  suspendedCount:        0,
};

function loadCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    const p = JSON.parse(raw) as Partial<CacheShape>;
    return {
      websites:              Array.isArray(p.websites)              ? p.websites              : [],
      lines:                 Array.isArray(p.lines)                 ? p.lines                 : [],
      backupLines:           Array.isArray(p.backupLines)           ? p.backupLines           : [],
      backupAccountsMain:    Array.isArray(p.backupAccountsMain)    ? p.backupAccountsMain    : [],
      backupAccountsDeposit: Array.isArray(p.backupAccountsDeposit) ? p.backupAccountsDeposit : [],
      backupAccountsPending: Array.isArray(p.backupAccountsPending) ? p.backupAccountsPending : [],
      suspendedCount:        typeof p.suspendedCount === "number"   ? p.suspendedCount        : 0,
    };
  } catch { return EMPTY_CACHE; }
}

function saveCache(data: CacheShape) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export default function App() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const cached = useRef(loadCache());

  const [websites,              setWebsites]              = useState<Website[]>(cached.current.websites);
  const [lines,                 setLines]                 = useState<DiscoveredLine[]>(cached.current.lines);
  const [backupLines,           setBackupLines]           = useState<BackupLine[]>(cached.current.backupLines);
  const [backupAccountsMain,    setBackupAccountsMain]    = useState<BackupAccount[]>(cached.current.backupAccountsMain);
  const [backupAccountsDeposit, setBackupAccountsDeposit] = useState<BackupAccount[]>(cached.current.backupAccountsDeposit);
  const [backupAccountsPending, setBackupAccountsPending] = useState<BackupAccount[]>(cached.current.backupAccountsPending);
  const [suspendedCount,        setSuspendedCount]        = useState<number>(cached.current.suspendedCount);

  useEffect(() => {
    saveCache({ websites, lines, backupLines, backupAccountsMain, backupAccountsDeposit, backupAccountsPending, suspendedCount });
  }, [websites, lines, backupLines, backupAccountsMain, backupAccountsDeposit, backupAccountsPending, suspendedCount]);

  const fetchDashboard = useCallback(() => {
    fetch("/api/websites").then((r) => r.json()).then((d: Website[]) => { if (Array.isArray(d)) setWebsites(d); }).catch(() => {});
    fetch("/api/lines").then((r) => r.json()).then((d: DiscoveredLine[]) => { if (Array.isArray(d)) setLines(d); }).catch(() => {});
    fetch("/api/suspended-lines").then((r) => r.json()).then((d: unknown[]) => { if (Array.isArray(d)) setSuspendedCount(d.length); }).catch(() => {});
  }, []);

  const fetchBackupData = useCallback(() => {
    fetch("/api/backup-groups").then((r) => r.json()).then((d: BackupLine[]) => { if (Array.isArray(d)) setBackupLines(d); }).catch(() => {});
    fetch("/api/backup-accounts").then((r) => r.json()).then((d: { main: BackupAccount[]; deposit: BackupAccount[]; pending: BackupAccount[] }) => {
      if (d && typeof d === "object") {
        setBackupAccountsMain(d.main ?? []);
        setBackupAccountsDeposit(d.deposit ?? []);
        setBackupAccountsPending(d.pending ?? []);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchDashboard(); fetchBackupData(); }, [fetchDashboard, fetchBackupData]);
  useEffect(() => {
    const id = setInterval(() => { fetchDashboard(); fetchBackupData(); }, 15_000);
    return () => clearInterval(id);
  }, [fetchDashboard, fetchBackupData]);

  // ── Dashboard handlers ───────────────────────────────────────────────────────

  const handleAddWebsite = async (name: string, url: string): Promise<Website | null> => {
    if (!name.trim() || !url.trim()) return null;
    try {
      const res  = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });
      const site: Website = await res.json();
      setWebsites((prev) => prev.find((w) => w.id === site.id) ? prev : [...prev, site]);
      return site;
    } catch { return null; }
  };

  const handleRemoveWebsite = async (id: string) => {
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setLines((prev) => prev.filter((l) => l.websiteId !== id));
    try { await fetch(`/api/websites/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  const handleReorderWebsites = async (orderedIds: string[]) => {
    const map = new Map(websites.map((w) => [w.id, w]));
    setWebsites([
      ...orderedIds.map((id) => map.get(id)).filter((w): w is Website => !!w),
      ...websites.filter((w) => !orderedIds.includes(w.id)),
    ]);
    try {
      await fetch("/api/websites/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });
    } catch { /* ignore */ }
  };

  const handleAssignRole = async (lineId: string, role: "main" | "deposit") => {
    setLines((prev) => prev.map((l) => l.id === lineId ? { ...l, role } : l));
    try {
      await fetch(`/api/discovered-lines/${lineId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch { /* ignore */ }
  };

  const handleRemoveLine = async (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    try { await fetch(`/api/discovered-lines/${lineId}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  type SaveScanAccount = { lineId: string; name: string; url: string; status: string; role: "main" | "deposit" };
  const handleSaveScan = async (siteId: string, accounts: SaveScanAccount[]) => {
    try {
      await fetch(`/api/websites/${siteId}/save-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      fetchDashboard();
    } catch { /* ignore */ }
  };

  // ── Backup pool handlers ─────────────────────────────────────────────────────

  const handleAddBackup = async (url: string, role: BackupLineRole) => {
    try {
      const res   = await fetch("/api/backup-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, role }) });
      const group: BackupLine = await res.json();
      setBackupLines((prev) => prev.find((l) => l.id === group.id) ? prev : [...prev, group]);
    } catch { /* ignore */ }
  };

  const handleRemoveBackup = async (id: string) => {
    setBackupLines((prev) => prev.filter((l) => l.id !== id));
    setBackupAccountsMain((prev)    => prev.filter((a) => a.groupId !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.groupId !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.groupId !== id));
    try { await fetch(`/api/backup-groups/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  const handleRemoveBackupAccount = async (id: string) => {
    setBackupAccountsMain((prev)    => prev.filter((a) => a.id !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
    try { await fetch(`/api/backup-accounts/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  const handleConfirmBackupAccount = async (id: string, websiteId: string, websiteName: string) => {
    const acc = backupAccountsPending.find((a) => a.id === id);
    if (acc) {
      const confirmed = { ...acc, websiteId, websiteName, confirmed: true };
      setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
      if (acc.role === "main") setBackupAccountsMain((prev) => [...prev, confirmed]);
      else setBackupAccountsDeposit((prev) => [...prev, confirmed]);
    }
    try {
      await fetch(`/api/backup-accounts/${id}/confirm`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, websiteName }) });
    } catch { /* ignore */ }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <DashboardContent
            websites={websites}
            lines={lines}
            suspendedCount={suspendedCount}
            onAddWebsite={handleAddWebsite}
            onRemoveWebsite={handleRemoveWebsite}
            onReorderWebsites={handleReorderWebsites}
            onAssignRole={handleAssignRole}
            onRemoveLine={handleRemoveLine}
            onSaveScan={handleSaveScan}
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
