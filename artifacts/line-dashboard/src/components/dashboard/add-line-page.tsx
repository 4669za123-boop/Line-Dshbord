
import { useEffect, useState } from "react"
import { Link2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AddLineFormPayload, Website } from "./types"

export type AddLinePageProps = {
  websites: Website[]
  accounts?: unknown[]
  onAddLine: (payload: AddLineFormPayload) => void
  onNavigateDashboard: () => void
}

export function AddLinePage({
  websites,
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

  const canSubmit = lineId.trim() && targetWebsite && type !== ""

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <Link2 className="h-5 w-5 text-primary" />
            </span>
            เพิ่ม LINE
          </h1>
          <p className="text-muted-foreground mt-1 ml-1">
            เพิ่มบัญชี LINE ใหม่เข้าสู่ระบบ
          </p>
        </div>

        {/* Form card */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Card header accent */}
              <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background px-6 pt-6 pb-4 border-b border-border">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/25">
                    <Link2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">ข้อมูล LINE</p>
                    <p className="text-xs text-muted-foreground mt-0.5">กรอกรายละเอียดให้ครบก่อนกดเพิ่ม</p>
                  </div>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    LINE ID หรือ URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    autoFocus
                    type="text"
                    placeholder="กรอก LINE ID หรือ URL"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    เว็บไซต์ <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={targetWebsite}
                    onValueChange={setTargetWebsite}
                    disabled={websites.length === 0}
                  >
                    <SelectTrigger className="h-11 bg-input border-border text-foreground disabled:opacity-60">
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
                      ยังไม่มีเว็บไซต์ — เพิ่มจากหน้าแดชบอร์ดก่อน
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    ประเภท <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={type === "" ? undefined : type}
                    onValueChange={(v) => setType(v as "main" | "deposit")}
                  >
                    <SelectTrigger className="h-11 bg-input border-border text-foreground">
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="main">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          ไลน์หลัก
                        </span>
                      </SelectItem>
                      <SelectItem value="deposit">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-400" />
                          ไลน์ฝากถอน
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-1 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={onNavigateDashboard}
                  >
                    ยกเลิก
                  </Button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="group relative flex-1 overflow-hidden rounded-xl p-[1px] transition-transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400/80 to-primary opacity-80 transition-opacity group-hover:opacity-100" aria-hidden />
                    <span className="relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-background/95 text-sm font-semibold text-foreground shadow-[0_0_20px_-4px_rgba(0,185,0,0.35)] backdrop-blur-sm transition-colors group-hover:bg-background/90">
                      <Sparkles className="h-4 w-4 text-primary" />
                      เพิ่ม LINE
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
