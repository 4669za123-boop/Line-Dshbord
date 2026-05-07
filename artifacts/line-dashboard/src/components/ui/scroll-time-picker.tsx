import { useEffect, useRef, useState } from "react"

const ITEM_H = 40

function pad(n: number) {
  return String(n).padStart(2, "0")
}

interface ColumnProps {
  values: string[]
  selected: string
  onChange: (v: string) => void
}

function PickerColumn({ values, selected, onChange }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)

  const indexOf = (v: string) => {
    const i = values.indexOf(v)
    return i < 0 ? 0 : i
  }

  useEffect(() => {
    const el = ref.current
    if (!el || isScrolling.current) return
    el.scrollTop = indexOf(selected) * ITEM_H
  }, [selected, values])

  const handleScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(idx, values.length - 1))
    if (values[clamped] !== selected) {
      onChange(values[clamped])
    }
  }

  return (
    <div className="relative flex-1 flex flex-col items-center">
      <div
        ref={ref}
        onScroll={handleScroll}
        onMouseDown={() => { isScrolling.current = true }}
        onMouseUp={() => { isScrolling.current = false }}
        onTouchStart={() => { isScrolling.current = true }}
        onTouchEnd={() => { isScrolling.current = false }}
        className="h-[200px] overflow-y-auto scroll-smooth scrollbar-none"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <div style={{ paddingTop: 80, paddingBottom: 80 }}>
          {values.map((v) => (
            <div
              key={v}
              onClick={() => {
                onChange(v)
                const el = ref.current
                if (el) el.scrollTop = indexOf(v) * ITEM_H
              }}
              style={{ scrollSnapAlign: "center", height: ITEM_H }}
              className={`flex items-center justify-center text-base font-mono tabular-nums cursor-pointer select-none transition-colors ${
                v === selected
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: 80, height: ITEM_H }}
      >
        <div className="h-full rounded-lg bg-primary/15 border border-primary/40" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: 80 }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--card)) 0%, transparent 100%)",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: 80 }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--card)) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))

interface ScrollTimePickerProps {
  value: string
  onChange: (v: string) => void
}

export function ScrollTimePicker({ value, onChange }: ScrollTimePickerProps) {
  const [hh, mm] = value.split(":").length === 2 ? value.split(":") : ["09", "00"]

  const [hour, setHour] = useState(hh)
  const [minute, setMinute] = useState(mm)

  useEffect(() => {
    const [h, m] = value.split(":")
    setHour(h)
    setMinute(m)
  }, [value])

  const handleHour = (h: string) => {
    setHour(h)
    onChange(`${h}:${minute}`)
  }

  const handleMinute = (m: string) => {
    setMinute(m)
    onChange(`${hour}:${m}`)
  }

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 py-1 w-full">
      <PickerColumn values={HOURS} selected={hour} onChange={handleHour} />
      <div className="text-lg font-bold text-primary select-none px-1">:</div>
      <PickerColumn values={MINUTES} selected={minute} onChange={handleMinute} />
    </div>
  )
}
