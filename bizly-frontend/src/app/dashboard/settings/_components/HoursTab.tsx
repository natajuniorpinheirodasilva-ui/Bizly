'use client'

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Card, inputClass, primaryButtonClass, errorMessage } from "./ui"

type Day = { dayOfWeek: number; open: boolean; startTime: string; endTime: string }

// Monday first, like most business calendars. 0 = Sunday (matches JS Date.getDay)
const DAYS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
]

function defaultWeek(): Day[] {
    return DAYS.map(d => ({
        dayOfWeek: d.value,
        open: d.value >= 1 && d.value <= 5,
        startTime: "09:00",
        endTime: "18:00",
    }))
}

export default function HoursTab() {
    const [week, setWeek] = useState<Day[]>(defaultWeek())
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch("/api/v1/settings/hours")
                if (!res.ok) {
                    toast.error("Failed to load business hours.")
                    return
                }
                const rows: { dayOfWeek: number; startTime: string; endTime: string }[] = await res.json()
                // nothing saved yet -> keep the Mon-Fri 9-18 suggestion
                if (rows.length === 0) return

                setWeek(DAYS.map(d => {
                    const row = rows.find(r => r.dayOfWeek === d.value)
                    return row
                        ? { dayOfWeek: d.value, open: true, startTime: row.startTime, endTime: row.endTime }
                        : { dayOfWeek: d.value, open: false, startTime: "09:00", endTime: "18:00" }
                }))
            } catch {
                toast.error("Unexpected error.")
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    function update(dayOfWeek: number, patch: Partial<Day>) {
        setWeek(prev => prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))
    }

    function copyToAll(source: Day) {
        setWeek(prev => prev.map(d => (d.open ? { ...d, startTime: source.startTime, endTime: source.endTime } : d)))
        toast.success("Hours copied to all open days.")
    }

    async function handleSave() {
        const invalid = week.find(d => d.open && d.startTime >= d.endTime)
        if (invalid) {
            const label = DAYS.find(d => d.value === invalid.dayOfWeek)?.label
            toast.error(`${label}: opening time must be before closing time.`)
            return
        }

        setIsSaving(true)
        try {
            const payload = week
                .filter(d => d.open)
                .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))

            const res = await apiFetch("/api/v1/settings/hours", {
                method: "PUT",
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to save business hours."))
                return
            }
            toast.success("Business hours saved.")
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card
            title="Business hours"
            description="Set the days and times your business is open for appointments."
            footer={
                <button onClick={handleSave} disabled={isSaving || isLoading} className={primaryButtonClass}>
                    {isSaving ? "Saving..." : "Save hours"}
                </button>
            }
        >
            <ul className="divide-y divide-border">
                {week.map(day => {
                    const label = DAYS.find(d => d.value === day.dayOfWeek)!.label
                    return (
                        <li key={day.dayOfWeek} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                            <label className="flex w-40 cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={day.open}
                                    disabled={isLoading}
                                    onChange={e => update(day.dayOfWeek, { open: e.target.checked })}
                                    className="h-4 w-4 cursor-pointer accent-primary"
                                />
                                <span className="text-sm font-medium text-foreground">{label}</span>
                            </label>

                            {day.open ? (
                                <div className="flex flex-1 flex-wrap items-center gap-3">
                                    <input
                                        type="time"
                                        aria-label={`${label} opening time`}
                                        value={day.startTime}
                                        onChange={e => update(day.dayOfWeek, { startTime: e.target.value })}
                                        className={`${inputClass} w-32`}
                                    />
                                    <span className="text-sm text-foreground-muted">to</span>
                                    <input
                                        type="time"
                                        aria-label={`${label} closing time`}
                                        value={day.endTime}
                                        onChange={e => update(day.dayOfWeek, { endTime: e.target.value })}
                                        className={`${inputClass} w-32`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => copyToAll(day)}
                                        className="text-xs font-medium text-primary hover:underline cursor-pointer"
                                    >
                                        Copy to all
                                    </button>
                                </div>
                            ) : (
                                <span className="text-sm text-foreground-muted">Closed</span>
                            )}
                        </li>
                    )
                })}
            </ul>
        </Card>
    )
}
