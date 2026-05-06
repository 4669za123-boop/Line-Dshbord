/**
 * ตารางเวลาแจ้งเตือน — อิงเวลาประเทศไทย (Asia/Bangkok, UTC+7)
 * ใช้ร่วมกับงานส่ง Discord หลังดึงข้อมูล Selenium: ให้เทียบ "ชั่วโมง:นาที" ในโซนนี้
 */
export const NOTIFICATION_TIMEZONE = "Asia/Bangkok" as const
export const NOTIFICATION_STORAGE_KEY = "line-notification-schedule-v1"

export type NotificationScheduleV1 = {
  timezone: typeof NOTIFICATION_TIMEZONE
  /** ค่า HH:mm (24 ชม.) เป็นวงเล็บเวลาไทยเสมอ ไม่อิงนาฬิกาเครื่อง */
  times: string[]
}

const DEFAULT_TIMES = ["09:00", "14:00", "20:00"]

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimeHHMM(value: string): boolean {
  return HH_MM.test(value.trim())
}

export function sortTimesHHMM(times: string[]): string[] {
  return [...times].filter(isValidTimeHHMM).sort((a, b) => a.localeCompare(b))
}

function sanitizeTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_TIMES]
  const out = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(isValidTimeHHMM)
  return out.length > 0 ? sortTimesHHMM(out) : [...DEFAULT_TIMES]
}

export function getDefaultSchedule(): NotificationScheduleV1 {
  return {
    timezone: NOTIFICATION_TIMEZONE,
    times: [...DEFAULT_TIMES],
  }
}

export function loadNotificationSchedule(): NotificationScheduleV1 {
  if (typeof window === "undefined") return getDefaultSchedule()
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (!raw) return getDefaultSchedule()
    const data = JSON.parse(raw) as unknown
    if (data === null || typeof data !== "object") return getDefaultSchedule()
    const o = data as Record<string, unknown>
    const times = sanitizeTimes(o.times)
    return {
      timezone: NOTIFICATION_TIMEZONE,
      times,
    }
  } catch {
    return getDefaultSchedule()
  }
}

export function saveNotificationSchedule(schedule: NotificationScheduleV1): void {
  if (typeof window === "undefined") return
  const payload: NotificationScheduleV1 = {
    timezone: NOTIFICATION_TIMEZONE,
    times: sortTimesHHMM(schedule.times),
  }
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(payload))
}

/** สำหรับสคริปต์รอบนอก (Node): อ่านไฟล์ config หรือพิมพ์ค่าเดียวกับที่เก็บใน key นี้ */
export function scheduleToCronHint(schedule: NotificationScheduleV1): string {
  const sorted = sortTimesHHMM(schedule.times)
  return `Timezone ${schedule.timezone}; รันรอบต่อวันที่: ${sorted.join(", ")} (เวลาไทย)`
}
