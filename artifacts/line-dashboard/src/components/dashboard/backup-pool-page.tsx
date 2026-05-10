import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash2,
  Archive,
  ArrowRight,
  ExternalLink,
  StickyNote,
  Users,
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

type TabType = "main" | "deposit" | "pending"

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

function RoleBadge({ role }: { role: BackupLineRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold",
        role === "main"
          ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25"
          : "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/25"
      )}
    >
      {role === "main" ? "ไลน์หลัก" : "ไลน์ฝากถอน"}
    </span>
  )
}

function ReadyBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary ring-1 ring-primary/20">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      พร้อม
    </span>
  )
}

/** แถวแสดงกลุ่มสำรองแบบ compact */
function GroupRow({
  line,
  onRemove,
}: {
  line: BackupLine
  onRemove: (id: string) => void
}) {
  const groupName = line.note || `กลุ่มสำรอง${line.role === "main" ? "ไลน์หลัก" : "ไลน์ฝากถอน"}`
  const isMain = line.role === "main"
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group">
      <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors duration-300" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <a
          href={line.lineId}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors duration-200"
          title={line.lineId}
          onClick={(e) => e.stopPropagation()}
        >
          {groupName}
        </a>
        {line.websiteName && (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {line.websiteName}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(line.id)}
        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-destructive/60 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200"
        title="ลบกลุ่มนี้"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

/** การ์ดแสดงไลน์ที่ confirmed */
function LineDetailCard({
  line,
  onRemove,
  onReassign,
}: {
  line: BackupLine
  onRemove: (id: string) => void
  onReassign: (line: BackupLine) => void
}) {
  return (
    <div className="relative bg-card border border-border rounded-2xl p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(0,185,0,0.07)] group">
      {/* Trash — absolute top-right */}
      <button
        type="button"
        className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-destructive/50 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200"
        onClick={() => onRemove(line.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="pr-10 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RoleBadge role={line.role} />
          {line.websiteName && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground ring-1 ring-border">
              {line.websiteName}
            </span>
          )}
          <ReadyBadge />
        </div>
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
        {line.note && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="h-3 w-3 shrink-0" />
            {line.note}
          </p>
        )}
      </div>
    </div>
  )
}

export function BackupPoolPage({
  websites,
  backupLines,
  onAddBackup,
  onRemoveBackup,
  onConfirmBackup,
}: BackupPoolPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("main")
  const [groupTab, setGroupTab] = useState<"main" | "deposit">("main")

  const [addOpen, setAddOpen] = useState(false)
  const [newLineId, setNewLineId] = useState("")
  const [newRole, setNewRole] = useState<BackupLineRole | "">("")
  const [newNote, setNewNote] = useState("")

  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningLine, setAssigningLine] = useState<BackupLine | null>(null)
  const [assignWebsiteId, setAssignWebsiteId] = useState<string>("")

  const pending = useMemo(() => backupLines.filter((b) => !b.confirmed), [backupLines])
  const confirmed = useMemo(() => backupLines.filter((b) => b.confirmed), [backupLines])
  const mainCount = useMemo(() => confirmed.filter((b) => b.role === "main").length, [confirmed])
  const depositCount = useMemo(() => confirmed.filter((b) => b.role === "deposit").length, [confirmed])

  const tabs: { key: TabType; label: string; count: number; color: string }[] = [
    { key: "main", label: "ไลน์หลัก", count: mainCount, color: "blue" },
    { key: "deposit", label: "ฝากถอน", count: depositCount, color: "purple" },
    { key: "pending", label: "รอการยืนยัน", count: pending.length, color: "amber" },
  ]

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLineId.trim() || !newRole) return
    onAddBackup(newLineId.trim(), newRole as BackupLineRole, newNote)
    setNewLineId("")
    setNewRole("")
    setNewNote("")
    setAddOpen(false)
    setActiveTab("pending")
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

  const renderTabContent = () => {
    if (activeTab === "pending") {
      if (pending.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
            <Archive className="h-9 w-9 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">ไม่มีรายการที่รอการยืนยัน</p>
            <p className="text-xs text-muted-foreground/60 mt-1">ทุกกลุ่มได้รับการกำหนดเว็บแล้ว</p>
          </div>
        )
      }
      return (
        <div className="space-y-2">
          {pending.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <RoleBadge role={line.role} />
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25">
                    ยังไม่กำหนดเว็บ
                  </span>
                </div>
                <p className="text-sm font-mono text-foreground truncate" title={line.lineId}>{line.lineId}</p>
                {line.note && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="h-3 w-3 shrink-0" />
                    {line.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => openAssign(line)}
                  className="rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 gap-1.5 h-8 text-xs px-3"
                  variant="ghost"
                >
                  กำหนดเว็บ
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-destructive/50 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200"
                  onClick={() => onRemoveBackup(line.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    const items = confirmed.filter((b) => b.role === (activeTab === "main" ? "main" : "deposit"))
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
          <Archive className="h-9 w-9 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">ยังไม่มีไลน์ในหมวดนี้</p>
          <p className="text-xs text-muted-foreground/60 mt-1">เพิ่มกลุ่มแล้วกำหนดเว็บให้ครบ</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {items.map((line) => (
          <LineDetailCard
            key={line.id}
            line={line}
            onRemove={onRemoveBackup}
            onReassign={openAssign}
          />
        ))}
      </div>
    )
  }

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">

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
              สต็อกกลุ่ม LINE สำรอง — เมื่อไลน์หลักถูก suspend ดึงจากที่นี่มาแทนทันที
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
          <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full transition-colors", backupLines.length > 0 ? "bg-foreground/70" : "bg-foreground/20")} />
              <p className={cn("text-sm transition-colors", backupLines.length > 0 ? "text-foreground/80" : "text-muted-foreground")}>กลุ่มสำรองทั้งหมด</p>
            </div>
            <p className={cn("text-2xl font-bold", backupLines.length > 0 ? "text-foreground" : "text-muted-foreground")}>
              {backupLines.length}
            </p>
          </div>
          <div className={cn(
            "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]",
            mainCount > 0 ? "bg-blue-500/5 border-blue-500/25" : "bg-card border-border"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full transition-colors", mainCount > 0 ? "bg-blue-400" : "bg-blue-400/30")} />
              <p className={cn("text-sm transition-colors", mainCount > 0 ? "text-blue-400" : "text-muted-foreground")}>ไลน์หลัก</p>
            </div>
            <p className={cn("text-2xl font-bold", mainCount > 0 ? "text-blue-400" : "text-muted-foreground")}>
              {mainCount}
            </p>
          </div>
          <div className={cn(
            "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]",
            depositCount > 0 ? "bg-purple-500/5 border-purple-500/25" : "bg-card border-border"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full transition-colors", depositCount > 0 ? "bg-purple-400" : "bg-purple-400/30")} />
              <p className={cn("text-sm transition-colors", depositCount > 0 ? "text-purple-400" : "text-muted-foreground")}>ไลน์ฝากถอน</p>
            </div>
            <p className={cn("text-2xl font-bold", depositCount > 0 ? "text-purple-400" : "text-muted-foreground")}>
              {depositCount}
            </p>
          </div>
          <div className={cn(
            "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]",
            pending.length > 0 ? "bg-amber-500/5 border-amber-500/25" : "bg-card border-border"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("h-3 w-3 rounded-full transition-colors", pending.length > 0 ? "bg-amber-400" : "bg-amber-400/30")} />
              <p className={cn("text-sm transition-colors", pending.length > 0 ? "text-amber-400" : "text-muted-foreground")}>รอการยืนยัน</p>
            </div>
            <p className={cn("text-2xl font-bold", pending.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
              {pending.length}
            </p>
          </div>
        </div>

        {/* Section 1: รายการกลุ่มที่เพิ่มไว้ */}
        {backupLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center mb-8">
            <Archive className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">ยังไม่มีกลุ่มไลน์สำรอง</p>
            <p className="text-xs text-muted-foreground/60 mt-1">กดปุ่ม "เพิ่มกลุ่มไลน์สำรอง" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="mb-6">
            {/* Group tab bar */}
            <div className="inline-flex rounded-xl border border-border bg-card p-1 gap-1 mb-4">
              {([
                { key: "main" as const, label: "กลุ่มไลน์หลัก", count: backupLines.filter(l => l.role === "main").length, color: "blue" },
                { key: "deposit" as const, label: "กลุ่มไลน์ฝากถอน", count: backupLines.filter(l => l.role === "deposit").length, color: "purple" },
              ]).map((t) => {
                const isActive = groupTab === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setGroupTab(t.key)}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      isActive
                        ? t.color === "blue"
                          ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25"
                          : "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {t.label}
                    <span className={cn(
                      "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold",
                      isActive
                        ? t.color === "blue"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-violet-500/20 text-violet-300"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Filtered group rows */}
            <div className="space-y-2">
              {backupLines.filter(l => l.role === groupTab).map((line) => (
                <GroupRow key={line.id} line={line} onRemove={onRemoveBackup} />
              ))}
              {backupLines.filter(l => l.role === groupTab).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ยังไม่มี{groupTab === "main" ? "กลุ่มไลน์หลัก" : "กลุ่มไลน์ฝากถอน"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Tab bar — แสดงเสมอ */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1 gap-1 mb-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  isActive
                    ? tab.color === "amber"
                      ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25"
                      : tab.color === "blue"
                      ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25"
                      : "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
                <span className={cn(
                  "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold",
                  isActive
                    ? tab.color === "amber"
                      ? "bg-amber-500/20 text-amber-300"
                      : tab.color === "blue"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-purple-500/20 text-purple-300"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Section 3: ไลน์ในกลุ่มตาม Tab */}
        {renderTabContent()}
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
              <p className="text-sm text-muted-foreground">
                หลังเพิ่มแล้ว ระบบจะขอให้คุณกำหนดว่ากลุ่มนี้ใช้กับเว็บไหน
              </p>
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
                placeholder="https://manager.line.biz/groups/..."
                className="h-11 border-border bg-input font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                ประเภทไลน์ในกลุ่มนี้ <span className="text-destructive">*</span>
              </label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as BackupLineRole)}>
                <SelectTrigger className="h-11 border-border bg-input">
                  <SelectValue placeholder="เลือกว่ากลุ่มนี้เป็นไลน์อะไร" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">ไลน์หลัก</SelectItem>
                  <SelectItem value="deposit">ไลน์ฝากถอน</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                กลุ่มนี้เก็บไลน์ประเภทไหน — ระบบจะจำแนกหมวดหมู่จากตรงนี้
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                ชื่อกลุ่ม / หมายเหตุ
                <span className="text-xs text-muted-foreground font-normal">(ไม่บังคับ)</span>
              </label>
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="เช่น กลุ่มสำรองไลน์หลัก, สำรองแบรนด์ A"
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

      {/* Assign Website Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="border-border bg-background sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-amber-400/80 shrink-0" />
              {assigningLine?.websiteId ? "เปลี่ยนเว็บ" : "กำหนดเว็บให้กลุ่มนี้"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 pt-2">
            {assigningLine && (
              <div className="rounded-xl bg-muted/30 px-4 py-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <RoleBadge role={assigningLine.role} />
                  {assigningLine.websiteName && (
                    <span className="text-xs text-muted-foreground">เดิม: {assigningLine.websiteName}</span>
                  )}
                </div>
                <p className="font-mono text-xs text-foreground truncate" title={assigningLine.lineId}>
                  {assigningLine.lineId}
                </p>
                {assigningLine.note && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />{assigningLine.note}
                  </p>
                )}
              </div>
            )}
            {websites.length === 0 ? (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
                ยังไม่มีเว็บในระบบ — ไปเพิ่มเว็บที่หน้าแดชบอร์ดก่อน
              </div>
            ) : (
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
            )}
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">ยกเลิก</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!assignWebsiteId || websites.length === 0}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
