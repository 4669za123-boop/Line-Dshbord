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
  const containerRef = useRef<HTMLDivElement>(null)

  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)

  const animateTo = (delta: number) => {
    setAnimating(false)
    setOffset(delta * ITEM_H)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true)
        setOffset(0)
      })
    })
  }

  const go = (delta: number) => {
    const next = ((current + delta) % values.length + values.length) % values.length
    animateTo(delta)
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
  const dragLastIdx = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY
    dragLastIdx.current = current
    e.preventDefault()
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragStartY.current === null) return
    const diff = dragStartY.current - e.clientY
    const delta = Math.round(diff / ITEM_H)
    const next = ((dragLastIdx.current + delta) % values.length + values.length) % values.length
    if (values[next] !== selected) {
      const dir = diff > 0 ? 1 : -1
      animateTo(dir)
      onChange(values[next])
    }
  }
  const onMouseUp = () => { dragStartY.current = null }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      go(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  })

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
        ref={containerRef}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: VISIBLE * ITEM_H }}
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

        <div
          style={{
            transform: `translateY(${offset}px)`,
            transition: animating ? `transform 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : "none",
          }}
        >
          {visible.map((v, i) => (
            <div
              key={i}
              onClick={() => {
                const delta = i - MID
                if (delta !== 0) { animateTo(delta); onChange(v) }
              }}
              style={{ height: ITEM_H }}
              className={`flex items-center justify-center font-mono tabular-nums select-none ${
                i === MID
                  ? "text-primary font-bold text-lg cursor-default"
                  : Math.abs(i - MID) === 1
                  ? "text-foreground/60 text-base cursor-pointer hover:text-foreground/80"
                  : "text-muted-foreground/35 text-sm cursor-pointer hover:text-muted-foreground/60"
              }`}
            >
              {v}
            </div>
          ))}
        </div>
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

  const handleHour = (h: string) => { setHour(h); onChange(`${h}:${minute}`) }
  const handleMinute = (m: string) => { setMinute(m); onChange(`${hour}:${m}`) }

  return (
    <div className="flex items-stretch gap-2 bg-card border border-border rounded-xl px-3 py-1 w-full">
      <PickerColumn values={HOURS} selected={hour} onChange={handleHour} />
      <div className="flex items-center text-xl font-bold text-primary select-none pb-1">:</div>
      <PickerColumn values={MINUTES} selected={minute} onChange={handleMinute} />
    </div>
  )
}
