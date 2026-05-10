import { useEffect, useState } from "react";
import { Sidebar, type PageType } from "@/components/dashboard/sidebar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { NotificationSettingsPage } from "@/components/dashboard/notification-settings-page";
import { BackupPoolPage, type BackupLine, type BackupLineRole, type BackupAccount } from "@/components/dashboard/backup-pool-page";
import type { Website } from "@/components/dashboard/types";
import type { LineAccount, FailoverEntry } from "@/components/dashboard/line-card";

const BACKUP_STORAGE_KEY = "line-mgmt-backup-pool";
const ACCOUNTS_STORAGE_KEY = "line-mgmt-accounts";

function isLineChannelStatus(x: unknown): x is LineAccount["mainStatus"] {
  return x === "normal" || x === "suspended" || x === "inactive";
}

function isLineRole(x: unknown): x is LineAccount["lineRole"] {
  return x === "main" || x === "deposit";
}

function extractLineId(input: string): string {
  if (!input) return "";
  if (input.includes("/account/")) {
    return input.split("/account/")[1].replace("@", "").toLowerCase();
  }
  return input.replace("@", "").toLowerCase();
}

function loadAccountsFromStorage(): LineAccount[] {
  try {
    const raw = typeof window !== "undefined"
      ? window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
      : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: LineAccount[] = [];
    for (const row of parsed) {
      if (row === null || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const id = r.id;
      const name = r.name;
      const websiteId = r.websiteId;
      let websiteName = r.websiteName;
      const rawLineRole = r.lineRole;
      const lineRole: LineAccount["lineRole"] = isLineRole(rawLineRole) ? rawLineRole : "main";
      const mainStatus = r.mainStatus;
      const depositStatus = r.depositStatus;

      if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        typeof websiteId !== "string"
      ) continue;

      if (typeof websiteName !== "string") websiteName = "";

      if (!isLineChannelStatus(mainStatus) || !isLineChannelStatus(depositStatus)) continue;

      out.push({
        id,
        name: name.trim(),
        websiteId,
        websiteName: String(websiteName).trim(),
        lineRole,
        mainStatus,
        depositStatus,
      });
    }
    return out.filter((a) => a.name.length > 0);
  } catch {
    return [];
  }
}

