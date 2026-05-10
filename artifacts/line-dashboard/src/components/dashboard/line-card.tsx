
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Website } from "./types"

export type LineChannelStatus = "normal" | "suspended" | "inactive"

export interface LineAccount {
  id: string
  /** ค่าที่กรอกในช่อง LINE ID หรือ URL */
  name: string
  websiteId: string
  websiteName: string
  lineRole: "main" | "deposit"
  mainStatus: LineChannelStatus
  depositStatus: LineChannelStatus
}

/** การ์ดหนึ่งใบต่อหนึ่งเว็บ: ชื่อเว็บ / ไลน์หลัก / ฝากถอน + สถานะออนไลน์หรือโดนระงับ */
export type WebsiteLineSummary = {
  websiteId: string
  websiteName: string
  websiteUrl?: string
  mainStatus: "normal" | "suspended"
  depositStatus: "normal" | "suspended"
  /** LINE ID/URL ล่าสุดในช่องไลน์หลัก (ถ้ามี) */
  mainLineId?: string
  /** LINE ID/URL ล่าสุดในช่องฝากถอน (ถ้ามี) */
  depositLineId?: string
}

interface LineCardProps {
  summary: WebsiteLineSummary
  onRemove: (websiteId: string) => void
}

function StatusBadge({ status }: { status: "normal" | "suspended" }) {
  const online = status === "normal"
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        online
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          online ? "bg-primary animate-pulse" : "bg-destructive"
        )}
      />
      {online ? "ออนไลน์" : "โดนระงับ"}
    </div>
  )
}

function aggregateAccountStatusesByWebsite(
  accounts: LineAccount[],
): Map<string, { main: "normal" | "suspended"; deposit: "normal" | "suspended" }> {
  const groups = new Map<
    string,
    { websiteName: string; mains: LineAccount[]; deps: LineAccount[] }
  >()

  for (const a of accounts) {
    let g = groups.get(a.websiteId)
    if (!g) {
      g = { websiteName: a.websiteName, mains: [], deps: [] }
      groups.set(a.websiteId, g)
    }
    if (a.websiteName) g.websiteName = a.websiteName
    if (a.lineRole === "main") g.mains.push(a)
    else g.deps.push(a)
  }

  const out = new Map<
    string,
    { main: "normal" | "suspended"; deposit: "normal" | "suspended" }
  >()

  for (const [websiteId, g] of groups) {
    const lastMain = g.mains[g.mains.length - 1]
    const lastDep = g.deps[g.deps.length - 1]

    const main: "normal" | "suspended" = lastMain
      ? lastMain.mainStatus === "suspended"
        ? "suspended"
        : "normal"
      : "normal"

    const deposit: "normal" | "suspended" = lastDep
      ? lastDep.depositStatus === "suspended"
        ? "suspended"
        : "normal"
      : "normal"

    out.set(websiteId, { main, deposit })
  }

  return out
}

function lastAccountForChannel(
  accounts: LineAccount[],
  websiteId: string,
  role: "main" | "deposit",
): LineAccount | undefined {
  const list = accounts.filter(
    (a) => a.websiteId === websiteId && a.lineRole === role,
  )
  return list[list.length - 1]
}

/** แสดงการ์ดครบทุกเว็บที่สร้างไว้ แม้ยังไม่ได้เพิ่ม LINE */
export function mergeWebsitesWithLineStatus(
  websites: Website[],
  accounts: LineAccount[],
): WebsiteLineSummary[] {
  const bySite = aggregateAccountStatusesByWebsite(accounts)

  return websites.map((w) => {
      const s = bySite.get(w.id)
      const mainAcc = lastAccountForChannel(accounts, w.id, "main")
      const depAcc = lastAccountForChannel(accounts, w.id, "deposit")
      return {
        websiteId: w.id,
        websiteName: w.name,
        websiteUrl: w.url,
        mainStatus: s?.main ?? "normal",
        depositStatus: s?.deposit ?? "normal",
        mainLineId: mainAcc?.name,
        depositLineId: depAcc?.name,
      }
    })
}

export function LineCard({ summary, onRemove }: LineCardProps) {
  return (
    <div className="relative bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
      {/* Trash — absolute top-right */}
      <button
        type="button"
        className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-destructive/50 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200"
        onClick={() => onRemove(summary.websiteId)}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Website name */}
      <div className="mb-4 pr-10 min-w-0">
        {summary.websiteUrl ? (
          <a
            href={summary.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-foreground truncate block hover:text-primary transition-colors"
            title={summary.websiteUrl}
          >
            {summary.websiteName}
          </a>
        ) : (
          <h3 className="text-lg font-bold text-foreground truncate">
            {summary.websiteName}
          </h3>
        )}
      </div>

      {/* Line rows */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">ไลน์หลัก</p>
            {summary.mainLineId && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80" title={summary.mainLineId}>
                {summary.mainLineId}
              </p>
            )}
          </div>
          <StatusBadge status={summary.mainStatus} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">ไลน์ฝากถอน</p>
            {summary.depositLineId && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80" title={summary.depositLineId}>
                {summary.depositLineId}
              </p>
            )}
          </div>
          <StatusBadge status={summary.depositStatus} />
        </div>
      </div>
    </div>
  )
}
