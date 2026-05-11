import { cn } from "@/lib/utils"
import { Trash2, UserCheck, Wallet } from "lucide-react"

export type LineStatus = "normal" | "inactive"
export type LineRole = "main" | "deposit" | null

export type DiscoveredLine = {
  id: string
  name: string
  lineId: string
  websiteId: string
  websiteName: string
  url: string
  role: LineRole
  status: LineStatus
}

export type SuspendedLine = {
  id: string
  name: string
  site: string
  siteId: string
  url: string
  role: "main" | "deposit"
  suspendedAt: string
}

export type WebsiteLineSummary = {
  websiteId: string
  websiteName: string
  websiteUrl?: string
  mainLines: DiscoveredLine[]
  depositLines: DiscoveredLine[]
  unassignedLines: DiscoveredLine[]
}

export function mergeWebsitesWithLineStatus(
  websites: { id: string; name: string; url?: string }[],
  lines: DiscoveredLine[],
): WebsiteLineSummary[] {
  return websites.map((w) => {
    const siteLines = lines.filter((l) => l.websiteId === w.id)
    return {
      websiteId: w.id,
      websiteName: w.name,
      websiteUrl: w.url,
      mainLines: siteLines.filter((l) => l.role === "main"),
      depositLines: siteLines.filter((l) => l.role === "deposit"),
      unassignedLines: siteLines.filter((l) => l.role === null),
    }
  })
}

function StatusBadge({ status }: { status: LineStatus }) {
  if (status === "normal") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        ออนไลน์
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
      ไม่ทราบ
    </span>
  )
}

function LineRow({
  line,
  onAssign,
  onRemove,
}: {
  line: DiscoveredLine
  onAssign?: (id: string, role: "main" | "deposit") => void
  onRemove?: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 group/row">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold tracking-wide text-white leading-snug truncate">
          {line.name}
        </p>
        <p className="text-[11px] text-muted-foreground/45 tracking-widest mt-1.5 truncate">
          @{line.id}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onAssign && (
          <>
            <button
              type="button"
              onClick={() => onAssign(line.id, "main")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              หลัก
            </button>
            <button
              type="button"
              onClick={() => onAssign(line.id, "deposit")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              ฝากถอน
            </button>
          </>
        )}
        {!onAssign && <StatusBadge status={line.status} />}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(line.id)}
            className="opacity-0 group-hover/row:opacity-100 p-1 rounded text-destructive/40 hover:text-destructive transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

interface LineCardProps {
  summary: WebsiteLineSummary
  onRemoveWebsite: (websiteId: string) => void
  onAssignRole: (lineId: string, role: "main" | "deposit") => void
  onRemoveLine: (lineId: string) => void
}

export function LineCard({ summary, onRemoveWebsite, onAssignRole, onRemoveLine }: LineCardProps) {
  const hasAny =
    summary.mainLines.length > 0 ||
    summary.depositLines.length > 0 ||
    summary.unassignedLines.length > 0

  const hasMainSection = summary.mainLines.length > 0
  const hasDepositSection = summary.depositLines.length > 0

  return (
    <div className="relative bg-card border border-border rounded-2xl px-5 pt-4 pb-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,185,0,0.08)]">
      {/* header: ชื่อเว็บ + ปุ่มลบ */}
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        {summary.websiteUrl ? (
          <a
            href={summary.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold text-white truncate hover:text-primary transition-colors"
            title={summary.websiteUrl}
          >
            {summary.websiteName}
          </a>
        ) : (
          <h3 className="text-base font-bold text-white truncate">{summary.websiteName}</h3>
        )}
        <button
          type="button"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          onClick={() => onRemoveWebsite(summary.websiteId)}
        >
          <Trash2 className="h-3 w-3" />
          ลบ
        </button>
      </div>

      {!hasAny && (
        <p className="text-xs text-muted-foreground/40 italic mt-3">
          ยังไม่พบไลน์ในกลุ่มนี้ รอ checker สแกน...
        </p>
      )}

      {/* ไลน์หลัก */}
      {hasMainSection && (
        <>
          <div className="border-t border-white/8 mt-4 mb-3" />
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] mb-2">
            ไลน์หลัก
          </p>
          <div className="divide-y divide-white/5">
            {summary.mainLines.map((l) => (
              <LineRow key={l.id} line={l} />
            ))}
          </div>
        </>
      )}

      {/* ไลน์ฝากถอน */}
      {hasDepositSection && (
        <>
          <div className="border-t border-white/8 mt-4 mb-3" />
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] mb-2">
            ไลน์ฝากถอน
          </p>
          <div className="divide-y divide-white/5">
            {summary.depositLines.map((l) => (
              <LineRow key={l.id} line={l} />
            ))}
          </div>
        </>
      )}

      {/* รอกำหนดหน้าที่ */}
      {summary.unassignedLines.length > 0 && (
        <>
          <div className="border-t border-white/8 mt-4 mb-3" />
          <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-[0.15em] mb-2">
            รอกำหนดหน้าที่
          </p>
          <div className="space-y-0.5">
            {summary.unassignedLines.map((l) => (
              <LineRow
                key={l.id}
                line={l}
                onAssign={onAssignRole}
                onRemove={onRemoveLine}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