function loadBackupFromStorage(): BackupLine[] {
  try {
    const raw = typeof window !== "undefined"
      ? window.localStorage.getItem(BACKUP_STORAGE_KEY)
      : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as BackupLine[]).filter(
      (b) => b && typeof b.id === "string" && typeof b.lineId === "string"
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [backupLines, setBackupLines] = useState<BackupLine[]>([]);
  const [backupAccountsMain, setBackupAccountsMain] = useState<BackupAccount[]>([]);
  const [backupAccountsDeposit, setBackupAccountsDeposit] = useState<BackupAccount[]>([]);
  const [backupAccountsPending, setBackupAccountsPending] = useState<BackupAccount[]>([]);
  const [failoverLog, setFailoverLog] = useState<FailoverEntry[]>([]);
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    fetch("/api/websites")
      .then((r) => r.json())
      .then((data: Website[]) => setWebsites(data))
      .catch(() => setWebsites([]));

    fetch("/api/lines")
      .then((r) => r.json())
      .then((data: LineAccount[]) => {
        if (data.length > 0) {
          setAccounts(data);
        } else {
          setAccounts(loadAccountsFromStorage());
        }
      })
      .catch(() => setAccounts(loadAccountsFromStorage()));

    fetch("/api/backup-accounts")
      .then((r) => r.json())
      .then((data: { main: BackupAccount[]; deposit: BackupAccount[]; pending: BackupAccount[] }) => {
        setBackupAccountsMain(data.main ?? []);
        setBackupAccountsDeposit(data.deposit ?? []);
        setBackupAccountsPending(data.pending ?? []);
      })
      .catch(() => {
        setBackupAccountsMain([]);
        setBackupAccountsDeposit([]);
        setBackupAccountsPending([]);
      });

    setBackupLines(loadBackupFromStorage());
    setPersistReady(true);
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts, persistReady]);

  useEffect(() => {
    if (!persistReady) return;
    window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backupLines));
  }, [backupLines, persistReady]);

  function applyStatuses(statuses: Record<string, { status: string; type?: string } | string>) {
    setAccounts((prev) =>
      prev.map((acc) => {
        const lineId = extractLineId(acc.name);
        const entry = statuses[lineId];
        if (!entry) return acc;

        const rawStatus = typeof entry === "string" ? entry : entry.status;
        const lineType  = typeof entry === "object" ? (entry.type ?? "") : "";

        if (!isLineChannelStatus(rawStatus)) return acc;

        const isMain    = lineType === "หลัก"   || (lineType === "" && acc.lineRole === "main");
        const isDeposit = lineType === "ฝากถอน" || (lineType === "" && acc.lineRole === "deposit");

        if (isMain && acc.lineRole === "main") {
          return { ...acc, mainStatus: rawStatus };
        }
        if (isDeposit && acc.lineRole === "deposit") {
          return { ...acc, depositStatus: rawStatus };
        }
        return acc;
      })
    );
  }

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      fetch("/api/line-status")
        .then((r) => r.json())
        .then((data: Record<string, string>) => {
          if (!cancelled) applyStatuses(data);
        })
        .catch(() => {});
    };

    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // รีเฟรช LINE IDs ทุก 30 วินาที เพื่อรับ ID ใหม่หลัง auto-failover
  useEffect(() => {
    let cancelled = false;

    const refreshLines = () => {
      fetch("/api/lines")
        .then((r) => r.json())
        .then((data: LineAccount[]) => {
          if (!cancelled && data.length > 0) setAccounts(data);
        })
        .catch(() => {});
    };

    const id = setInterval(refreshLines, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ดึง failover log ทุก 30 วินาที เพื่อแสดง badge "สับเปลี่ยนแล้ว"
  useEffect(() => {
    let cancelled = false;

    const fetchLog = () => {
      fetch("/api/failover-log")
        .then((r) => r.json())
        .then((data: FailoverEntry[]) => {
          if (!cancelled) setFailoverLog(data ?? []);
        })
        .catch(() => {});
    };

    fetchLog();
    const id = setInterval(fetchLog, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
    } catch (err) {
      console.log("ADD WEBSITE ERROR:", err);
    }
  };

  const handleRemoveWebsite = async (id: string) => {
    try {
      await fetch(`/api/websites/${id}`, { method: "DELETE" });
    } catch (err) {
      console.log("REMOVE WEBSITE ERROR:", err);
    }
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setAccounts((prev) => prev.filter((a) => a.websiteId !== id));
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
    } catch (err) {
      console.log("REORDER WEBSITES ERROR:", err);
    }
  };

  const handleAddBackup = async (lineId: string, role: BackupLineRole) => {
    const newBackup: BackupLine = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      lineId,
      role,
      websiteId: null,
      websiteName: null,
      confirmed: false,
    };
    setBackupLines((prev) => [...prev, newBackup]);
    // ซิงค์กลุ่มไปยัง server เพื่อให้ backup_scanner.py อ่านได้
    try {
      await fetch("/api/backup-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lineId, role }),
      });
    } catch (err) {
      console.log("SYNC BACKUP GROUP ERROR:", err);
    }
  };

  const handleRemoveBackup = async (id: string) => {
    const group = backupLines.find((b) => b.id === id);
    setBackupLines((prev) => prev.filter((b) => b.id !== id));
    if (group) {
      try {
        // หา server-side group id จาก url ตรงกัน
        const res = await fetch("/api/backup-groups");
        const groups = await res.json() as { id: string; url: string }[];
        const serverGroup = groups.find((g) => g.url === group.lineId);
        if (serverGroup) {
          await fetch(`/api/backup-groups/${serverGroup.id}`, { method: "DELETE" });
        }
      } catch (err) {
        console.log("REMOVE BACKUP GROUP ERROR:", err);
      }
    }
  };

  const handleConfirmBackup = (id: string, websiteId: string, websiteName: string) => {
    setBackupLines((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, websiteId, websiteName, confirmed: true } : b
      )
    );
  };

  const handleRemoveBackupAccount = async (id: string) => {
    // ลบจากทั้ง 3 sections ใน state
    setBackupAccountsMain((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsDeposit((prev) => prev.filter((a) => a.id !== id));
    setBackupAccountsPending((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/backup-accounts/${id}`, { method: "DELETE" });
    } catch (err) {
      console.log("REMOVE BACKUP ACCOUNT ERROR:", err);
    }
  };

  const handleConfirmBackupAccount = async (id: string, websiteId: string, websiteName: string) => {
    // หา account จาก pending แล้วย้ายไป main หรือ deposit
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
    } catch (err) {
      console.log("CONFIRM BACKUP ACCOUNT ERROR:", err);
    }
  };

  const pendingBackupCount =
    backupLines.filter((b) => !b.confirmed).length +
    backupAccountsPending.length;

  const dashboard = (
    <DashboardContent
      websites={websites}
      accounts={accounts}
      failoverLog={failoverLog}
      onAddWebsite={handleAddWebsite}
      onRemoveWebsite={handleRemoveWebsite}
      onReorderWebsites={handleReorderWebsites}
    />
  );

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return dashboard;
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
        return dashboard;
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar activePage={activePage} onPageChange={setActivePage} pendingBackupCount={pendingBackupCount} />
      <div className="transition-opacity duration-300">
        {renderPage()}
      </div>
    </div>
  );
}
