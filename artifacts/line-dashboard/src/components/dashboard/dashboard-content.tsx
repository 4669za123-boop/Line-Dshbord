import { useMemo, useState } from "react";
import { Globe, LayoutDashboard, GripVertical, Loader2, CheckCircle2, AlertCircle, User } from "lucide-react";
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
  type DiscoveredLine,
  type WebsiteLineSummary,
} from "./line-card";
import type { Website } from "./types";

type ScanAccount = {
  lineId: string;
  name: string;
  url: string;
  status: "normal" | "suspended";
};

type ScanRole = "main" | "deposit" | "skip";

type SaveScanAccount = {
  lineId: string; name: string; url: string; status: string; role: "main" | "deposit";
};

export type DashboardContentProps = {
  websites: Website[];
  lines: DiscoveredLine[];
  suspendedCount: number;
  onAddWebsite: (name: string, url: string) => Promise<Website | null>;
  onRemoveWebsite: (id: string) => void;
  onReorderWebsites: (orderedIds: string[]) => void;
  onAssignRole: (lineId: string, role: "main" | "deposit") => void;
  onRemoveLine: (lineId: string) => void;
  onSaveScan: (siteId: string, accounts: SaveScanAccount[]) => Promise<void>;
};

type SortableCardProps = {
  summary: WebsiteLineSummary;
  onRemoveWebsite: (id: string) => void;
  onAssignRole: (lineId: string, role: "main" | "deposit") => void;
  onRemoveLine: (lineId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
};

function SortableCard({
  summary,
  onRemoveWebsite,
  onAssignRole,
  onRemoveLine,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  isOver,
}: SortableCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(summary.websiteId); }}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(summary.websiteId); }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={cn(
        "relative group/drag transition-all duration-200 cursor-default",
        isDragging && "opacity-40 scale-[0.98]",
        isOver && !isDragging && "ring-2 ring-primary/60 rounded-2xl scale-[1.01]",
      )}
    >
      <button
        className="absolute top-3 right-10 z-10 p-1 rounded-lg opacity-0 group-hover/drag:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary"
        title="ลากเพื่อเรียงลำดับ"
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LineCard
        summary={summary}
        onRemoveWebsite={onRemoveWebsite}
        onAssignRole={onAssignRole}
        onRemoveLine={onRemoveLine}
      />
    </div>
  );
}

