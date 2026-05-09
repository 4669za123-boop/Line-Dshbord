import { useEffect, useState } from "react";
import { Sidebar, type PageType } from "@/components/dashboard/sidebar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { AddLinePage } from "@/components/dashboard/add-line-page";
import { NotificationSettingsPage } from "@/components/dashboard/notification-settings-page";
import { BackupPoolPage, type BackupLine, type BackupLineRole } from "@/components/dashboard/backup-pool-page";
import type { Website, AddLineFormPayload } from "@/components/dashboard/types";
import type { LineAccount } from "@/components/dashboard/line-card";

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

        // เทียบ type จาก lines.json กับ lineRole ใน localStorage
        const isMain    = lineType === "หลัก"      || (lineType === "" && acc.lineRole === "main");
        const isDeposit = lineType === "ฝากถอน"    || (lineType === "" && acc.lineRole === "deposit");

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

  const handleAddLine = async (p: AddLineFormPayload) => {
    const trimmed = p.lineIdentifier.trim();
    if (!trimmed) return;

    const site = websites.find((w) => w.id === p.websiteId);
    if (!site) return;

    try {
      await fetch("/api/add-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          type: p.role === "main" ? "หลัก" : "ฝากถอน",
          site: site.name,
        }),
      });
    } catch (err) {
      console.log("API ERROR:", err);
    }

    const next: LineAccount = {
      id: crypto.randomUUID(),
      name: trimmed,
      websiteId: site.id,
      websiteName: site.name,
      lineRole: p.role,
      mainStatus: p.role === "main" ? "normal" : "inactive",
      depositStatus: p.role === "deposit" ? "normal" : "inactive",
    };

    setAccounts((prev) => {
      const rest = prev.filter(
        (a) => !(a.websiteId === site.id && a.lineRole === p.role),
      );
      return [...rest, next];
    });
  };

  const handleAddBackup = (lineId: string, role: BackupLineRole, note?: string) => {
    const newBackup: BackupLine = {
      id: crypto.randomUUID(),
      lineId,
      role,
      websiteId: null,
      websiteName: null,
      confirmed: false,
      note: note?.trim() || undefined,
    };
    setBackupLines((prev) => [...prev, newBackup]);
  };

  const handleRemoveBackup = (id: string) => {
    setBackupLines((prev) => prev.filter((b) => b.id !== id));
  };

  const handleConfirmBackup = (id: string, websiteId: string, websiteName: string) => {
    setBackupLines((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, websiteId, websiteName, confirmed: true } : b
      )
    );
  };

  const pendingBackupCount = backupLines.filter((b) => !b.confirmed).length;

  const dashboard = (
    <DashboardContent
      websites={websites}
      accounts={accounts}
      onAddWebsite={handleAddWebsite}
      onRemoveWebsite={handleRemoveWebsite}
    />
  );

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return dashboard;
      case "add-line":
        return (
          <AddLinePage
            websites={websites}
            onAddLine={handleAddLine}
            onNavigateDashboard={() => setActivePage("dashboard")}
          />
        );
      case "backup-pool":
        return (
          <BackupPoolPage
            websites={websites}
            backupLines={backupLines}
            onAddBackup={handleAddBackup}
            onRemoveBackup={handleRemoveBackup}
            onConfirmBackup={handleConfirmBackup}
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
