import { useEffect, useState, useCallback } from "react";
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

export default function App() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const [websites, setWebsites]     = useState<Website[]>([]);
  const [lines, setLines]           = useState<DiscoveredLine[]>([]);

  // ไลน์สำรอง state
  const [backupLines, setBackupLines]                   = useState<BackupLine[]>([]);
  const [backupAccountsMain, setBackupAccountsMain]     = useState<BackupAccount[]>([]);
  const [backupAccountsDeposit, setBackupAccountsDeposit] = useState<BackupAccount[]>([]);
  const [backupAccountsPending, setBackupAccountsPending] = useState<BackupAccount[]>([]);

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(() => {
    fetch("/api/websites")
      .then((r) => r.json())
      .then((data: Website[]) => setWebsites(data))
      .catch(() => {});

    fetch("/api/lines")
      .then((r) => r.json())
      .then((data: DiscoveredLine[]) => {
        if (Array.isArray(data)) setLines(data);
      })
      .catch(() => {});
  }, []);

  const fetchBackupData = useCallback(() => {
    // กลุ่มสำรองที่ผู้ใช้เพิ่มไว้
    fetch("/api/backup-groups")
      .then((r) => r.json())
      .then((data: BackupLine[]) => {
        if (Array.isArray(data)) setBackupLines(data);
      })
      .catch(() => {});

    // บัญชีที่ backup-scanner สแกนพบ
    fetch("/api/backup-accounts")
      .then((r) => r.json())
      .then((data: { main: BackupAccount[]; deposit: BackupAccount[]; pending: BackupAccount[] }) => {
        setBackupAccountsMain(data.main ?? []);
        setBackupAccountsDeposit(data.deposit ?? []);
        setBackupAccountsPending(data.pending ?? []);
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
      setWebsites((prev) => [...prev, site]);
    } catch {}
  };

  const handleRemoveWebsite = async (id: string) => {
    try { await fetch(`/api/websites/${id}`, { method: "DELETE" }); } catch {}
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setLines((prev) => prev.filter((l) => l.websiteId !== id));
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

  /** เพิ่มกลุ่มสำรอง → บันทึกผ่าน API (backup-scanner จะสแกนในรอบถัดไป) */
  const handleAddBackup = async (url: string, role: BackupLineRole) => {
    try {
      const res  = await fetch("/api/backup-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, role }),
      });
      const group: BackupLine = await res.json();
      setBackupLines((prev) => {
        // ป้องกัน duplicate
        if (prev.find((l) => l.id === group.id)) return prev;
        return [...prev, group];
      });
    } catch {}
  };

  /** ลบกลุ่มสำรอง */
  const handleRemoveBackup = async (id: string) => {
    setBackupLines((prev) => prev.filter((l) => l.id !== id));
    try { await fetch(`/api/backup-groups/${id}`, { method: "DELETE" }); } catch {}
  };

  /** ลบบัญชีสำรองออกจาก pool */
  const handleRemoveBackupAccount = async (id: string) => {
    setBackupAccountsMain((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
    try { await fetch(`/api/backup-accounts/${id}`, { method: "DELETE" }); } catch {}
  };

  /** ยืนยันบัญชี pending → กำหนดเว็บแล้วย้ายไป main/deposit */
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
