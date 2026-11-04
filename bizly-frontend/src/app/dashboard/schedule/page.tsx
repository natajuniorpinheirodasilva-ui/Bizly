'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Plus, Search } from "lucide-react"
import { apiFetch } from "@/lib/api"
import type { Appointment, AppointmentStatus, BusinessHour, Client, Service } from "./_components/types"
import { STATUS, STATUS_ORDER, errorMessage, isInactive } from "./_components/types"
import {
    addDays, addMonths, daysBetween, endOfMonth, formatDay, fromMinutes, startOfMonth, startOfWeek, toKey, useMounted,
} from "./_components/dates"
import CalendarView from "./_components/CalendarView"
import ListView from "./_components/ListView"
import AppointmentDetails from "./_components/AppointmentDetails"
import AppointmentForm, { type FormInitial } from "./_components/AppointmentForm"

type View = "calendar" | "list"
type Range = "day" | "week" | "month"

const VIEW_RANGES: Record<View, Range[]> = { calendar: ["day", "week"], list: ["week", "month"] }

function computeRange(range: Range, anchor: string): [string, string] {
    if (range === "day") return [anchor, anchor]
    if (range === "week") {
        const start = startOfWeek(anchor)
        return [start, addDays(start, 6)]
    }
    return [startOfMonth(anchor), endOfMonth(anchor)]
}

function rangeLabel(range: Range, start: string, end: string) {
    if (range === "day") return formatDay(start, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    if (range === "month") return formatDay(start, { month: "long", year: "numeric" })
    const sameMonth = start.slice(0, 7) === end.slice(0, 7)
    const from = formatDay(start, { month: "short", day: "numeric" })
    const to = formatDay(end, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })
    return `${from} – ${to}, ${end.slice(0, 4)}`
}

function nextSlot() {
    const now = new Date()
    const minutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30
    return minutes >= 24 * 60 ? "09:00" : fromMinutes(minutes)
}

