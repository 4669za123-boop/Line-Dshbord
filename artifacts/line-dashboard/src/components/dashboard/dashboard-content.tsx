import { useMemo, useState, useRef } from "react";
import { Globe, LayoutDashboard, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineCard,
  mergeWebsitesWithLineStatus,
  type LineAccount,
  type WebsiteSummary,
} from "./line-card";
import type { Website } from "./types";

export type DashboardContentProps = {
  websites: Website[];
  accounts: LineAccount[];
  onAddWebsite: (name: string, url: string) => void;
  onRemoveWebsite: (id: string) => void;
  onReorderWebsites: (orderedIds: string[]) => void;
};

type SortableCardProps = {
  summary: WebsiteSummary;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
};

function SortableCard({
  summary,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  isOver,
}: SortableCardProps) {
  const handleRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(summary.websiteId);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter(summary.websiteId);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={cn(
        "relative group/drag transition-all duration-200 cursor-default",
        isDragging && "opacity-40 scale-[0.98]",
        isOver && !isDragging && "ring-2 ring-primary/60 rounded-2xl scale-[1.01]",
      )}
    >
      <button
        ref={handleRef}
        className="absolute top-3 right-10 z-10 p-1 rounded-lg opacity-0 group-hover/drag:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary"
        title="ลากเพื่อเรียงลำดับ"
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LineCard summary={summary} onRemove={onRemove} />
    </div>
  );
}

export function DashboardContent({
  websites,
  accounts,
  onAddWebsite,
  onRemoveWebsite,
  onReorderWebsites,
}: DashboardContentProps) {
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const websiteRows = useMemo(
    () => mergeWebsitesWithLineStatus(websites, accounts),
    [websites, accounts],
  );

  const handleDragEnd = () => {
    if (dragId && overId && dragId !== overId) {
      const ids = websiteRows.map((r) => r.websiteId);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(overId);
      if (from !== -1 && to !== -1) {
        const reordered = [...ids];
        reordered.splice(from, 1);
        reordered.splice(to, 0, dragId);
        onReorderWebsites(reordered);
      }
    }
    setDragId(null);
    setOverId(null);
  };

  const submitNewWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWebsiteName.trim();
    const trimmedUrl = newWebsiteUrl.trim();
    if (!trimmed || !trimmedUrl) return;
    onAddWebsite(trimmed, trimmedUrl);
    setNewWebsiteName("");
    setNewWebsiteUrl("");
    setWebsiteDialogOpen(false);
  };

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </span>
              แดชบอร์ด
            </h1>
            <p className="text-muted-foreground mt-1 ml-1">
              จัดการและตรวจสอบบัญชีไลน์ของคุณ
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWebsiteDialogOpen(true)}
            className="group relative flex w-full shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-[1px] transition-transform active:scale-[0.99] sm:w-auto"
          >
            <span
              className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400/80 to-primary opacity-80 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <span className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-background/95 px-5 py-3 text-sm font-semibold text-foreground shadow-[0_0_24px_-4px_rgba(0,185,0,0.35)] backdrop-blur-sm transition-colors group-hover:bg-background dark:bg-background/90">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Globe className="h-4 w-4" />
              </span>
              เพิ่มเว็บไซต์
            </span>
          </button>
        </div>

        <Dialog open={websiteDialogOpen} onOpenChange={setWebsiteDialogOpen}>
          <DialogContent className="overflow-hidden border-border bg-background p-0 sm:max-w-md">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/25 via-background to-background px-6 pb-2 pt-10">
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
              <DialogHeader className="relative space-y-3 text-center sm:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/25 sm:mx-0">
                  <Globe className="h-7 w-7" />
                </div>
                <DialogTitle className="text-xl">เพิ่มเว็บไซต์</DialogTitle>
              </DialogHeader>
            </div>
            <form
              onSubmit={submitNewWebsite}
              className="space-y-5 px-6 pb-6 pt-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  ชื่อเว็บไซต์
                </label>
                <Input
                  autoFocus
                  value={newWebsiteName}
                  onChange={(e) => setNewWebsiteName(e.target.value)}
                  placeholder="เช่น เว็บหลัก, แบรนด์ A, แคมเปญสมาชิก"
                  className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  URL เว็บไซต์
                </label>
                <Input
                  type="text"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                  placeholder="เช่น https://example.com"
                  className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                  >
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!newWebsiteName.trim() || !newWebsiteUrl.trim()}
                  className="rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-4px_rgba(0,185,0,0.45)] hover:bg-primary/90 disabled:opacity-50"
                >
                  ตกลง
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {(() => {
          const totalAccounts = websiteRows.reduce(
            (sum, s) =>
              sum + (s.mainLineId ? 1 : 0) + (s.depositLineId ? 1 : 0),
            0,
          );
          const onlineCount = websiteRows.reduce(
            (sum, s) =>
              sum +
              (s.mainLineId && s.mainStatus === "normal" ? 1 : 0) +
              (s.depositLineId && s.depositStatus === "normal" ? 1 : 0),
            0,
          );
          const suspendedCount = websiteRows.reduce(
            (sum, s) =>
              sum +
              (s.mainLineId && s.mainStatus === "suspended" ? 1 : 0) +
              (s.depositLineId && s.depositStatus === "suspended" ? 1 : 0),
            0,
          );
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full transition-colors",
                      totalAccounts > 0
                        ? "bg-foreground/70"
                        : "bg-foreground/20",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm transition-colors",
                      totalAccounts > 0
                        ? "text-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    บัญชีทั้งหมด
                  </p>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    totalAccounts > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {totalAccounts}
                </p>
              </div>
              <div
                className={cn(
                  "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group",
                  onlineCount > 0
                    ? "bg-primary/5 border-primary/25"
                    : "bg-card border-border",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full transition-colors",
                      onlineCount > 0 ? "bg-primary" : "bg-primary/30",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm",
                      onlineCount > 0
                        ? "text-primary/80"
                        : "text-muted-foreground",
                    )}
                  >
                    ออนไลน์
                  </p>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    onlineCount > 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {onlineCount}
                </p>
              </div>
              <div
                className={cn(
                  "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group",
                  suspendedCount > 0
                    ? "bg-destructive/5 border-destructive/25"
                    : "bg-card border-border",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full transition-colors",
                      suspendedCount > 0
                        ? "bg-destructive"
                        : "bg-destructive/30",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm",
                      suspendedCount > 0
                        ? "text-destructive/80"
                        : "text-muted-foreground",
                    )}
                  >
                    โดนระงับ
                  </p>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    suspendedCount > 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {suspendedCount}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full transition-colors",
                      websites.length > 0
                        ? "bg-foreground/70"
                        : "bg-foreground/20",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm transition-colors",
                      websites.length > 0
                        ? "text-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    เว็บไซต์
                  </p>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    websites.length > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {websites.length}
                </p>
              </div>
            </div>
          );
        })()}

        {websiteRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">ยังไม่มีเว็บไซต์</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              กดปุ่ม "เพิ่มเว็บไซต์" มุมบนขวาเพื่อเริ่มต้น
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {websiteRows.map((summary) => (
              <SortableCard
                key={summary.websiteId}
                summary={summary}
                onRemove={onRemoveWebsite}
                onDragStart={(id) => setDragId(id)}
                onDragEnter={(id) => setOverId(id)}
                onDragEnd={handleDragEnd}
                isDragging={dragId === summary.websiteId}
                isOver={overId === summary.websiteId && dragId !== summary.websiteId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
