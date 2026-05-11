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
  const [websites, setWebsites] = useState<Website[]>([]);
  const [lines, setLines] = useState<DiscoveredLine[]>([]);

  // ไลน์สำรอง state
  const [backupLines, setBackupLines] = useState<BackupLine[]>([]);
  const [backupAccountsMain, setBackupAccountsMain] = useState<BackupAccount[]>([]);
  const [backupAccountsDeposit, setBackupAccountsDeposit] = useState<BackupAccount[]>([]);
  const [backupAccountsPending, setBackupAccountsPending] = useState<BackupAccount[]>([]);

  const fetchData = useCallback(() => {
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

  const fetchBackupAccounts = useCallback(() => {
    fetch("/api/backup-accounts")
      .then((r) => r.json())
      .then((data: { main: BackupAccount[]; deposit: BackupAccount[]; pending: BackupAccount[] }) => {
        setBackupAccountsMain(data.main ?? []);
        setBackupAccountsDeposit(data.deposit ?? []);
        setBackupAccountsPending(data.pending ?? []);
      })
      .catch(() => {});
  }, []);

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    fetchData();
    fetchBackupAccounts();
  }, [fetchData, fetchBackupAccounts]);

  // รีเฟรชทุก 15 วินาที
  useEffect(() => {
    const id = setInterval(() => {
      fetchData();
      fetchBackupAccounts();
    }, 15_000);
    return () => clearInterval(id);
  }, [fetchData, fetchBackupAccounts]);

  // ── Dashboard handlers ──────────────────────────────────────────────────

  const handleAddWebsite = async (name: string, url: string) => {
    const trimmed = name.trim();
    if (!trimmed || !url.trim()) return;
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, url: url.trim() }),
      });
      const site: Website = await res.json();
      setWebsites((prev) => [...prev, site]);
    } catch {}
  };

  const handleRemoveWebsite = async (id: string) => {
    try {
      await fetch(`/api/websites/${id}`, { method: "DELETE" });
    } catch {}
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setLines((prev) => prev.filter((l) => l.websiteId !== id));
  };

  const handleReorderWebsites = async (orderedIds: string[]) => {
    const idToWebsite = new Map(websites.map((w) => [w.id, w]));
    const reordered = orderedIds
      .map((id) => idToWebsite.get(id))
      .filter((w): w is Website => w !== undefined);
    const missing = websites.filter((w) => !orderedIds.includes(w.id));
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
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, role } : l))
    );
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
    try {
      await fetch(`/api/discovered-lines/${lineId}`, { method: "DELETE" });
    } catch {}
  };

  // ── Backup pool handlers ────────────────────────────────────────────────

  const handleAddBackup = async (lineId: string, role: BackupLineRole) => {
    const newLine: BackupLine = {
      id: crypto.randomUUID(),
      lineId,
      role,
      websiteId: null,
      websiteName: null,
      confirmed: false,
    };
    setBackupLines((prev) => [...prev, newLine]);
  };

  const handleRemoveBackup = (id: string) => {
    setBackupLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleConfirmBackup = (id: string, websiteId: string, websiteName: string) => {
    setBackupLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, websiteId, websiteName, confirmed: true } : l
      )
    );
  };

  const handleRemoveBackupAccount = async (id: string) => {
    setBackupAccountsMain((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/backup-accounts/${id}`, { method: "DELETE" });
    } catch {}
  };

  const handleConfirmBackupAccount = async (
    id: string,
    websiteId: string,
    websiteName: string
  ) => {
    // หา account ใน pending แล้ว optimistic-update ไปก่อน
    const acc = backupAccountsPending.find((a) => a.id === id);
    if (acc) {
      const confirmed = { ...acc, websiteId, websiteName, confirmed: true };
      setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
      if (acc.role === "main") {
        setBackupAccountsMain((prev) => [...prev, confirmed]);
      } else {
        setBackupAccountsDeposit((prev) => [...prev, confirmed]);
      }
    }
    try {
      await fetch(`/api/backup-accounts/${id}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, websiteName }),
      });
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────────

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
            onConfirmBackup={handleConfirmBackup}
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
