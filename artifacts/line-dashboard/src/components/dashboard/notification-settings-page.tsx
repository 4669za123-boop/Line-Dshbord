
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Pencil, Check, X } from "lucide-react"
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
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            ตั้งค่าแจ้งเตือน
          </h1>
          <p className="text-muted-foreground mt-1">
            กำหนดรอบเวลาส่งข้อมูล (เวลาไทย) — ใช้จับกับงานดึง Selenium แล้วส่ง Discord
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="rounded-xl border border-primary/20 bg-card/80 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">เวลาอ้างอิง (ประเทศไทย)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                โซนเวลา <span className="font-mono text-foreground">{NOTIFICATION_TIMEZONE}</span>{" "}
                (UTC+7) — ค่าที่เลือกในรายการด้านล่างคือเวลาไทยโดยตรง ไม่ตามนาฬิกาของเบราว์เซอร์
              </p>
              <p className="mt-2 font-mono text-sm tabular-nums text-primary">
                {bangkokNow || "—"}
              </p>
            </div>

            {loading ? (
              <p className="text-center text-sm text-muted-foreground">กำลังโหลด...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    เวลาแจ้งเตือน (เวลาไทย)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addTime}
                    disabled={times.length >= 10 || editingIndex !== null}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    เพิ่มเวลา
                  </Button>
                </div>

                <div className="space-y-3">
                  {times.map((time, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {editingIndex === index ? (
                        <div className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
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
                                className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Check className="h-4 w-4 mr-1" />
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
                        <div className="flex items-center gap-3 p-3">
                          <span className="text-sm text-muted-foreground shrink-0 w-16">
                            รอบที่ {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(index)}
                            className="flex flex-1 items-center gap-2 font-mono tabular-nums text-foreground text-base hover:text-primary transition-colors text-left"
                          >
                            <span>{time}</span>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTime(index)}
                            disabled={times.length <= 1}
                            className="h-8 w-8 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {savedFlash && (
                  <p className="text-center text-xs text-primary" role="status">
                    ✅ บันทึกแล้ว (เซิร์ฟเวอร์ · เวลาไทย)
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              ข้อมูลเก็บที่เซิร์ฟเวอร์{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                data/schedules.json
              </code>
              <br />
              ฝั่งสคริปต์ (เช่น Node รัน Discord) ให้สร้าง cron / scheduler เปรียบเทียบเวลาปัจจุบันใน{" "}
              <code className="font-mono">Asia/Bangkok</code> กับรายการ{" "}
              <code className="font-mono">HH:mm</code> เหล่านี้
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
