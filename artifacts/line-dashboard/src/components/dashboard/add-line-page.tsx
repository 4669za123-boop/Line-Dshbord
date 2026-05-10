
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Wifi, WifiOff, Globe } from "lucide-react"
import type { AddLineFormPayload, Website, LineAccount } from "./types"

export type AddLinePageProps = {
  websites: Website[]
  accounts: LineAccount[]
  onAddLine: (payload: AddLineFormPayload) => void
  onNavigateDashboard: () => void
}

export function AddLinePage({
  websites,
  accounts,
  onAddLine,
  onNavigateDashboard,
}: AddLinePageProps) {
  const [lineId, setLineId] = useState("")
  const [targetWebsite, setTargetWebsite] = useState("")
  const [type, setType] = useState<"" | "main" | "deposit">("")

  useEffect(() => {
    if (targetWebsite && !websites.some((w) => w.id === targetWebsite)) {
      setTargetWebsite("")
    }
  }, [websites, targetWebsite])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const identifier = lineId.trim()
    const site = websites.find((w) => w.id === targetWebsite)
    if (!identifier || !site || type === "") return

    onAddLine({
      lineIdentifier: identifier,
      websiteId: site.id,
      websiteName: site.name,
      role: type,
    })
    setLineId("")
    setTargetWebsite("")
    setType("")
    onNavigateDashboard()
  }

  const online = accounts.filter((a) => a.status === "normal").length
  const suspended = accounts.filter((a) => a.status === "suspended").length
  const totalWebsites = websites.length

  const stats = [
    { label: "ออนไลน์", value: online, icon: Wifi, green: true },
    { label: "โดนระงับ", value: suspended, icon: WifiOff, green: false },
    { label: "เว็บไซต์", value: totalWebsites, icon: Globe, green: false },
  ]

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            เพิ่ม LINE
          </h1>
          <p className="text-muted-foreground mt-1">
            เพิ่มบัญชี LINE ใหม่เข้าสู่ระบบ
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)] group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
                <p className={`text-3xl font-bold ${s.green ? "text-primary" : "text-foreground"}`}>
                  {s.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Form */}
        <div className="flex justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,185,0,0.1)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  LINE ID หรือ URL
                </label>
                <Input
                  type="text"
                  placeholder="กรอก LINE ID หรือ URL"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  เว็บไซต์
                </label>
                <Select
                  value={targetWebsite}
                  onValueChange={setTargetWebsite}
                  disabled={websites.length === 0}
                >
                  <SelectTrigger className="bg-input border-border text-foreground disabled:opacity-60">
                    <SelectValue placeholder="เลือกเว็บไซต์" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {websites.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    ยังไม่มีเว็บไซต์—เพิ่มจากหน้าแดชบอร์ด ปุ่ม "เพิ่มเว็บไซต์" มุมบนขวา
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  ประเภท
                </label>
                <Select
                  value={type === "" ? undefined : type}
                  onValueChange={(v) => setType(v as "main" | "deposit")}
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="main">ไลน์หลัก</SelectItem>
                    <SelectItem value="deposit">ไลน์ฝากถอน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={!lineId.trim() || !targetWebsite || type === ""}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                เพิ่ม
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
