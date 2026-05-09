import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Archive,
  ArrowRight,
  X,
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
}

interface BackupPoolPageProps {
  websites: Website[]
  backupLines: BackupLine[]
  onAddBackup: (lineId: string, role: BackupLineRole, websiteId: string | null) => void
  onRemoveBackup: (id: string) => void
  onConfirmBackup: (id: string, websiteId: string, websiteName: string) => void
}

function RoleBadge({ role }: { role: BackupLineRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        role === "main"
          ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
          : "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20"
      )}
    >
      {role === "main" ? "ไลน์หลัก" : "ฝากถอน"}
    </span>
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
  const [newRole, setNewRole] = useState<BackupLineRole>("main")
  const [newWebsiteId, setNewWebsiteId] = useState<string>("__pool__")

  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningLine, setAssigningLine] = useState<BackupLine | null>(null)
  const [assignWebsiteId, setAssignWebsiteId] = useState<string>("")

  const pending = backupLines.filter((b) => !b.confirmed)
  const confirmed = backupLines.filter((b) => b.confirmed)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLineId.trim()) return
    const wsId = newWebsiteId === "__pool__" ? null : newWebsiteId
    onAddBackup(newLineId.trim(), newRole, wsId)
    setNewLineId("")
    setNewRole("main")
    setNewWebsiteId("__pool__")
    setAddOpen(false)
  }

  const openAssign = (line: BackupLine) => {
    setAssigningLine(line)
    setAssignWebsiteId(websites[0]?.id ?? "")
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
              จัดการสต็อกไลน์สำรอง — เมื่อไลน์หลักบิน ระบบจะดึงจากที่นี่อัตโนมัติ
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
              เพิ่มไลน์สำรอง
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">สำรองทั้งหมด</p>
            <p className="text-2xl font-bold text-foreground mt-1">{backupLines.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">พร้อมใช้งาน</p>
            <p className="text-2xl font-bold text-primary mt-1">{confirmed.length}</p>
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
              <span className="text-xs text-muted-foreground">— ระบบไม่แน่ใจว่าควรดึงเข้ากลุ่มเว็บไหน กรุณากำหนดเอง</span>
            </div>
            <div className="space-y-2">
              {pending.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{line.lineId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={line.role} />
                      <span className="text-xs text-muted-foreground">ยังไม่กำหนดเว็บ</span>
                    </div>
                  </div>
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
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveBackup(line.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed / Pool Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">สต็อกสำรองพร้อมใช้ ({confirmed.length})</h2>
          </div>

          {confirmed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Archive className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">ยังไม่มีไลน์สำรอง</p>
              <p className="text-xs text-muted-foreground/60 mt-1">กดปุ่ม "เพิ่มไลน์สำรอง" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-2">
              {confirmed.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{line.lineId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={line.role} />
                      {line.websiteName ? (
                        <span className="text-xs text-muted-foreground">→ {line.websiteName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">ถังกลาง (ใช้แทนได้ทุกเว็บ)</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveBackup(line.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <DialogTitle className="text-xl">เพิ่มไลน์สำรอง</DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleAdd} className="space-y-4 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">LINE ID หรือ URL</label>
              <Input
                autoFocus
                value={newLineId}
                onChange={(e) => setNewLineId(e.target.value)}
                placeholder="เช่น abc1234 หรือ https://line.me/..."
                className="h-11 border-border bg-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">ประเภท</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as BackupLineRole)}>
                <SelectTrigger className="h-11 border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">ไลน์หลัก</SelectItem>
                  <SelectItem value="deposit">ไลน์ฝากถอน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">กำหนดให้เว็บ (ไม่บังคับ)</label>
              <Select value={newWebsiteId} onValueChange={setNewWebsiteId}>
                <SelectTrigger className="h-11 border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pool__">ถังกลาง (ใช้แทนได้ทุกเว็บ)</SelectItem>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">ถ้าไม่เลือก ระบบจะจับคู่อัตโนมัติด้วยชื่อ หรือใช้เป็นถังกลาง</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">ยกเลิก</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!newLineId.trim()}
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
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              กำหนดเว็บให้ไลน์สำรอง
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 pt-2">
            {assigningLine && (
              <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">LINE ID</p>
                <p className="font-medium text-foreground truncate">{assigningLine.lineId}</p>
                <div className="mt-2">
                  <RoleBadge role={assigningLine.role} />
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
