
import { useEffect, useState } from "react"
import { Bell, Plus, Trash2, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NOTIFICATION_TIMEZONE } from "@/lib/notification-schedule"
import { ScrollTimePicker } from "@/components/ui/scroll-time-picker"

function useBangkokDateTimeLabel() {
  const [label, setLabel] = useState("")
  useEffect(() => {
    const update = () => {
      setLabel(
        new Intl.DateTimeFormat("th-TH", {
          timeZone: NOTIFICATION_TIMEZONE,
          dateStyle: "full",
          timeStyle: "medium",
          hour12: false,
        }).format(new Date()),
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return label
}

export function NotificationSettingsPage() {
  const [times, setTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("09:00")

  const bangkokNow = useBangkokDateTimeLabel()

  const sortTimes = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b))

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((data: { times: string[] }) => setTimes(sortTimes(data.times)))
      .catch(() => setTimes(["09:00", "14:00", "20:00"]))
      .finally(() => setLoading(false))
  }, [])

  const saveTimes = async (newTimes: string[]) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ times: newTimes }),
      })
      const data: { times: string[] } = await res.json()
      setTimes(sortTimes(data.times))
    } catch {
      setTimes(sortTimes(newTimes))
    }
  }

  const startEdit = (index: number) => {
    setEditingValue(times[index])
    setEditingIndex(index)
  }

  const confirmEdit = async () => {
    if (editingIndex === null) return
    const newTimes = [...times]
    newTimes[editingIndex] = editingValue
    setEditingIndex(null)
    await saveTimes(newTimes)
    setSavedFlash(true)
  }

  const cancelEdit = () => {
    if (editingIndex !== null && editingIndex >= times.length) {
      setTimes(times.slice(0, -1))
    }
    setEditingIndex(null)
  }

  const addTime = () => {
    if (times.length >= 10 || editingIndex !== null) return
    const newTime = "12:00"
    const newTimes = [...times, newTime]
    setTimes(newTimes)
    setEditingValue(newTime)
    setEditingIndex(newTimes.length - 1)
  }

  const removeTime = async (index: number) => {
    if (times.length <= 1) return
    if (editingIndex !== null) return
    const target = times[index]
    const updated = times.filter((_, i) => i !== index)
    setTimes(updated)
    try {
      await fetch(`/api/schedules/${encodeURIComponent(target)}`, { method: "DELETE" })
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!savedFlash) return
    const id = window.setTimeout(() => setSavedFlash(false), 2000)
    return () => clearTimeout(id)
  }, [savedFlash])

  return (
    <main className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <Bell className="h-5 w-5 text-primary" />
            </span>
            ตั้งค่าแจ้งเตือน
          </h1>
          <p className="text-muted-foreground mt-1 ml-1">
            กำหนดรอบเวลาส่งข้อมูลเข้า Discord
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md space-y-4">

            {/* Clock card */}
            <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
              <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-background px-5 py-4">
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/15 blur-3xl" />
                <div className="relative space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    เวลาอ้างอิง (ประเทศไทย){" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      โซนเวลา{" "}
                      <span className="font-mono text-foreground/80">{NOTIFICATION_TIMEZONE}</span>{" "}
                      (UTC+7)
                    </span>
                  </p>
                  <p className="font-mono tabular-nums text-primary text-sm">
                    {bangkokNow || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Times card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">เวลาแจ้งเตือน (เวลาไทย)</p>
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {times.length}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addTime}
                  disabled={times.length >= 10 || editingIndex !== null}
                  className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  เพิ่มเวลา
                </Button>
              </div>

              {/* Time rows */}
              <div className="p-3 space-y-2">
                {loading ? (
                  <p className="text-center text-sm text-muted-foreground py-6">กำลังโหลด...</p>
                ) : (
                  times.map((time, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-background overflow-hidden"
                    >
                      {editingIndex === index ? (
                        <div className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-medium">
                              รอบที่ {index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={confirmEdit}
                                className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                บันทึก
                              </Button>
                            </div>
                          </div>
                          <ScrollTimePicker
                            value={editingValue}
                            onChange={setEditingValue}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xs text-muted-foreground shrink-0 w-12">
                            รอบที่ {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(index)}
                            className="flex flex-1 items-center gap-2 font-mono tabular-nums text-foreground text-base hover:text-primary transition-colors text-left"
                          >
                            <span>{time}</span>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTime(index)}
                            disabled={times.length <= 1}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-destructive/60 hover:text-red-500 hover:bg-zinc-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {savedFlash && (
                  <p className="text-center text-xs text-primary py-1" role="status">
                    ✅ บันทึกแล้ว (เซิร์ฟเวอร์ · เวลาไทย)
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
