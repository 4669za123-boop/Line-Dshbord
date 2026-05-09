import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Archive,
  ArrowRight,
  X,
  Copy,
  Check,
  Search,
  RotateCcw,
  ExternalLink,
  StickyNote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Website } from "./types"

export type BackupLineRole = "main" | "deposit"

export interface BackupLine {
  id: string
  lineId: string
  role: BackupLineRole
  websiteId: string | null
  websiteName: string | null
  confirmed: boolean
  note?: string
}

interface BackupPoolPageProps {
  websites: Website[]
  backupLines: BackupLine[]
  onAddBackup: (lineId: string, role: BackupLineRole, note?: string) => void
  onRemoveBackup: (id: string) => void
  onConfirmBackup: (id: string, websiteId: string, websiteName: string) => void
}

type RoleFilter = "all" | "main" | "deposit"

function RoleBadge({ role }: { role: BackupLineRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
        role === "main"
          ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
          : "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20"
      )}
    >
      {role === "main" ? "ไลน์หลัก" : "ฝากถอน"}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silent
    }
  }
  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn(
        "shrink-0 h-7 w-7 transition-colors",
        copied ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={handleCopy}
      title="คัดลอก URL"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function BackupPoolPage({
  websites,
  backupLines,
  onAddBackup,
  onRemoveBackup,
  onConfirmBackup,
}: BackupPoolPageProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [newLineId, setNewLineId] = useState("")
  const [newRole, setNewRole] = useState<BackupLineRole | "">("")
  const [newNote, setNewNote] = useState("")

  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningLine, setAssigningLine] = useState<BackupLine | null>(null)
  const [assignWebsiteId, setAssignWebsiteId] = useState<string>("")

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")

  const pending = backupLines.filter((b) => !b.confirmed)
  const confirmed = backupLines.filter((b) => b.confirmed)

  const mainCount = backupLines.filter((b) => b.role === "main").length
  const depositCount = backupLines.filter((b) => b.role === "deposit").length

  const filteredConfirmed = useMemo(() => {
    let list = confirmed
    if (roleFilter !== "all") list = list.filter((b) => b.role === roleFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (b) =>
          b.lineId.toLowerCase().includes(q) ||
          (b.websiteName ?? "").toLowerCase().includes(q) ||
          (b.note ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [confirmed, roleFilter, search])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLineId.trim() || !newRole) return
    onAddBackup(newLineId.trim(), newRole as BackupLineRole, newNote)
    setNewLineId("")
    setNewRole("")
    setNewNote("")
    setAddOpen(false)
  }

  const openAssign = (line: BackupLine) => {
    setAssigningLine(line)
    setAssignWebsiteId(line.websiteId ?? websites[0]?.id ?? "")
    setAssignOpen(true)
  }

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningLine || !assignWebsiteId) return
    const ws = websites.find((w) => w.id === assignWebsiteId)
    if (!ws) return
    onConfirmBackup(assigningLine.id, ws.id, ws.name)
    setAssignOpen(false)
    setAssigningLine(null)
  }

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10 max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <Archive className="h-5 w-5 text-primary" />
              </span>
              ไลน์สำรอง
            </h1>
            <p className="text-muted-foreground mt-1 ml-1">
              สต็อกกลุ่ม LINE สำรอง — เมื่อไลน์หลักถูก suspend ให้ดึงจากที่นี่มาแทนทันที
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group relative flex w-full shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-[1px] transition-transform active:scale-[0.99] sm:w-auto"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400/80 to-primary opacity-80 transition-opacity group-hover:opacity-100" aria-hidden />
            <span className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-background/95 px-5 py-3 text-sm font-semibold text-foreground shadow-[0_0_24px_-4px_rgba(0,185,0,0.35)] backdrop-blur-sm transition-colors group-hover:bg-background dark:bg-background/90">
              <Plus className="h-4 w-4 text-primary" />
              เพิ่มกลุ่มไลน์สำรอง
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">สำรองทั้งหมด</p>
            <p className={cn("text-2xl font-bold mt-1", backupLines.length > 0 ? "text-foreground" : "text-muted-foreground")}>
              {backupLines.length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">ไลน์หลัก</p>
            <p className={cn("text-2xl font-bold mt-1", mainCount > 0 ? "text-blue-400" : "text-muted-foreground")}>
              {mainCount}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">ไลน์ฝากถอน</p>
            <p className={cn("text-2xl font-bold mt-1", depositCount > 0 ? "text-purple-400" : "text-muted-foreground")}>
              {depositCount}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">รอการยืนยัน</p>
            <p className={cn("text-2xl font-bold mt-1", pending.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
              {pending.length}
            </p>
          </div>
        </div>

        {/* Pending Section */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-semibold text-amber-400">รอการยืนยัน ({pending.length})</h2>
              <span className="text-xs text-muted-foreground">— ยังไม่กำหนดเว็บ กรุณาระบุด้วย</span>
            </div>
            <div className="space-y-2">
              {pending.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <RoleBadge role={line.role} />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={line.lineId}>{line.lineId}</p>
                    {line.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />{line.note}
                      </p>
                    )}
                  </div>
                  <CopyButton text={line.lineId} />
                  <Button
                    size="sm"
                    onClick={() => openAssign(line)}
                    className="shrink-0 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 gap-1.5"
                    variant="ghost"
                  >
                    กำหนดเว็บ
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveBackup(line.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed Pool */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              สต็อกสำรองพร้อมใช้
              {confirmed.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({confirmed.length} รายการ)</span>
              )}
            </h2>
          </div>

          {/* Filter & Search */}
          {confirmed.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex rounded-xl overflow-hidden border border-border bg-card p-1 gap-1">
                {(["all", "main", "deposit"] as RoleFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRoleFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      roleFilter === f
                        ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f === "all" ? "ทั้งหมด" : f === "main" ? "ไลน์หลัก" : "ฝากถอน"}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา URL, เว็บ, หรือหมายเหตุ..."
                  className="pl-9 h-9 border-border bg-card text-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {confirmed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Archive className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">ยังไม่มีกลุ่มไลน์สำรอง</p>
              <p className="text-xs text-muted-foreground/60 mt-1">กดปุ่ม "เพิ่มกลุ่มไลน์สำรอง" เพื่อเริ่มต้น</p>
            </div>
          ) : filteredConfirmed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">ไม่พบรายการที่ค้นหา</p>
              <button
                type="button"
                onClick={() => { setSearch(""); setRoleFilter("all") }}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConfirmed.map((line) => (
                <div
                  key={line.id}
                  className="bg-card border border-border rounded-2xl p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(0,185,0,0.08)] group"
                >
                  <div className="flex items-start gap-3">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <RoleBadge role={line.role} />
                        {line.websiteName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground ring-1 ring-border">
                            {line.websiteName}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary ring-1 ring-primary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          พร้อม
                        </span>
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <a
                          href={line.lineId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground truncate hover:text-primary transition-colors font-mono"
                          title={line.lineId}
                        >
                          {line.lineId}
                        </a>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Note */}
                      {line.note && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <StickyNote className="h-3 w-3 shrink-0" />
                          {line.note}
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <CopyButton text={line.lineId} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
                        title="เปลี่ยนเว็บ"
                        onClick={() => openAssign(line)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="ลบ"
                        onClick={() => onRemoveBackup(line.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Backup Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="overflow-hidden border-border bg-background p-0 sm:max-w-md">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background px-6 pb-2 pt-10">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
            <DialogHeader className="relative space-y-3 text-center sm:text-left">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/25 sm:mx-0">
                <Archive className="h-7 w-7" />
              </div>
              <DialogTitle className="text-xl">เพิ่มกลุ่มไลน์สำรอง</DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleAdd} className="space-y-4 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                URL กลุ่มไลน์สำรอง <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={newLineId}
                onChange={(e) => setNewLineId(e.target.value)}
                placeholder="เช่น https://manager.line.biz/groups/..."
                className="h-11 border-border bg-input font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                ประเภท <span className="text-destructive">*</span>
              </label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as BackupLineRole)}>
                <SelectTrigger className="h-11 border-border bg-input">
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">ไลน์หลัก</SelectItem>
                  <SelectItem value="deposit">ไลน์ฝากถอน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                หมายเหตุ <span className="text-xs text-muted-foreground font-normal">(ไม่บังคับ)</span>
              </label>
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="เช่น สำรองแบรนด์ A เผื่อฉุกเฉิน"
                className="h-11 border-border bg-input text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">ยกเลิก</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!newLineId.trim() || !newRole}
                className="rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-4px_rgba(0,185,0,0.45)] hover:bg-primary/90 disabled:opacity-50"
              >
                เพิ่ม
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign / Re-assign Website Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="border-border bg-background sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              {assigningLine?.websiteId ? "เปลี่ยนเว็บ" : "กำหนดเว็บให้ไลน์สำรอง"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 pt-2">
            {assigningLine && (
              <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm space-y-2">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">URL</p>
                  <p className="font-mono text-xs text-foreground truncate">{assigningLine.lineId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={assigningLine.role} />
                  {assigningLine.websiteName && (
                    <span className="text-xs text-muted-foreground">เดิม: {assigningLine.websiteName}</span>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">เลือกเว็บปลายทาง</label>
              <Select value={assignWebsiteId} onValueChange={setAssignWebsiteId}>
                <SelectTrigger className="h-11 border-border bg-input">
                  <SelectValue placeholder="เลือกเว็บ..." />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">ยกเลิก</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!assignWebsiteId}
                className="rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50"
              >
                ยืนยัน
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
