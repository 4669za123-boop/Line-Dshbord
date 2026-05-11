import { useEffect, useState, useCallback } from "react";
import { Sidebar, type PageType } from "@/components/dashboard/sidebar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { NotificationSettingsPage } from "@/components/dashboard/notification-settings-page";
import type { Website } from "@/components/dashboard/types";
import type { DiscoveredLine } from "@/components/dashboard/line-card";

export default function App() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [lines, setLines] = useState<DiscoveredLine[]>([]);

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

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // รีเฟรชทุก 15 วินาที
  useEffect(() => {
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [fetchData]);

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
    // อัปเดต UI ทันที
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