export function DashboardContent({
  websites,
  lines,
  suspendedCount,
  onAddWebsite,
  onRemoveWebsite,
  onReorderWebsites,
  onAssignRole,
  onRemoveLine,
  onSaveScan,
}: DashboardContentProps) {
  // ── Add website dialog ─────────────────────────────────────────────────────
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl]   = useState("");
  const [addLoading, setAddLoading]          = useState(false);

  // ── Scan dialog ───────────────────────────────────────────────────────────
  const [scanDialogOpen, setScanDialogOpen]   = useState(false);
  const [scanSite, setScanSite]               = useState<Website | null>(null);
  const [scanStatus, setScanStatus]           = useState<"scanning" | "done" | "error">("scanning");
  const [scanAccounts, setScanAccounts]       = useState<ScanAccount[]>([]);
  const [scanError, setScanError]             = useState("");
  const [roleMap, setRoleMap]                 = useState<Record<string, ScanRole>>({});
  const [savingRoles, setSavingRoles]         = useState(false);

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const websiteRows = useMemo(
    () => mergeWebsitesWithLineStatus(websites, lines),
    [websites, lines],
  );

  const assignedLines = lines.filter((l) => l.role !== null);
  const totalAccounts = assignedLines.length;
  const onlineCount   = assignedLines.filter((l) => l.status === "normal").length;

  const handleDragEnd = () => {
    if (dragId && overId && dragId !== overId) {
      const ids  = websiteRows.map((r) => r.websiteId);
      const from = ids.indexOf(dragId);
      const to   = ids.indexOf(overId);
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

  // ── Submit add website → scan ─────────────────────────────────────────────
  const submitNewWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWebsiteName.trim();
    const url  = newWebsiteUrl.trim();
    if (!name || !url) return;

    setAddLoading(true);
    const site = await onAddWebsite(name, url);
    setAddLoading(false);

    setNewWebsiteName("");
    setNewWebsiteUrl("");
    setWebsiteDialogOpen(false);

    if (!site) return;

    // เปิด scan dialog ทันที
    setScanSite(site);
    setScanStatus("scanning");
    setScanAccounts([]);
    setScanError("");
    setRoleMap({});
    setScanDialogOpen(true);

    // เรียก scan
    try {
      const res = await fetch(`/api/websites/${site.id}/scan`);
      const data = await res.json() as { ok: boolean; accounts?: ScanAccount[]; error?: string };
      if (data.ok && Array.isArray(data.accounts)) {
        setScanAccounts(data.accounts);
        const initial: Record<string, ScanRole> = {};
        for (const a of data.accounts) initial[a.lineId] = "skip";
        setRoleMap(initial);
        setScanStatus("done");
      } else {
        setScanError(data.error ?? "สแกนไม่สำเร็จ");
        setScanStatus("error");
      }
    } catch (err) {
      setScanError(String(err));
      setScanStatus("error");
    }
  };

  const setRole = (lineId: string, role: ScanRole) => {
    setRoleMap((prev) => ({ ...prev, [lineId]: role }));
  };

  const handleScanConfirm = async () => {
    if (!scanSite) return;
    setSavingRoles(true);
    const toSave: SaveScanAccount[] = scanAccounts
      .filter((a) => roleMap[a.lineId] !== "skip")
      .map((a) => ({
        lineId: a.lineId,
        name:   a.name,
        url:    a.url,
        status: a.status,
        role:   roleMap[a.lineId] as "main" | "deposit",
      }));
    await onSaveScan(scanSite.id, toSave);
    setSavingRoles(false);
    setScanDialogOpen(false);
  };

  const allAssigned = scanAccounts.length > 0 && scanAccounts.every((a) => roleMap[a.lineId] !== undefined);

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">
        {/* Header row */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </span>
              แดชบอร์ด
            </h1>
            <p className="text-muted-foreground mt-1 ml-1">
              จัดการและตรวจสอบสถานะบัญชีไลน์
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWebsiteDialogOpen(true)}
            className="group relative flex w-full shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-[1px] transition-transform active:scale-[0.99] sm:w-auto"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400/80 to-primary opacity-80 transition-opacity group-hover:opacity-100" aria-hidden />
            <span className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-background/95 px-5 py-3 text-sm font-semibold text-foreground shadow-[0_0_24px_-4px_rgba(0,185,0,0.35)] backdrop-blur-sm transition-colors group-hover:bg-background dark:bg-background/90">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Globe className="h-4 w-4" />
              </span>
              เพิ่มกลุ่มLine
            </span>
          </button>
        </div>

        {/* ── Add website dialog ───────────────────────────────────────── */}
        <Dialog open={websiteDialogOpen} onOpenChange={setWebsiteDialogOpen}>
          <DialogContent className="overflow-hidden border-border bg-background p-0 sm:max-w-md">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/25 via-background to-background px-6 pb-2 pt-10">
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
              <DialogHeader className="relative space-y-3 text-center sm:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/25 sm:mx-0">
                  <Globe className="h-7 w-7" />
                </div>
                <DialogTitle className="text-xl">เพิ่มกลุ่ม LINE</DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={submitNewWebsite} className="space-y-5 px-6 pb-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">ชื่อกลุ่ม</label>
                <Input
                  autoFocus
                  value={newWebsiteName}
                  onChange={(e) => setNewWebsiteName(e.target.value)}
                  placeholder="เช่น กลุ่มหลัก, เว็บ A"
                  className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">URL กลุ่ม LINE OA</label>
                <Input
                  type="text"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                  placeholder="เช่น https://manager.line.biz/groups/..."
                  className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="rounded-xl" disabled={addLoading}>
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!newWebsiteName.trim() || !newWebsiteUrl.trim() || addLoading}
                  className="rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-4px_rgba(0,185,0,0.45)] hover:bg-primary/90 disabled:opacity-50"
                >
                  {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ตกลง"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Scan results dialog ──────────────────────────────────────── */}
        <Dialog open={scanDialogOpen} onOpenChange={(o) => { if (!savingRoles) setScanDialogOpen(o); }}>
          <DialogContent className="overflow-hidden border-border bg-background p-0 sm:max-w-lg">
            {/* header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background px-6 pb-3 pt-8">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
              <DialogHeader className="relative space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    {scanStatus === "scanning" && <Loader2 className="h-5 w-5 animate-spin" />}
                    {scanStatus === "done"     && <CheckCircle2 className="h-5 w-5" />}
                    {scanStatus === "error"    && <AlertCircle className="h-5 w-5 text-destructive" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base leading-tight">
                      {scanStatus === "scanning" && "กำลังสแกนกลุ่ม LINE…"}
                      {scanStatus === "done"     && `พบ ${scanAccounts.length} account`}
                      {scanStatus === "error"    && "สแกนไม่สำเร็จ"}
                    </DialogTitle>
                    {scanSite && (
                      <p className="text-xs text-muted-foreground mt-0.5">{scanSite.name}</p>
                    )}
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 pt-2 space-y-4">
              {/* scanning */}
              {scanStatus === "scanning" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                  <p className="text-sm text-muted-foreground text-center">
                    เปิด Chrome สแกน account ในกลุ่ม<br />
                    <span className="text-xs text-muted-foreground/60">อาจใช้เวลา 1–2 นาที</span>
                  </p>
                </div>
              )}

              {/* error */}
              {scanStatus === "error" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive font-medium mb-1">ไม่สามารถสแกนได้</p>
                  <p className="text-xs text-muted-foreground break-all">{scanError}</p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    checker จะสแกนอัตโนมัติทุก 60 วินาที หรือลองใหม่ภายหลัง
                  </p>
                </div>
              )}

              {/* done — account list */}
              {scanStatus === "done" && scanAccounts.length === 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">ไม่พบ account ในกลุ่มนี้</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">checker จะสแกนอีกครั้งทุก 60 วินาที</p>
                </div>
              )}

              {scanStatus === "done" && scanAccounts.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground mb-1">เลือกหน้าที่ให้แต่ละ account:</p>
                  {scanAccounts.map((acc) => {
                    const role = roleMap[acc.lineId];
                    return (
                      <div
                        key={acc.lineId}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{acc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-muted-foreground font-mono">@{acc.lineId}</p>
                            {acc.status === "suspended" ? (
                              <span className="text-[10px] font-bold text-destructive">โดนระงับ</span>
                            ) : (
                              <span className="text-[10px] font-bold text-primary">ออนไลน์</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setRole(acc.lineId, "main")}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                              role === "main"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                : "bg-muted/50 text-muted-foreground border-border hover:text-blue-400 hover:border-blue-500/30",
                            )}
                          >
                            หลัก
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole(acc.lineId, "deposit")}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                              role === "deposit"
                                ? "bg-violet-500/20 text-violet-400 border-violet-500/50"
                                : "bg-muted/50 text-muted-foreground border-border hover:text-violet-400 hover:border-violet-500/30",
                            )}
                          >
                            ฝากถอน
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole(acc.lineId, "skip")}
                            className={cn(
                              "px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                              role === "skip"
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-transparent text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:border-border",
                            )}
                          >
                            ข้าม
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* footer buttons */}
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={savingRoles}
                  onClick={() => setScanDialogOpen(false)}
                >
                  {scanStatus === "scanning" ? "ข้ามก่อน" : "ปิด"}
                </Button>
                {scanStatus === "done" && scanAccounts.length > 0 && (
                  <Button
                    type="button"
                    disabled={!allAssigned || savingRoles}
                    onClick={handleScanConfirm}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingRoles
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />กำลังบันทึก…</>
                      : "ยืนยัน"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full", totalAccounts > 0 ? "bg-foreground/70" : "bg-foreground/20")} />
              <p className={cn("text-sm", totalAccounts > 0 ? "text-foreground/80" : "text-muted-foreground")}>บัญชีทั้งหมด</p>
            </div>
            <p className={cn("text-2xl font-bold", totalAccounts > 0 ? "text-foreground" : "text-muted-foreground")}>{totalAccounts}</p>
          </div>

          <div className={cn("border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]", onlineCount > 0 ? "bg-primary/5 border-primary/25" : "bg-card border-border")}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full", onlineCount > 0 ? "bg-primary" : "bg-primary/30")} />
              <p className={cn("text-sm", onlineCount > 0 ? "text-primary/80" : "text-muted-foreground")}>ออนไลน์</p>
            </div>
            <p className={cn("text-2xl font-bold", onlineCount > 0 ? "text-primary" : "text-muted-foreground")}>{onlineCount}</p>
          </div>

          <div className={cn("border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]", suspendedCount > 0 ? "bg-destructive/5 border-destructive/25" : "bg-card border-border")}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full", suspendedCount > 0 ? "bg-destructive" : "bg-destructive/30")} />
              <p className={cn("text-sm", suspendedCount > 0 ? "text-destructive/80" : "text-muted-foreground")}>โดนระงับ</p>
            </div>
            <p className={cn("text-2xl font-bold", suspendedCount > 0 ? "text-destructive" : "text-muted-foreground")}>{suspendedCount}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full", websites.length > 0 ? "bg-foreground/70" : "bg-foreground/20")} />
              <p className={cn("text-sm", websites.length > 0 ? "text-foreground/80" : "text-muted-foreground")}>กลุ่ม</p>
            </div>
            <p className={cn("text-2xl font-bold", websites.length > 0 ? "text-foreground" : "text-muted-foreground")}>{websites.length}</p>
          </div>
        </div>

        {/* Cards */}
        {websiteRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">ยังไม่มีกลุ่ม</p>
            <p className="text-xs text-muted-foreground/60 mt-1">กดปุ่ม "เพิ่มกลุ่ม" มุมบนขวาเพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {websiteRows.map((summary) => (
              <SortableCard
                key={summary.websiteId}
                summary={summary}
                onRemoveWebsite={onRemoveWebsite}
                onAssignRole={onAssignRole}
                onRemoveLine={onRemoveLine}
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
