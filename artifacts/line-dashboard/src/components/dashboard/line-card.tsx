
import { cn } from "@/lib/utils"
import { Trash2, RefreshCw } from "lucide-react"
import type { Website } from "./types"

export type LineChannelStatus = "normal" | "suspended" | "inactive"

export interface LineAccount {
  id: string
  name: string
  websiteId: string
  websiteName: string
  lineRole: "main" | "deposit"
  mainStatus: LineChannelStatus
  depositStatus: LineChannelStatus
}

export type FailoverEntry = {
  at: string
  site: string
  role: string
  oldLineId: string
  newLineId: string
  newLineName: string
  seleniumOk: boolean
}

export type WebsiteLineSummary = {
  websiteId: string
  websiteName: string
  websiteUrl?: string
  mainStatus: "normal" | "suspended"
  depositStatus: "normal" | "suspended"
  mainLineId?: string
  depositLineId?: string
  mainFailover?: FailoverEntry
  depositFailover?: FailoverEntry
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

function FailoverBadge({ entry }: { entry: FailoverEntry }) {
  const diffMs = Date.now() - new Date(entry.at).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const label = diffMin < 60
    ? `${diffMin} นาทีที่แล้ว`
    : `${Math.floor(diffMin / 60)} ชม. ที่แล้ว`

  return (
    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
      <RefreshCw className="h-2.5 w-2.5" />
      สับเปลี่ยน {label}
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
  failoverLog: FailoverEntry[] = [],
): WebsiteLineSummary[] {
  const bySite = aggregateAccountStatusesByWebsite(accounts)

  // หา failover ล่าสุดต่อเว็บ+role (ภายใน 24 ชม.)
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000
  const latestFailover = new Map<string, FailoverEntry>()
  for (const entry of failoverLog) {
    if (new Date(entry.at).getTime() < recentCutoff) continue
    const key = `${entry.site}:${entry.role}`
    const existing = latestFailover.get(key)
    if (!existing || entry.at > existing.at) {
      latestFailover.set(key, entry)
    }
  }

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
      mainFailover: latestFailover.get(`${w.name}:หลัก`),
      depositFailover: latestFailover.get(`${w.name}:ฝากถอน`),
    }
  })
}

export function LineCard({ summary, onRemove }: LineCardProps) {
  return (
    <div className="relative bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
      <button
        type="button"
        className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-destructive/50 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200"
        onClick={() => onRemove(summary.websiteId)}
      >
        <Trash2 className="h-4 w-4" />
      </button>

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

      <div className="space-y-3">
        {/* ไลน์หลัก */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">ไลน์หลัก</p>
            {summary.mainLineId && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80 font-mono" title={summary.mainLineId}>
                {summary.mainLineId}
              </p>
            )}
            {summary.mainFailover && (
              <FailoverBadge entry={summary.mainFailover} />
            )}
          </div>
          <StatusBadge status={summary.mainStatus} />
        </div>

        {/* ไลน์ฝากถอน */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">ไลน์ฝากถอน</p>
            {summary.depositLineId && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80 font-mono" title={summary.depositLineId}>
                {summary.depositLineId}
              </p>
            )}
            {summary.depositFailover && (
              <FailoverBadge entry={summary.depositFailover} />
            )}
          </div>
          <StatusBadge status={summary.depositStatus} />
        </div>
      </div>
    </div>
  )
}
