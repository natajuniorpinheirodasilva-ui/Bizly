'use client'

import { useEffect, useMemo, useState } from "react"
import type { Appointment, BusinessHour } from "./types"
import { STATUS, isInactive } from "./types"
import { formatDay, fromMinutes, toKey, toMinutes, weekday } from "./dates"

const HOUR_PX = 56
const SLOT_MIN = 30

type Placed = { apt: Appointment; start: number; end: number; lane: number; lanes: number }

/** Side-by-side lanes for overlapping appointments (cancelled ones can overlap active ones). */
function layoutDay(items: Appointment[]): Placed[] {
    const sorted = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    const placed: Placed[] = []
    let cluster: Placed[] = []
    let laneEnds: number[] = []
    let clusterEnd = -1

    const flush = () => {
        cluster.forEach(p => placed.push({ ...p, lanes: laneEnds.length }))
        cluster = []
        laneEnds = []
        clusterEnd = -1
    }

    for (const apt of sorted) {
        const start = toMinutes(apt.time)
        const end = start + apt.duration
        if (cluster.length && start >= clusterEnd) flush()

        let lane = laneEnds.findIndex(e => e <= start)
        if (lane === -1) {
            lane = laneEnds.length
            laneEnds.push(end)
        } else {
            laneEnds[lane] = end
        }
        cluster.push({ apt, start, end, lane, lanes: 1 })
        clusterEnd = Math.max(clusterEnd, end)
    }
    flush()
    return placed
}

const hatch = "repeating-linear-gradient(135deg, var(--surface-muted) 0 1px, transparent 1px 7px)"

