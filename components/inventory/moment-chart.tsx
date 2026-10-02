'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type StripRow = { key: string; label: string; min: number; max: number; scale: string; summary?: string; format: (value: number) => string }
export type StripPoint = { id: string; x: number; title: string; subtitle?: string; values: Record<string, number | null> }

const PLOT_HEIGHT = 34
const PAD_X = 8
const PAD_Y = 6

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Small multiples: one strip per measure on a shared time axis. Each strip has its own scale, so mood
 * (1–5) and needs (0–10) are never forced onto one axis, and the row label carries identity instead
 * of colour. A crosshair snaps to the nearest check-in and reads out every measure at that time.
 */
export function StripChart({ rows, points, ticks, label, connectGaps }: {
  rows: StripRow[]; points: StripPoint[]; ticks: { x: number; label: string }[]; label: string; connectGaps: boolean
}) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const plotWidth = Math.max(0, width - PAD_X * 2)
  const px = (x: number) => PAD_X + x * plotWidth
  const sorted = [...points].sort((a, b) => a.x - b.x)
  const current = active === null ? null : sorted[active]
  const nearest = (clientX: number, element: HTMLElement) => {
    const x = (clientX - element.getBoundingClientRect().left - PAD_X) / Math.max(1, plotWidth)
    let best = -1, distance = Infinity
    sorted.forEach((point, index) => { const gap = Math.abs(point.x - x); if (gap < distance) { best = index; distance = gap } })
    return best >= 0 ? best : null
  }
  const onPointer = (event: PointerEvent<HTMLDivElement>) => setActive(nearest(event.clientX, event.currentTarget))
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!sorted.length) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      setActive(index => index === null ? (step > 0 ? 0 : sorted.length - 1) : Math.min(sorted.length - 1, Math.max(0, index + step)))
    }
    if (event.key === 'Escape') setActive(null)
  }
  const tooltipLeft = current ? Math.min(Math.max(px(current.x) - 96, 0), Math.max(0, width - 192)) : 0
  return <div className="relative">
    <div ref={ref} role="group" tabIndex={0} aria-label={`${label}. Use the left and right arrow keys to read each point.`}
      className="relative touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerMove={onPointer} onPointerDown={onPointer} onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(null) }}
      onKeyDown={onKey} onFocus={() => setActive(index => index ?? (sorted.length ? sorted.length - 1 : null))} onBlur={() => setActive(null)}>
      {width > 0 && <>
        <div className="space-y-3">
          {rows.map(row => {
            const py = (value: number) => PAD_Y + (1 - (value - row.min) / (row.max - row.min)) * (PLOT_HEIGHT - PAD_Y * 2)
            const segments: { x: number; y: number }[][] = []
            let segment: { x: number; y: number }[] = []
            for (const point of sorted) {
              const value = point.values[row.key]
              if (value === null || value === undefined) { if (!connectGaps && segment.length) { segments.push(segment); segment = [] } continue }
              segment.push({ x: px(point.x), y: py(value) })
            }
            if (segment.length) segments.push(segment)
            const base = py(row.min)
            return <div key={row.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{row.label}</span><span className="text-xs text-muted-foreground">{row.summary && <span className="font-semibold text-foreground">{row.summary}</span>}{row.summary && ' · '}{row.scale}</span></div>
              <svg width={width} height={PLOT_HEIGHT} aria-hidden="true" className="block overflow-visible">
                <line x1={PAD_X} x2={width - PAD_X} y1={py(row.max)} y2={py(row.max)} stroke="var(--border)" strokeWidth={1} />
                <line x1={PAD_X} x2={width - PAD_X} y1={base} y2={base} stroke="var(--border)" strokeWidth={1} />
                {segments.map((items, index) => items.length > 1 && <g key={index}>
                  <path d={`M${items.map(p => `${p.x},${p.y}`).join('L')}L${items[items.length - 1].x},${base}L${items[0].x},${base}Z`} fill="var(--viz-line)" fillOpacity={0.1} />
                  <path d={`M${items.map(p => `${p.x},${p.y}`).join('L')}`} fill="none" stroke="var(--viz-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                </g>)}
                {sorted.map((point, index) => {
                  const value = point.values[row.key]
                  if (value === null || value === undefined) return null
                  return <circle key={point.id} cx={px(point.x)} cy={py(value)} r={index === active ? 5.5 : 4} fill="var(--viz-line)" stroke="var(--card)" strokeWidth={2} />
                })}
              </svg>
            </div>
          })}
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground" aria-hidden="true">
          {ticks.map((tick, index) => <span key={`${tick.label}-${index}`} className={cn('absolute top-0 whitespace-nowrap tabular-nums', index === 0 ? '' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: px(tick.x) }}>{tick.label}</span>)}
        </div>
        {current && <div aria-hidden="true" className="pointer-events-none absolute top-5 bottom-6 w-px bg-foreground/40" style={{ left: px(current.x) }} />}
      </>}
    </div>
    {current && <div role="status" className="pointer-events-none absolute -top-2 z-10 w-48 -translate-y-full rounded-xl border bg-popover p-3 text-sm shadow-lg" style={{ left: tooltipLeft }}>
      <p className="font-semibold">{current.title}</p>
      {current.subtitle && <p className="text-xs text-muted-foreground">{current.subtitle}</p>}
      <dl className="mt-2 space-y-1">{rows.map(row => { const value = current.values[row.key]; return <div key={row.key} className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-[var(--viz-line)]" /><dt className="sr-only">{row.label}</dt><dd className="font-semibold tabular-nums">{value === null || value === undefined ? '–' : row.format(value)}</dd><span className="text-xs text-muted-foreground">{row.label}</span></div> })}</dl>
    </div>}
  </div>
}

/** Average of each measure by part of the day. A one-hue ramp: deeper means higher. */
export function DayPartGrid({ columns, rows }: {
  columns: { key: string; label: string }[]
  rows: { key: string; label: string; values: (number | null)[]; max: number; format: (value: number) => string }[]
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[17rem] table-fixed border-separate border-spacing-0.5 text-sm">
    <caption className="sr-only">Average by time of day</caption>
    <thead><tr><th scope="col" className="w-16"><span className="sr-only">Measure</span></th>{columns.map(column => <th key={column.key} scope="col" className="px-0.5 pb-1 text-center text-[11px] font-medium sm:text-xs">{column.label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.key}><th scope="row" className="pr-2 text-left text-xs font-medium">{row.label}</th>{row.values.map((value, index) => {
      const level = value === null ? 0 : 8 + (value / row.max) * 80
      return <td key={columns[index].key} className={cn('viz-cell h-10 rounded-md text-center font-semibold tabular-nums', value === null && 'text-muted-foreground', level > 52 && 'text-primary-foreground')} style={{ ['--level' as string]: `${level}%` }}>{value === null ? '–' : row.format(value)}</td>
    })}</tr>)}</tbody>
  </table></div>
}

/** Horizontal bars for counts, value at the tip. */
export function CountBars({ items, label }: { items: { value: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...items.map(item => item.count))
  return <ul aria-label={label} className="space-y-2.5">{items.map(item => <li key={item.value} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm">
    <span className="truncate">{item.value}</span>
    <span className="flex items-center gap-2"><span className="h-3.5 rounded-r-[4px] bg-[var(--viz-line)]" style={{ width: `${Math.max(4, item.count / max * 85)}%` }} /><span className="text-xs font-semibold tabular-nums">{item.count}</span></span>
  </li>)}</ul>
}
