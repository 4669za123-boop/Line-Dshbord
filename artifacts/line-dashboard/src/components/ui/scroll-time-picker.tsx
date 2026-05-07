import { useEffect, useRef, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))

const VISIBLE = 5
const MID = Math.floor(VISIBLE / 2)
const ITEM_H = 40

interface ColumnProps {
  values: string[]
  selected: string
  onChange: (v: string) => void
}

function PickerColumn({ values, selected, onChange }: ColumnProps) {
  const idx = values.indexOf(selected)
  const current = idx < 0 ? 0 : idx

  const go = (delta: number) => {
    const next = (current + delta + values.length) % values.length
    onChange(values[next])
  }

  const longRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRepeat = (delta: number) => {
    go(delta)
    longRef.current = setInterval(() => go(delta), 130)
  }
  const stopRepeat = () => {
    if (longRef.current) { clearInterval(longRef.current); longRef.current = null }
  }

  const dragStartY = useRef<number | null>(null)
  const dragStartIdx = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY
    dragStartIdx.current = current
    e.preventDefault()
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragStartY.current === null) return
    const diff = dragStartY.current - e.clientY
    const delta = Math.round(diff / ITEM_H)
    const next = ((dragStartIdx.current + delta) % values.length + values.length) % values.length
    if (values[next] !== selected) onChange(values[next])
  }
  const onMouseUp = () => { dragStartY.current = null }

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    go(e.deltaY > 0 ? 1 : -1)
  }

  const visible = Array.from({ length: VISIBLE }, (_, i) => {
    const vi = ((current - MID + i) % values.length + values.length) % values.length
    return values[vi]
  })

  return (
    <div className="flex flex-col items-center flex-1 gap-0">
      <button
        type="button"
        onMouseDown={() => startRepeat(-1)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        onTouchStart={() => startRepeat(-1)}
        onTouchEnd={stopRepeat}
        className="w-full flex justify-center py-2 rounded-t-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <div
        className="relative w-full cursor-grab active:cursor-grabbing"
        style={{ height: VISIBLE * ITEM_H }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="pointer-events-none absolute left-1 right-1 rounded-lg bg-primary/15 border border-primary/40 z-10"
          style={{ top: MID * ITEM_H, height: ITEM_H }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20"
          style={{ height: MID * ITEM_H, background: "linear-gradient(to bottom, hsl(var(--card)) 30%, transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
          style={{ height: MID * ITEM_H, background: "linear-gradient(to top, hsl(var(--card)) 30%, transparent)" }}
        />

        {visible.map((v, i) => (
          <div
            key={i}
            onClick={() => onChange(v)}
            style={{ height: ITEM_H, top: i * ITEM_H }}
            className={`absolute inset-x-0 flex items-center justify-center font-mono tabular-nums transition-all duration-150 select-none ${
              i === MID
                ? "text-primary font-bold text-lg"
                : Math.abs(i - MID) === 1
                ? "text-foreground/60 text-base"
                : "text-muted-foreground/40 text-sm"
            }`}
          >
            {v}
          </div>
        ))}
      </div>

      <button
        type="button"
        onMouseDown={() => startRepeat(1)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        onTouchStart={() => startRepeat(1)}
        onTouchEnd={stopRepeat}
        className="w-full flex justify-center py-2 rounded-b-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  )
}

interface ScrollTimePickerProps {
  value: string
  onChange: (v: string) => void
}

export function ScrollTimePicker({ value, onChange }: ScrollTimePickerProps) {
  const [hour, setHour] = useState(() => value.split(":")[0] ?? "09")
  const [minute, setMinute] = useState(() => value.split(":")[1] ?? "00")

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
    <div className="flex items-stretch gap-2 bg-card border border-border rounded-xl px-3 py-1 w-full">
      <PickerColumn values={HOURS} selected={hour} onChange={handleHour} />
      <div className="flex items-center text-xl font-bold text-primary select-none pb-1">:</div>
      <PickerColumn values={MINUTES} selected={minute} onChange={handleMinute} />
    </div>
  )
}
