'use client'

import { useMemo, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { AlertTriangle, Search, UserPlus, UserRound, X } from "lucide-react"
import { apiFetch } from "@/lib/api"
import type { Appointment, AppointmentStatus, BusinessHour, Client, Service } from "./types"
import { STATUS, STATUS_ORDER, errorMessage, isInactive } from "./types"
import { businessHoursIssue, fromMinutes, toMinutes } from "./dates"

type ClientMode = "search" | "existing" | "walkin" | "new"

export type FormInitial =
    | { kind: "create"; date: string; time: string }
    | { kind: "edit"; appointment: Appointment }

const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
const labelClass = "mb-1.5 block text-sm font-medium text-foreground"

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240]

export default function AppointmentForm({ initial, clients, services, hours, defaultDuration, currency, money, onClose, onSaved, onClientCreated }: {
    initial: FormInitial
    clients: Client[]
    services: Service[]
    hours: BusinessHour[]
    defaultDuration: number
    currency: string
    money: (v: number) => string
    onClose: () => void
    onSaved: (apt: Appointment) => void
    onClientCreated: (client: Client) => void
}) {
    const editing = initial.kind === "edit" ? initial.appointment : null
    const firstService = services[0]

    const [mode, setMode] = useState<ClientMode>(editing ? (editing.customerId ? "existing" : "walkin") : "search")
    const [customerId, setCustomerId] = useState<string | null>(editing?.customerId ?? null)
    const [query, setQuery] = useState(editing?.clientName ?? "")
    const [newClient, setNewClient] = useState({ email: "", phone: "" })

    const [serviceId, setServiceId] = useState(editing?.serviceId ?? firstService?.id ?? "")
    const [date, setDate] = useState(editing?.date ?? (initial.kind === "create" ? initial.date : ""))
    const [time, setTime] = useState(editing?.time ?? (initial.kind === "create" ? initial.time : "09:00"))
    const [duration, setDuration] = useState(editing?.duration ?? firstService?.duration ?? defaultDuration)
    const [price, setPrice] = useState(String(editing?.price ?? firstService?.price ?? 0))
    const [status, setStatus] = useState<AppointmentStatus>(editing?.status ?? "SCHEDULED")
    const [notes, setNotes] = useState(editing?.notes ?? "")
    const [allowOutside, setAllowOutside] = useState(false)

    const [isSaving, setIsSaving] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const selectedClient = clients.find(c => c.id === customerId)
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list = q
            ? clients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q))
            : clients
        return list.slice(0, 6)
    }, [clients, query])

    const hoursIssue = isInactive(status) ? null : businessHoursIssue(hours, date, time, duration)
    const endTime = time ? fromMinutes(toMinutes(time) + duration) : ""
    const durationOptions = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b)

    function pickService(id: string) {
        setServiceId(id)
        const s = services.find(x => x.id === id)
        if (s) {
            setDuration(s.duration)
            setPrice(String(s.price))
        }
    }

    function pickClient(c: Client) {
        setCustomerId(c.id)
        setQuery(c.name)
        setMode("existing")
    }

    function resetClient() {
        setCustomerId(null)
        setMode("search")
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setServerError(null)

        const name = query.trim()
        if (mode === "search") return setServerError("Choose a client, create a new one or book a walk-in.")
        if ((mode === "walkin" || mode === "new") && !name) return setServerError("Type the client's name.")
        if (mode === "new" && !newClient.email.trim()) return setServerError("Email is required to create a client.")
        const priceValue = Number(price.replace(",", "."))
        if (Number.isNaN(priceValue) || priceValue < 0) return setServerError("Enter a valid price.")
        if (hoursIssue && !allowOutside) return setServerError(`${hoursIssue} Tick "Book anyway" to continue.`)

        setIsSaving(true)
        try {
            let clientId = mode === "existing" ? customerId : null

            if (mode === "new") {
                const res = await apiFetch("/api/v1/clients", {
                    method: "POST",
                    body: JSON.stringify({ name, email: newClient.email.trim(), phone: newClient.phone.trim() || null }),
                })
                const data = await res.json()
                if (!res.ok) {
                    setServerError(errorMessage(data, "Couldn't create the client."))
                    return
                }
                onClientCreated(data)
                clientId = data.id
                // if the booking fails below, don't create the client twice on retry
                setCustomerId(data.id)
                setMode("existing")
            }

            const body = {
                customerId: clientId,
                clientName: clientId ? null : name,
                serviceId: serviceId || null,
                date,
                time,
                duration,
                price: priceValue,
                status,
                notes: notes.trim() || null,
                allowOutsideHours: allowOutside,
            }

            const res = await apiFetch(editing ? `/api/v1/appointments/${editing.id}` : "/api/v1/appointments", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) {
                setServerError(errorMessage(data, "Couldn't save the appointment."))
                return
            }
            toast.success(editing ? "Appointment updated." : "Appointment booked.")
            onSaved(data)
        } catch {
            setServerError("Unexpected error. Try again.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-lg font-semibold text-foreground">{editing ? "Edit appointment" : "New appointment"}</h2>
                    <button onClick={onClose} aria-label="Close" className="text-foreground-muted transition-colors hover:text-foreground cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="space-y-5 overflow-y-auto px-6 py-5">
                        {/* client */}
                        <div>
                            <span className={labelClass}>Client</span>

                            {mode === "search" ? (
                                <div className="rounded-lg border border-border">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                                        <input
                                            autoFocus
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder="Search by name, email or phone"
                                            aria-label="Search client"
                                            className="w-full rounded-t-lg bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
                                        />
                                    </div>
                                    <ul className="max-h-48 divide-y divide-border overflow-y-auto border-t border-border">
                                        {matches.map(c => (
                                            <li key={c.id}>
                                                <button type="button" onClick={() => pickClient(c)}
                                                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-background cursor-pointer">
                                                    <UserRound className="h-4 w-4 shrink-0 text-foreground-muted" />
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm text-foreground">{c.name}</span>
                                                        <span className="block truncate text-xs text-foreground-muted">{c.email}{c.phone && c.phone !== "n/a" ? ` · ${c.phone}` : ""}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                        {matches.length === 0 && !query.trim() && (
                                            <li className="px-3 py-3 text-xs text-foreground-muted">No clients yet. Type a name to create one.</li>
                                        )}
                                        {query.trim() && (
                                            <>
                                                <li>
                                                    <button type="button" onClick={() => setMode("new")}
                                                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-background cursor-pointer">
                                                        <UserPlus className="h-4 w-4 shrink-0" />
                                                        Create client &ldquo;{query.trim()}&rdquo;
                                                    </button>
                                                </li>
                                                <li>
                                                    <button type="button" onClick={() => setMode("walkin")}
                                                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground-muted transition-colors hover:bg-background cursor-pointer">
                                                        <UserRound className="h-4 w-4 shrink-0" />
                                                        Book &ldquo;{query.trim()}&rdquo; as walk-in (no record)
                                                    </button>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border bg-background/50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-foreground">
                                                {mode === "existing" ? (selectedClient?.name ?? query) : query}
                                            </p>
                                            <p className="truncate text-xs text-foreground-muted">
                                                {mode === "existing" && (selectedClient ? `${selectedClient.email}${selectedClient.phone && selectedClient.phone !== "n/a" ? ` · ${selectedClient.phone}` : ""}` : "Existing client")}
                                                {mode === "walkin" && "Walk-in · not saved to your clients"}
                                                {mode === "new" && "New client · will be added to your clients"}
                                            </p>
                                        </div>
                                        <button type="button" onClick={resetClient} className="shrink-0 text-xs font-medium text-primary hover:underline cursor-pointer">
                                            Change
                                        </button>
                                    </div>

                                    {mode === "walkin" && (
                                        <input aria-label="Client name" className={`${inputClass} mt-3`} value={query} onChange={e => setQuery(e.target.value)} />
                                    )}
                                    {mode === "new" && (
                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <input aria-label="Client name" className={inputClass} value={query} onChange={e => setQuery(e.target.value)} />
                                            <input aria-label="Client email" type="email" placeholder="Email *" className={inputClass}
                                                value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                                            <input aria-label="Client phone" type="tel" placeholder="Phone" className={inputClass}
                                                value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* service */}
                        <div>
                            <label htmlFor="apt-service" className={labelClass}>Service</label>
                            {services.length > 0 ? (
                                <select id="apt-service" className={inputClass} value={serviceId} onChange={e => pickService(e.target.value)}>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} · {s.duration} min · {money(s.price)}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-foreground-muted">
                                    No services yet, a general appointment will be used.{" "}
                                    <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">Add services in Settings</Link>
                                </p>
                            )}
                        </div>

                        {/* when */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="col-span-2 sm:col-span-1">
                                <label htmlFor="apt-date" className={labelClass}>Date</label>
                                <input id="apt-date" type="date" required className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="apt-time" className={labelClass}>Start</label>
                                <input id="apt-time" type="time" step={900} required className={inputClass} value={time} onChange={e => setTime(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="apt-duration" className={labelClass}>Duration</label>
                                <select id="apt-duration" className={inputClass} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                                    {durationOptions.map(d => <option key={d} value={d}>{d} min</option>)}
                                </select>
                            </div>
                        </div>
                        {endTime && <p className="-mt-3 text-xs text-foreground-muted">Ends at <span className="font-medium tabular-nums text-foreground">{endTime}</span></p>}

                        {hoursIssue && (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <div>
                                    <p className="text-foreground">{hoursIssue}</p>
                                    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-foreground-muted">
                                        <input type="checkbox" className="accent-primary" checked={allowOutside} onChange={e => setAllowOutside(e.target.checked)} />
                                        Book anyway
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="apt-price" className={labelClass}>Price ({currency})</label>
                                <input id="apt-price" inputMode="decimal" className={inputClass} value={price} onChange={e => setPrice(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="apt-status" className={labelClass}>Status</label>
                                <select id="apt-status" className={inputClass} value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)}>
                                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="apt-notes" className={labelClass}>Notes <span className="font-normal text-foreground-muted">(optional)</span></label>
                            <textarea id="apt-notes" rows={2} maxLength={1000} className={inputClass} placeholder="Anything to remember about this appointment"
                                value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>

                        {serverError && (
                            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                                {serverError}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-border hover:text-foreground cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving}
                            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
                            {isSaving ? "Saving..." : editing ? "Save changes" : "Book appointment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
