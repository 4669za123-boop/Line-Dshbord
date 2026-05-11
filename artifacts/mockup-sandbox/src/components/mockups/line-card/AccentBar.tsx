export function AccentBar() {
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
    <div className="min-h-screen bg-[#0d0d0f] flex items-start justify-center p-8">
      <div className="w-[380px]">
        <div className="rounded-2xl bg-[#141417] border border-white/6 overflow-hidden shadow-2xl">

          {/* top accent stripe */}
          <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

          {/* header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <span className="text-emerald-400 text-xs font-bold">J</span>
              </div>
              <div>
                <p className="text-[15px] font-bold text-white leading-none">{mockData.websiteName}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{mockData.websiteUrl}</p>
              </div>
            </div>
            <button className="text-[11px] text-white/20 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">ลบ</button>
          </div>

          {/* ไลน์หลัก */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-3.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.18em]">ไลน์หลัก</p>
            </div>
            {mockData.mainLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 pl-5 border-l border-emerald-500/20">
                <div>
                  <p className="text-[14px] font-semibold text-white">{l.name}</p>
                  <p className="text-[10px] text-white/20 tracking-widest mt-0.5">@{l.id}</p>
                </div>
                <PillBadge status={l.status} color="green" />
              </div>
            ))}
          </div>

          <div className="mx-5 border-t border-white/5" />

          {/* ฝากถอน */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-3.5 rounded-full bg-amber-500" />
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.18em]">ฝากถอน</p>
            </div>
            {mockData.depositLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 pl-5 border-l border-amber-500/20">
                <div>
                  <p className="text-[14px] font-semibold text-white">{l.name}</p>
                  <p className="text-[10px] text-white/20 tracking-widest mt-0.5">@{l.id}</p>
                </div>
                <PillBadge status={l.status} color="amber" />
              </div>
            ))}
          </div>

          <div className="mx-5 border-t border-white/5" />

          {/* รอกำหนดหน้าที่ */}
          <div className="px-5 pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-3.5 rounded-full bg-white/20" />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">รอกำหนดหน้าที่</p>
            </div>
            {mockData.unassignedLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 pl-5 border-l border-white/8">
                <div>
                  <p className="text-[14px] font-semibold text-white/70">{l.name}</p>
                  <p className="text-[10px] text-white/15 tracking-widest mt-0.5">@{l.id}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">หลัก</button>
                  <button className="px-2 py-1 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/20">ฝากถอน</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

function PillBadge({ status, color }: { status: string; color: "green" | "amber" }) {
  if (status === "normal") {
    const cls = color === "green"
      ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
      : "bg-amber-500/12 text-amber-400 border-amber-500/25"
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        ออนไลน์
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/4 text-white/25 border border-white/8">
      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      ออฟไลน์
    </span>
  )
}
