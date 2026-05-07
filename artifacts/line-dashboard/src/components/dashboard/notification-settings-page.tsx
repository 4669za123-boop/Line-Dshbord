
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
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

  const bangkokNow = useBangkokDateTimeLabel()

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((data: { times: string[] }) => setTimes(data.times))
      .catch(() => setTimes(["09:00", "14:00", "20:00"]))
      .finally(() => setLoading(false))
  }, [])

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  const addTime = () => {
    if (times.length < 10) {
      setTimes([...times, "12:00"])
    }
  }

  const removeTime = async (index: number) => {
    if (times.length <= 1) return
    const target = times[index]
    const updated = times.filter((_, i) => i !== index)
    setTimes(updated)
    try {
      await fetch(`/api/schedules/${encodeURIComponent(target)}`, { method: "DELETE" })
    } catch {
      // silent — state already updated optimistically
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ times }),
      })
      const data: { times: string[] } = await res.json()
      setTimes(data.times)
      setSavedFlash(true)
    } catch {
      setSavedFlash(true)
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
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      disabled={times.length >= 10}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      เพิ่มเวลา
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {times.map((time, index) => (
                      <div
                        key={`${index}`}
                        className="rounded-xl border border-border bg-card p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            รอบที่ {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTime(index)}
                            disabled={times.length <= 1}
                            className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            <span className="text-sm">ลบ</span>
                          </Button>
                        </div>
                        <ScrollTimePicker
                          value={time}
                          onChange={(v) => handleTimeChange(index, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    บันทึก
                  </Button>
                  {savedFlash && (
                    <p className="text-center text-xs text-primary" role="status">
                      ✅ บันทึกแล้ว (เซิร์ฟเวอร์ · เวลาไทย)
                    </p>
                  )}
                </div>
              </form>
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
