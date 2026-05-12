import { Trash2 } from "lucide-react"

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

function StatusBadge({ status, color }: { status: LineStatus; color: "blue" | "violet" }) {
  const colors = {
    blue: {
      on: "bg-blue-500/12 text-blue-400 border border-blue-500/25",
      off: "bg-white/4 text-white/25 border border-white/8",
    },
    violet: {
      on: "bg-violet-500/12 text-violet-400 border border-violet-500/25",
      off: "bg-white/4 text-white/25 border border-white/8",
    },
  }
  const cls = status === "normal" ? colors[color].on : colors[color].off
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${status === "normal" ? "animate-pulse" : "opacity-40"}`} />
      {status === "normal" ? "ออนไลน์" : "ออฟไลน์"}
    </span>
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

  return (
    <div className="rounded-xl bg-[#141417] border border-white/7 overflow-hidden shadow-xl transition-all duration-300 hover:border-white/15 hover:shadow-[0_0_24px_rgba(99,102,241,0.08)]">

      {/* header */}
      <div className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b border-white/5">
        {summary.websiteUrl ? (
          <a
            href={summary.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-bold text-white hover:text-blue-400 transition-colors leading-none"
          >
            {summary.websiteName}
          </a>
        ) : (
          <p className="text-[15px] font-bold text-white leading-none">{summary.websiteName}</p>
        )}
        <button
          type="button"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          onClick={() => onRemoveWebsite(summary.websiteId)}
        >
          <Trash2 className="h-3 w-3" />
          ลบ
        </button>
      </div>

      {!hasAny && (
        <p className="px-5 py-4 text-xs text-white/25 italic">
          ยังไม่พบไลน์ในกลุ่มนี้ รอ checker สแกน...
        </p>
      )}

      {/* ไลน์หลัก (ฟ้า) */}
      {summary.mainLines.length > 0 && (
        <div className="px-5 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[3px] h-3.5 rounded-full bg-blue-500 shrink-0" />
            <p className="text-[9px] font-bold text-blue-400/80 uppercase tracking-[0.2em]">ไลน์หลัก</p>
            <span className="ml-auto text-[9px] text-white/20">{summary.mainLines.length} รายการ</span>
          </div>
          <div className="space-y-1.5 pl-5 border-l border-blue-500/20">
            {summary.mainLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-blue-500/5 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white leading-none truncate">{l.name}</p>
                  <p className="text-[9px] text-white/20 tracking-widest mt-1 font-mono">@{l.id}</p>
                </div>
                <StatusBadge status={l.status} color="blue" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ฝากถอน (ม่วง) */}
      {summary.depositLines.length > 0 && (
        <div className="px-5 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[3px] h-3.5 rounded-full bg-violet-500 shrink-0" />
            <p className="text-[9px] font-bold text-violet-400/80 uppercase tracking-[0.2em]">ฝากถอน</p>
            <span className="ml-auto text-[9px] text-white/20">{summary.depositLines.length} รายการ</span>
          </div>
          <div className="space-y-1.5 pl-5 border-l border-violet-500/20">
            {summary.depositLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-violet-500/5 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white leading-none truncate">{l.name}</p>
                  <p className="text-[9px] text-white/20 tracking-widest mt-1 font-mono">@{l.id}</p>
                </div>
                <StatusBadge status={l.status} color="violet" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* รอกำหนดหน้าที่ (ส้ม) */}
      {summary.unassignedLines.length > 0 && (
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[3px] h-3.5 rounded-full bg-orange-500 shrink-0" />
            <p className="text-[9px] font-bold text-orange-400/80 uppercase tracking-[0.2em]">รอกำหนดหน้าที่</p>
          </div>
          <div className="space-y-1.5 pl-5 border-l border-orange-500/20">
            {summary.unassignedLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-orange-500/4 border border-dashed border-orange-500/15 rounded-lg px-3 py-2.5 group/row">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/70 leading-none truncate">{l.name}</p>
                  <p className="text-[9px] text-white/15 tracking-widest mt-1 font-mono">@{l.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAssignRole(l.id, "main")}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                  >
                    หลัก
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssignRole(l.id, "deposit")}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#2a1a08] text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/40"
                  >
                    ฝากถอน
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