export default function CalendarView({ days, appointments, hours, onSlotClick, onAppointmentClick }: {
    days: string[]
    appointments: Appointment[]
    hours: BusinessHour[]
    onSlotClick: (date: string, time: string) => void
    onAppointmentClick: (apt: Appointment) => void
}) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])
    const today = toKey(now)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    // visible hours: business hours + whatever appointments exist, at least 08–19
    const { startHour, endHour } = useMemo(() => {
        let s = 8, e = 19
        for (const h of hours) {
            s = Math.min(s, Math.floor(toMinutes(h.startTime) / 60))
            e = Math.max(e, Math.ceil(toMinutes(h.endTime) / 60))
        }
        for (const a of appointments) {
            s = Math.min(s, Math.floor(toMinutes(a.time) / 60))
            e = Math.max(e, Math.ceil((toMinutes(a.time) + a.duration) / 60))
        }
        return { startHour: Math.max(0, s), endHour: Math.min(24, e) }
    }, [hours, appointments])

    const byDay = useMemo(() => {
        const map = new Map<string, Placed[]>()
        for (const day of days) map.set(day, layoutDay(appointments.filter(a => a.date === day)))
        return map
    }, [days, appointments])

    const totalHeight = (endHour - startHour) * HOUR_PX
    const y = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR_PX
    const hourList = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
    const isWeek = days.length > 1

    function handleColumnClick(day: string, e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect()
        const offset = e.clientY - rect.top
        const minutes = startHour * 60 + Math.floor((offset / HOUR_PX) * (60 / SLOT_MIN)) * SLOT_MIN
        onSlotClick(day, fromMinutes(Math.min(minutes, 23 * 60 + 30)))
    }

    function closedRanges(day: string): [number, number][] {
        if (hours.length === 0) return []
        const row = hours.find(h => h.dayOfWeek === weekday(day))
        const from = startHour * 60, to = endHour * 60
        if (!row) return [[from, to]]
        return [[from, toMinutes(row.startTime)], [toMinutes(row.endTime), to]].filter(([a, b]) => b > a) as [number, number][]
    }

    const gridCols = `56px repeat(${days.length}, minmax(${isWeek ? 110 : 0}px, 1fr))`

    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <div className={isWeek ? "min-w-[820px]" : ""}>
                {/* day headers */}
                <div className="sticky top-0 z-20 grid border-b border-border bg-surface" style={{ gridTemplateColumns: gridCols }}>
                    <div />
                    {days.map(day => {
                        const isToday = day === today
                        const count = appointments.filter(a => a.date === day && !isInactive(a.status)).length
                        return (
                            <div key={day} className="border-l border-border px-2 py-2 text-center">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                                    {formatDay(day, { weekday: "short" })}
                                </p>
                                <p className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-primary text-white" : "text-foreground"}`}>
                                    {formatDay(day, { day: "numeric" })}
                                </p>
                                <p className="mt-0.5 h-4 text-[10px] text-foreground-muted">
                                    {count > 0 ? `${count} appt${count > 1 ? "s" : ""}` : ""}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* time grid */}
                <div className="relative grid" style={{ gridTemplateColumns: gridCols }}>
                    {/* hour gutter */}
                    <div className="relative" style={{ height: totalHeight }}>
                        {hourList.map(h => (
                            <span
                                key={h}
                                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-foreground-muted"
                                style={{ top: (h - startHour) * HOUR_PX }}
                            >
                                {h === startHour ? "" : `${String(h).padStart(2, "0")}:00`}
                            </span>
                        ))}
                    </div>

                    {days.map(day => (
                        <div
                            key={day}
                            onClick={e => handleColumnClick(day, e)}
                            className="relative cursor-pointer border-l border-border"
                            style={{ height: totalHeight }}
                            title="Click to book this time"
                        >
                            {/* hour lines */}
                            {hourList.map(h => (
                                <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ top: (h - startHour) * HOUR_PX }} />
                            ))}
                            {hourList.map(h => (
                                <div key={`half-${h}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/30" style={{ top: (h - startHour) * HOUR_PX + HOUR_PX / 2 }} />
                            ))}

                            {/* closed hours */}
                            {closedRanges(day).map(([a, b]) => (
                                <div
                                    key={`${a}-${b}`}
                                    className="pointer-events-none absolute inset-x-0 bg-background/60"
                                    style={{ top: y(a), height: y(b) - y(a), backgroundImage: hatch }}
                                />
                            ))}

                            {/* now indicator */}
                            {day === today && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 && (
                                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(nowMinutes) }}>
                                    <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                                    <span className="h-px flex-1 bg-red-500" />
                                </div>
                            )}

                            {/* appointments */}
                            {(byDay.get(day) ?? []).map(({ apt, start, end, lane, lanes }) => {
                                const meta = STATUS[apt.status]
                                const height = Math.max(y(end) - y(start), 22)
                                const compact = height < 44
                                const inactive = isInactive(apt.status)
                                return (
                                    <button
                                        key={apt.id}
                                        onClick={e => { e.stopPropagation(); onAppointmentClick(apt) }}
                                        title={`${apt.clientName} · ${apt.time}–${apt.endTime} · ${apt.serviceName} · ${meta.label}`}
                                        className={`absolute z-10 overflow-hidden rounded-md px-2 py-1 text-left shadow-sm transition-shadow hover:z-20 hover:shadow-md focus:z-20 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${inactive ? "opacity-60" : ""}`}
                                        style={{
                                            top: y(start) + 1,
                                            height: height - 2,
                                            left: `calc(${(lane / lanes) * 100}% + 2px)`,
                                            width: `calc(${100 / lanes}% - 4px)`,
                                            background: `color-mix(in oklab, ${meta.color} 14%, var(--surface))`,
                                            borderLeft: `3px solid ${meta.color}`,
                                        }}
                                    >
                                        <p className={`truncate text-xs font-semibold text-foreground ${inactive ? "line-through" : ""}`}>
                                            {compact && <span className="mr-1 font-normal tabular-nums text-foreground-muted">{apt.time}</span>}
                                            {apt.clientName}
                                        </p>
                                        {!compact && (
                                            <>
                                                <p className="truncate text-[11px] tabular-nums text-foreground-muted">
                                                    {apt.time}–{apt.endTime}
                                                </p>
                                                <p className="truncate text-[11px] text-foreground-muted">
                                                    {apt.serviceName}{inactive ? ` · ${meta.label}` : ""}
                                                </p>
                                            </>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
