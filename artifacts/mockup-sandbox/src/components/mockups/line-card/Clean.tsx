export function Clean() {
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
    <div className="min-h-screen bg-[#0f0f11] flex items-start justify-center p-8">
      <div className="w-[380px]">
        <div className="rounded-2xl bg-[#18181b] border border-white/8 px-5 pt-5 pb-6 shadow-xl">

          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <a href={mockData.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="text-[17px] font-bold text-white hover:text-emerald-400 transition-colors leading-none">
                {mockData.websiteName}
              </a>
              <p className="text-[11px] text-white/25 mt-1">{mockData.websiteUrl}</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              ลบ
            </button>
          </div>

          {/* ไลน์หลัก */}
          <div className="border-t border-white/6 pt-4 mb-1">
            <p className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-[0.18em] mb-3">ไลน์หลัก</p>
            {mockData.mainLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[14px] font-semibold text-white leading-snug">{l.name}</p>
                  <p className="text-[10px] text-white/25 tracking-widest mt-1">@{l.id}</p>
                </div>
                <OnlineBadge status={l.status} />
              </div>
            ))}
          </div>

          {/* ไลน์ฝากถอน */}
          <div className="border-t border-white/6 pt-4 mt-2 mb-1">
            <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-[0.18em] mb-3">ฝากถอน</p>
            {mockData.depositLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[14px] font-semibold text-white leading-snug">{l.name}</p>
                  <p className="text-[10px] text-white/25 tracking-widest mt-1">@{l.id}</p>
                </div>
                <OnlineBadge status={l.status} />
              </div>
            ))}
          </div>

          {/* รอกำหนดหน้าที่ */}
          <div className="border-t border-white/6 pt-4 mt-2">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.18em] mb-3">รอกำหนดหน้าที่</p>
            {mockData.unassignedLines.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[14px] font-semibold text-white/80 leading-snug">{l.name}</p>
                  <p className="text-[10px] text-white/20 tracking-widest mt-1">@{l.id}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">หลัก</button>
                  <button className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">ฝากถอน</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

function OnlineBadge({ status }: { status: string }) {
  if (status === "normal") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        ออนไลน์
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-white/30">
      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      ออฟไลน์
    </span>
  )
}
