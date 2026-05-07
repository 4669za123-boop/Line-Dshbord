import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

const ITEM_H = 44

function pad(n: number) {
  return String(n).padStart(2, "0")
}

interface ColumnProps {
  values: string[]
  selected: string
  onChange: (v: string) => void
}

function PickerColumn({ values, selected, onChange }: ColumnProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const currentIdx = values.indexOf(selected) < 0 ? 0 : values.indexOf(selected)

  const scrollTo = useCallback(
    (idx: number) => {
      const el = listRef.current
      if (!el) return
      const clamped = Math.max(0, Math.min(idx, values.length - 1))
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" })
    },
    [values.length],
  )

  useEffect(() => {
    scrollTo(currentIdx)
  }, [currentIdx, scrollTo])

  const step = (delta: number) => {
    const next = (currentIdx + delta + values.length) % values.length
    onChange(values[next])
    scrollTo(next)
  }

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(idx, values.length - 1))
    if (values[clamped] !== selected) onChange(values[clamped])
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    step(e.deltaY > 0 ? 1 : -1)
  }

  const dragStartY = useRef<number | null>(null)
  const dragStartIdx = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY
    dragStartIdx.current = currentIdx
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartY.current === null) return
    const diff = dragStartY.current - e.clientY
    const delta = Math.round(diff / ITEM_H)
    const next = Math.max(0, Math.min(dragStartIdx.current + delta, values.length - 1))
    if (values[next] !== selected) onChange(values[next])
  }

  const handleMouseUp = () => {
    dragStartY.current = null
  }

  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLongPress = (delta: number) => {
    step(delta)
    longPressRef.current = setInterval(() => step(delta), 120)
  }

  const stopLongPress = () => {
    if (longPressRef.current) {
      clearInterval(longPressRef.current)
      longPressRef.current = null
    }
  }

  return (
    <div className="flex flex-col items-center flex-1 select-none">
      <button
        type="button"
        onMouseDown={() => startLongPress(-1)}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress(-1)}
        onTouchEnd={stopLongPress}
        className="w-full flex justify-center py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <div
        ref={listRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[132px] overflow-y-auto cursor-grab active:cursor-grabbing"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <style>{`.picker-scroll::-webkit-scrollbar { display: none; }`}</style>

        <div style={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}>
          {values.map((v) => (
            <div
              key={v}
              onClick={() => {
                onChange(v)
                scrollTo(values.indexOf(v))
              }}
              style={{ scrollSnapAlign: "center", height: ITEM_H }}
              className={`flex items-center justify-center font-mono tabular-nums text-lg cursor-pointer transition-all duration-150 ${
                v === selected
                  ? "text-primary font-bold scale-110"
                  : "text-muted-foreground hover:text-foreground scale-100"
              }`}
            >
              {v}
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute left-0 right-0"
          style={{ top: ITEM_H, height: ITEM_H }}
        >
          <div className="h-full rounded-lg bg-primary/15 border border-primary/40" />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: ITEM_H, background: "linear-gradient(to bottom, hsl(var(--card)) 60%, transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: ITEM_H, background: "linear-gradient(to top, hsl(var(--card)) 60%, transparent)" }}
        />
      </div>

      <button
        type="button"
        onMouseDown={() => startLongPress(1)}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress(1)}
        onTouchEnd={stopLongPress}
        className="w-full flex justify-center py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
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
  const parts = value.split(":")
  const [hour, setHour] = useState(parts[0] ?? "09")
  const [minute, setMinute] = useState(parts[1] ?? "00")

  useEffect(() => {
    const [h, m] = value.split(":")
    setHour(h ?? "09")
    setMinute(m ?? "00")
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
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 w-full">
      <PickerColumn values={HOURS} selected={hour} onChange={handleHour} />
      <div className="text-xl font-bold text-primary select-none pb-1">:</div>
      <PickerColumn values={MINUTES} selected={minute} onChange={handleMinute} />
    </div>
  )
}