export default function SchedulePage() {
    const mounted = useMounted()

    const [view, setView] = useState<View>("calendar")
    const [range, setRange] = useState<Range>("week")
    const [anchor, setAnchor] = useState(() => toKey(new Date()))
    const [start, end] = computeRange(range, anchor)
    const rangeKey = `${start}_${end}`

    // appointments for the visible range; "loading" = we don't have this range yet
    const [loaded, setLoaded] = useState<{ key: string; items: Appointment[] } | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const isLoading = loaded?.key !== rangeKey

    const [clients, setClients] = useState<Client[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [hours, setHours] = useState<BusinessHour[]>([])
    const [company, setCompany] = useState({ currency: "BRL", defaultDuration: 60 })

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL")

    const [form, setForm] = useState<FormInitial | null>(null)
    const [selected, setSelected] = useState<Appointment | null>(null)
    const [toDelete, setToDelete] = useState<Appointment | null>(null)

    // reference data, loaded once
    useEffect(() => {
        let ignore = false
        async function loadReference() {
            try {
                const [c, s, h, co] = await Promise.all([
                    apiFetch("/api/v1/clients"),
                    apiFetch("/api/v1/services"),
                    apiFetch("/api/v1/settings/hours"),
                    apiFetch("/api/v1/settings/company"),
                ])
                if (ignore) return
                if (c.ok) setClients(await c.json())
                if (s.ok) setServices(await s.json())
                if (h.ok) setHours(await h.json())
                if (co.ok) {
                    const data = await co.json()
                    setCompany({ currency: data.currency, defaultDuration: data.defaultDuration })
                }
            } catch {
                if (!ignore) toast.error("Failed to load clients and services.")
            }
        }
        loadReference()
        return () => { ignore = true }
    }, [])

    // appointments for the current range
    useEffect(() => {
        let ignore = false
        async function loadAppointments() {
            try {
                const res = await apiFetch(`/api/v1/appointments?start=${start}&end=${end}`)
                const data = await res.json()
                if (ignore) return
                if (!res.ok) {
                    toast.error(errorMessage(data, "Failed to load the schedule."))
                    setLoaded({ key: `${start}_${end}`, items: [] })
                    return
                }
                setLoaded({ key: `${start}_${end}`, items: data })
            } catch {
                if (!ignore) toast.error("Failed to load the schedule.")
            }
        }
        loadAppointments()
        return () => { ignore = true }
    }, [start, end, reloadKey])

    const money = useMemo(() => {
        const f = new Intl.NumberFormat("en-US", { style: "currency", currency: company.currency })
        return (v: number) => f.format(v)
    }, [company.currency])

    const appointments = useMemo(() => (isLoading ? [] : loaded?.items ?? []), [isLoading, loaded])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return appointments.filter(a =>
            (statusFilter === "ALL" || a.status === statusFilter) &&
            (!q || a.clientName.toLowerCase().includes(q) || a.serviceName.toLowerCase().includes(q))
        )
    }, [appointments, search, statusFilter])

    const summary = useMemo(() => {
        const active = appointments.filter(a => !isInactive(a.status))
        return {
            count: active.length,
            expected: active.filter(a => a.status !== "COMPLETED").reduce((s, a) => s + a.price, 0),
            completed: active.filter(a => a.status === "COMPLETED").reduce((s, a) => s + a.price, 0),
        }
    }, [appointments])

    const replaceLocal = useCallback((apt: Appointment) => {
        setLoaded(prev => prev && { ...prev, items: prev.items.map(a => (a.id === apt.id ? apt : a)) })
        setSelected(s => (s?.id === apt.id ? apt : s))
    }, [])

    function changeView(next: View) {
        setView(next)
        if (!VIEW_RANGES[next].includes(range)) setRange(next === "calendar" ? "week" : "month")
    }

    function move(direction: -1 | 1) {
        if (range === "day") setAnchor(a => addDays(a, direction))
        else if (range === "week") setAnchor(a => addDays(a, 7 * direction))
        else setAnchor(a => addMonths(a, direction))
    }

    async function changeStatus(apt: Appointment, status: AppointmentStatus) {
        try {
            const res = await apiFetch(`/api/v1/appointments/${apt.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Couldn't update the status."))
                return
            }
            replaceLocal(data)
            toast.success(`${apt.clientName}: ${STATUS[status].label.toLowerCase()}.`)
        } catch {
            toast.error("Unexpected error.")
        }
    }

    async function confirmDelete() {
        const apt = toDelete
        setToDelete(null)
        if (!apt) return
        try {
            const res = await apiFetch(`/api/v1/appointments/${apt.id}`, { method: "DELETE" })
            if (!res.ok) {
                toast.error(errorMessage(await res.json(), "Couldn't delete the appointment."))
                return
            }
            setLoaded(prev => prev && { ...prev, items: prev.items.filter(a => a.id !== apt.id) })
            setSelected(null)
            toast.success("Appointment deleted.")
        } catch {
            toast.error("Unexpected error.")
        }
    }

    async function exportPdf() {
        try {
            const res = await apiFetch(`/api/v1/appointments/export/pdf?start=${start}&end=${end}`)
            if (!res.ok) {
                toast.error("Failed to generate PDF.")
                return
            }
            const url = URL.createObjectURL(await res.blob())
            const a = document.createElement("a")
            a.href = url
            a.download = `appointments-${start}-to-${end}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch {
            toast.error("Error downloading the document.")
        }
    }

    const today = mounted ? toKey(new Date()) : ""
    const days = daysBetween(start, end)

    return (
        <main className="space-y-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule</h1>
                    <p className="mt-1 text-sm text-foreground-muted">Book, organize and track your appointments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportPdf}
                        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background active:scale-95 cursor-pointer">
                        <Download className="h-4 w-4" />
                        Export PDF
                    </button>
                    <button onClick={() => setForm({ kind: "create", date: anchor < today ? today : anchor, time: nextSlot() })}
                        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-95 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        New appointment
                    </button>
                </div>
            </header>

            {/* toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-2 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <div role="radiogroup" aria-label="View" className="flex rounded-lg bg-background p-1">
                        {([["calendar", CalendarDays, "Calendar"], ["list", List, "List"]] as const).map(([v, Icon, label]) => (
                            <button key={v} role="radio" aria-checked={view === v} onClick={() => changeView(v)}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${view === v ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"}`}>
                                <Icon className="h-4 w-4" /> {label}
                            </button>
                        ))}
                    </div>

                    <div role="radiogroup" aria-label="Range" className="flex rounded-lg bg-background p-1">
                        {VIEW_RANGES[view].map(r => (
                            <button key={r} role="radio" aria-checked={range === r} onClick={() => setRange(r)}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer ${range === r ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"}`}>
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => move(-1)} aria-label="Previous" className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-background hover:text-foreground cursor-pointer">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => setAnchor(toKey(new Date()))}
                            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background cursor-pointer">
                            Today
                        </button>
                        <button onClick={() => move(1)} aria-label="Next" className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-background hover:text-foreground cursor-pointer">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <h2 className="px-1 text-sm font-semibold text-foreground">{mounted ? rangeLabel(range, start, end) : ""}</h2>
                </div>

                {view === "list" && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client or service"
                                aria-label="Search appointments"
                                className="w-56 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AppointmentStatus | "ALL")}
                            aria-label="Filter by status"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                            <option value="ALL">All statuses</option>
                            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* period summary */}
            {!isLoading && (
                <p className="px-1 text-sm text-foreground-muted">
                    <span className="font-medium text-foreground">{summary.count}</span> appointment{summary.count === 1 ? "" : "s"}
                    {" · "}<span className="font-medium text-foreground">{money(summary.completed)}</span> completed
                    {" · "}<span className="font-medium text-foreground">{money(summary.expected)}</span> expected
                </p>
            )}

            {!mounted || isLoading ? (
                <div className="h-[480px] animate-pulse rounded-xl border border-border bg-surface" />
            ) : view === "calendar" ? (
                <CalendarView
                    days={days}
                    appointments={appointments}
                    hours={hours}
                    onSlotClick={(date, time) => setForm({ kind: "create", date, time })}
                    onAppointmentClick={setSelected}
                />
            ) : (
                <ListView
                    appointments={filtered}
                    money={money}
                    onOpen={setSelected}
                    onEdit={apt => setForm({ kind: "edit", appointment: apt })}
                    onStatus={changeStatus}
                    onDelete={setToDelete}
                />
            )}

            {selected && (
                <AppointmentDetails
                    apt={selected}
                    money={money}
                    onClose={() => setSelected(null)}
                    onEdit={() => { setForm({ kind: "edit", appointment: selected }); setSelected(null) }}
                    onStatus={s => changeStatus(selected, s)}
                    onDelete={() => setToDelete(selected)}
                />
            )}

            {form && (
                <AppointmentForm
                    // remount per target so the form state starts fresh
                    key={form.kind === "edit" ? form.appointment.id : `${form.date}-${form.time}`}
                    initial={form}
                    clients={clients}
                    services={services}
                    hours={hours}
                    defaultDuration={company.defaultDuration}
                    currency={company.currency}
                    money={money}
                    onClose={() => setForm(null)}
                    onClientCreated={c => setClients(prev => [c, ...prev])}
                    onSaved={apt => {
                        setForm(null)
                        // jump to the appointment if it was booked outside the visible range
                        if (apt.date < start || apt.date > end) setAnchor(apt.date)
                        else setReloadKey(k => k + 1)
                    }}
                />
            )}

            {toDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-foreground">Delete this appointment?</h3>
                        <p className="mt-2 text-sm text-foreground-muted">
                            {toDelete.clientName} · {formatDay(toDelete.date, { month: "short", day: "numeric" })} at {toDelete.time}.
                            {" "}If it just didn&apos;t happen, prefer marking it as cancelled or no-show to keep your history.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setToDelete(null)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background cursor-pointer">
                                Keep it
                            </button>
                            <button onClick={confirmDelete}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 cursor-pointer">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
