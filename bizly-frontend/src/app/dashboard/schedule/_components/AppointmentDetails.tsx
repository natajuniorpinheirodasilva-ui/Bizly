'use client'

import { Calendar, Clock, Edit, Mail, Phone, StickyNote, Tag, Trash, X } from "lucide-react"
import type { Appointment, AppointmentStatus } from "./types"
import { STATUS, STATUS_ORDER } from "./types"
import { formatDay } from "./dates"
import StatusBadge from "./StatusBadge"

export default function AppointmentDetails({ apt, money, onClose, onEdit, onStatus, onDelete }: {
    apt: Appointment
    money: (v: number) => string
    onClose: () => void
    onEdit: () => void
    onStatus: (status: AppointmentStatus) => void
    onDelete: () => void
}) {
    const rows = [
        { icon: Calendar, text: formatDay(apt.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) },
        { icon: Clock, text: `${apt.time} – ${apt.endTime} (${apt.duration} min)` },
        { icon: Tag, text: `${apt.serviceName} · ${money(apt.price)}` },
        apt.clientEmail ? { icon: Mail, text: apt.clientEmail } : null,
        apt.clientPhone ? { icon: Phone, text: apt.clientPhone } : null,
        apt.notes ? { icon: StickyNote, text: apt.notes } : null,
    ].filter(Boolean) as { icon: typeof Calendar; text: string }[]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Appointment with ${apt.clientName}`}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            >
                <div className="h-1.5" style={{ background: STATUS[apt.status].color }} />
                <div className="flex items-start justify-between gap-3 p-6 pb-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold text-foreground">{apt.clientName}</h2>
                        <div className="mt-2 flex items-center gap-2">
                            <StatusBadge status={apt.status} />
                            {!apt.customerId && <span className="text-xs text-foreground-muted">Walk-in</span>}
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="text-foreground-muted transition-colors hover:text-foreground cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <ul className="space-y-2.5 px-6">
                    {rows.map(({ icon: Icon, text }, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
                            <span className="whitespace-pre-line break-words">{text}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-5 px-6">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">Change status</p>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_ORDER.filter(s => s !== apt.status).map(s => (
                            <button
                                key={s}
                                onClick={() => onStatus(s)}
                                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background cursor-pointer"
                            >
                                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STATUS[s].color }} />
                                {STATUS[s].action}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border bg-background/50 px-6 py-3">
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer"
                    >
                        <Trash className="h-4 w-4" /> Delete
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-95 cursor-pointer"
                    >
                        <Edit className="h-4 w-4" /> Edit
                    </button>
                </div>
            </div>
        </div>
    )
}
