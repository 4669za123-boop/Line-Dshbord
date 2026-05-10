
import { useMemo, useState } from "react"
import { Globe, Sparkles, Users, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  LineCard,
  mergeWebsitesWithLineStatus,
  type LineAccount,
} from "./line-card"
import type { Website } from "./types"

export type DashboardContentProps = {
  websites: Website[]
  accounts: LineAccount[]
  onAddWebsite: (name: string, url: string) => void
  onRemoveWebsite: (id: string) => void
}

export function DashboardContent({
  websites,
  accounts,
  onAddWebsite,
  onRemoveWebsite,
}: DashboardContentProps) {
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false)
  const [newWebsiteName, setNewWebsiteName] = useState("")
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("")

  const websiteRows = useMemo(
    () => mergeWebsitesWithLineStatus(websites, accounts),
    [websites, accounts],
  )

  const submitNewWebsite = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newWebsiteName.trim()
    const trimmedUrl = newWebsiteUrl.trim()
    if (!trimmed || !trimmedUrl) return
    onAddWebsite(trimmed, trimmedUrl)
    setNewWebsiteName("")
    setNewWebsiteUrl("")
    setWebsiteDialogOpen(false)
  }

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              สถานะไลน์
            </h1>
            <p className="text-muted-foreground mt-1">
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
              <Sparkles className="h-4 w-4 text-primary opacity-70" />
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
            <form onSubmit={submitNewWebsite} className="space-y-5 px-6 pb-6 pt-4">
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
                  <Button type="button" variant="outline" className="rounded-xl">
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
            (sum, s) => sum + (s.mainLineId ? 1 : 0) + (s.depositLineId ? 1 : 0),
            0,
          )
          const onlineCount = websiteRows.reduce(
            (sum, s) =>
              sum +
              (s.mainLineId && s.mainStatus === "normal" ? 1 : 0) +
              (s.depositLineId && s.depositStatus === "normal" ? 1 : 0),
            0,
          )
          const suspendedCount = websiteRows.reduce(
            (sum, s) =>
              sum +
              (s.mainLineId && s.mainStatus === "suspended" ? 1 : 0) +
              (s.depositLineId && s.depositStatus === "suspended" ? 1 : 0),
            0,
          )
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("h-3 w-3 rounded-full transition-colors", totalAccounts > 0 ? "bg-foreground/60" : "bg-foreground/20")} />
                  <p className="text-sm text-muted-foreground">บัญชีทั้งหมด</p>
                </div>
                <p className={cn("text-2xl font-bold", totalAccounts > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {totalAccounts}
                </p>
              </div>
              <div className={cn(
                "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group",
                onlineCount > 0 ? "bg-primary/5 border-primary/25" : "bg-card border-border"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("h-3 w-3 rounded-full transition-colors", onlineCount > 0 ? "bg-primary" : "bg-primary/30")} />
                  <p className={cn("text-sm", onlineCount > 0 ? "text-primary/80" : "text-muted-foreground")}>ออนไลน์</p>
                </div>
                <p className={cn("text-2xl font-bold", onlineCount > 0 ? "text-primary" : "text-muted-foreground")}>
                  {onlineCount}
                </p>
              </div>
              <div className={cn(
                "border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group",
                suspendedCount > 0 ? "bg-destructive/5 border-destructive/25" : "bg-card border-border"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("h-3 w-3 rounded-full transition-colors", suspendedCount > 0 ? "bg-destructive" : "bg-destructive/30")} />
                  <p className={cn("text-sm", suspendedCount > 0 ? "text-destructive/80" : "text-muted-foreground")}>โดนระงับ</p>
                </div>
                <p className={cn("text-2xl font-bold", suspendedCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                  {suspendedCount}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("h-3 w-3 rounded-full transition-colors", websites.length > 0 ? "bg-foreground/60" : "bg-foreground/20")} />
                  <p className="text-sm text-muted-foreground">เว็บไซต์</p>
                </div>
                <p className={cn("text-2xl font-bold", websites.length > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {websites.length}
                </p>
              </div>
            </div>
          )
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {websiteRows.map((summary) => (
            <LineCard
              key={summary.websiteId}
              summary={summary}
              onRemove={onRemoveWebsite}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
