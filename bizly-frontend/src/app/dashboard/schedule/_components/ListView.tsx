'use client'

import { Check, Edit, MoreHorizontal, Trash } from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Appointment, AppointmentStatus } from "./types"
import { STATUS, STATUS_ORDER } from "./types"
import { formatDay, toKey } from "./dates"
import StatusBadge from "./StatusBadge"

export default function ListView({ appointments, money, onOpen, onEdit, onStatus, onDelete }: {
    appointments: Appointment[]
    money: (v: number) => string
    onOpen: (apt: Appointment) => void
    onEdit: (apt: Appointment) => void
    onStatus: (apt: Appointment, status: AppointmentStatus) => void
    onDelete: (apt: Appointment) => void
}) {
    const today = toKey(new Date())

    // group by day, keeping the API's chronological order
    const groups: { date: string; items: Appointment[] }[] = []
    for (const apt of appointments) {
        const last = groups[groups.length - 1]
        if (last?.date === apt.date) last.items.push(apt)
        else groups.push({ date: apt.date, items: [apt] })
    }

    if (appointments.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center text-sm text-foreground-muted">
                No appointments in this period.
            </div>
        )
    }

    return (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-border bg-background/50">
                        <tr>
                            <th className="px-5 py-3 font-medium text-foreground-muted">Time</th>
                            <th className="px-5 py-3 font-medium text-foreground-muted">Client</th>
                            <th className="px-5 py-3 font-medium text-foreground-muted">Service</th>
                            <th className="px-5 py-3 text-right font-medium text-foreground-muted">Price</th>
                            <th className="px-5 py-3 font-medium text-foreground-muted">Status</th>
                            <th className="px-5 py-3 text-right font-medium text-foreground-muted">Actions</th>
                        </tr>
                    </thead>
                    {groups.map(group => (
                        <tbody key={group.date} className="divide-y divide-border border-b border-border last:border-b-0">
                            <tr className="bg-background/40">
                                <td colSpan={6} className="px-5 py-2 text-xs font-semibold text-foreground">
                                    {formatDay(group.date, { weekday: "long", month: "short", day: "numeric" })}
                                    {group.date === today && (
                                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Today</span>
                                    )}
                                    <span className="ml-2 font-normal text-foreground-muted">
                                        · {group.items.length} appointment{group.items.length > 1 ? "s" : ""}
                                    </span>
                                </td>
                            </tr>
                            {group.items.map(apt => {
                                const canComplete = apt.status === "SCHEDULED" || apt.status === "CONFIRMED"
                                return (
                                    <tr
                                        key={apt.id}
                                        onClick={() => onOpen(apt)}
                                        className="cursor-pointer transition-colors hover:bg-background/50"
                                    >
                                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">
                                            {apt.time}
                                            <span className="text-foreground-muted">–{apt.endTime}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-foreground">{apt.clientName}</p>
                                            {!apt.customerId && <p className="text-xs text-foreground-muted">Walk-in</p>}
                                            {apt.clientPhone && <p className="text-xs text-foreground-muted">{apt.clientPhone}</p>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="text-foreground">{apt.serviceName}</p>
                                            <p className="text-xs text-foreground-muted">{apt.duration} min</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-foreground">{money(apt.price)}</td>
                                        <td className="px-5 py-3"><StatusBadge status={apt.status} /></td>
                                        <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                {canComplete && (
                                                    <button
                                                        onClick={() => onStatus(apt, "COMPLETED")}
                                                        title="Mark as completed"
                                                        aria-label={`Mark ${apt.clientName} as completed`}
                                                        className="rounded-md p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10 cursor-pointer"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        aria-label="More actions"
                                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground-muted outline-none transition-colors hover:bg-border hover:text-foreground focus:ring-2 focus:ring-primary/50"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem onClick={() => onEdit(apt)} className="cursor-pointer">
                                                            <Edit /> <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {STATUS_ORDER.filter(s => s !== apt.status).map(s => (
                                                            <DropdownMenuItem key={s} onClick={() => onStatus(apt, s)} className="cursor-pointer">
                                                                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STATUS[s].color }} />
                                                                <span>{STATUS[s].action}</span>
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => onDelete(apt)}
                                                            className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
                                                        >
                                                            <Trash /> <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    ))}
                </table>
            </div>
        </section>
    )
}
