export function CompactBadge() {
  const mockData = {
    websiteName: "JUN88",
    websiteUrl: "https://jun88.com",
    mainLines: [
      { id: "jun88main", name: "JUN88 ⚡️J Main", status: "normal" },
    ],
    depositLines: [
      { id: "jun88dep", name: "Jun88 F💤", status: "inactive" },
    ],
    unassignedLines: [
      { id: "jun88new", name: "JUN88 New OA", status: "normal" },
    ],
  }

  return (
    <div className="min-h-screen bg-[#101013] flex items-start justify-center p-8">
      <div className="w-[380px]">
        <div className="rounded-xl bg-[#16161a] border border-white/7 shadow-xl">

          {/* header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[15px] font-bold text-white">{mockData.websiteName}</span>
              <span className="text-[10px] text-white/20 font-mono hidden sm:block">{mockData.websiteUrl}</span>
            </div>
            <button className="text-[10px] text-white/15 hover:text-red-400 transition-colors">✕</button>
          </div>

          {/* ไลน์หลัก */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-[0.2em]">ไลน์หลัก</span>
              <span className="text-[9px] text-white/20">{mockData.mainLines.length} รายการ</span>
            </div>
            <div className="space-y-2">
              {mockData.mainLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-none truncate">{l.name}</p>
                    <p className="text-[9px] text-white/20 tracking-widest mt-1 font-mono">@{l.id}</p>
                  </div>
                  <SquareBadge status={l.status} color="green" />
                </div>
              ))}
            </div>
          </div>

          {/* ฝากถอน */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-amber-400/60 uppercase tracking-[0.2em]">ฝากถอน</span>
              <span className="text-[9px] text-white/20">{mockData.depositLines.length} รายการ</span>
            </div>
            <div className="space-y-2">
              {mockData.depositLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-none truncate">{l.name}</p>
                    <p className="text-[9px] text-white/20 tracking-widest mt-1 font-mono">@{l.id}</p>
                  </div>
                  <SquareBadge status={l.status} color="amber" />
                </div>
              ))}
            </div>
          </div>

          {/* รอกำหนดหน้าที่ */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-white/25 uppercase tracking-[0.2em]">รอกำหนดหน้าที่</span>
            </div>
            <div className="space-y-2">
              {mockData.unassignedLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-white/2 border border-dashed border-white/8 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/60 leading-none truncate">{l.name}</p>
                    <p className="text-[9px] text-white/15 tracking-widest mt-1 font-mono">@{l.id}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">หลัก</button>
                    <button className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">ฝากถอน</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function SquareBadge({ status, color }: { status: string; color: "green" | "amber" }) {
  if (status === "normal") {
    if (color === "green") {
      return (
        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          ● ออนไลน์
        </span>
      )
    }
    return (
      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
        ● ออนไลน์
      </span>
    )
  }
  return (
    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/25 border border-white/10">
      ○ ออฟไลน์
    </span>
  )
}
