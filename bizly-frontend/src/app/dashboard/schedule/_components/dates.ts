// All dates are handled as local "wall clock" strings (YYYY-MM-DD / HH:MM),
// the same format the API uses, so there are no timezone surprises.

import { useSyncExternalStore } from "react"
import type { BusinessHour } from "./types"

export const pad = (n: number) => String(n).padStart(2, "0")

export function toKey(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: string) {
    const [y, m, d] = key.split("-").map(Number)
    return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number) {
    const d = fromKey(key)
    d.setDate(d.getDate() + n)
    return toKey(d)
}

export function addMonths(key: string, n: number) {
    const d = fromKey(key)
    return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

/** Monday of the week that contains `key`. */
export function startOfWeek(key: string) {
    const d = fromKey(key)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return toKey(d)
}

export function startOfMonth(key: string) {
    const d = fromKey(key)
    return toKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(key: string) {
    const d = fromKey(key)
    return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function daysBetween(start: string, end: string) {
    const days: string[] = []
    for (let k = start; k <= end; k = addDays(k, 1)) days.push(k)
    return days
}

export const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number)
    return h * 60 + m
}

export const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`

export const weekday = (key: string) => fromKey(key).getDay() // 0 = Sunday

export function formatDay(key: string, options: Intl.DateTimeFormatOptions) {
    return fromKey(key).toLocaleDateString("en-US", options)
}

/** Mirrors the backend rule: null = inside hours (or hours not configured), otherwise the reason. */
export function businessHoursIssue(hours: BusinessHour[], date: string, time: string, duration: number): string | null {
    if (hours.length === 0 || !date || !time) return null
    const row = hours.find(h => h.dayOfWeek === weekday(date))
    if (!row) return "Your business is closed on this day."
    const start = toMinutes(time)
    const end = start + duration
    if (end >= 24 * 60 || start < toMinutes(row.startTime) || end > toMinutes(row.endTime)) {
        return `Outside business hours (${row.startTime}–${row.endTime}).`
    }
    return null
}

const noopSubscribe = () => () => { }

/** false during SSR and the first client render, true afterwards; avoids hydration mismatches with dates. */
export function useMounted() {
    return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
