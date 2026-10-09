'use client'

import { useEffect, useState } from "react"
import { Calendar as CalendarIcon, Plus, MoreHorizontal, Check, X, Clock } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Appointment = {
    id: string
    clientName: string
    date: string
    time: string
    status: string
}

export default function SchedulePage() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({ clientName: "", date: "", time: "", status: "SCHEDULED" })

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editFormData, setEditFormData] = useState({ clientName: "", date: "", time: "", status: "" })

    useEffect(() => {
        async function fetchAppointments() {
            try {
                const response = await apiFetch("/api/v1/appointments")
                if (!response.ok) {
                    toast.error("failed to fetch schedule")
                    return
                }
                const data = await response.json()
                setAppointments(data)
            } catch (err: any) {
                toast.error("something went wrong")
            } finally {
                setIsLoading(false)
            }
        }
        fetchAppointments()
    }, [])

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await apiFetch("/api/v1/appointments", {
                method: "POST",
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.detail || "failed to create appointment")
                return
            }

            setAppointments([data, ...appointments])
            setFormData({ clientName: "", date: "", time: "", status: "SCHEDULED" })
            setIsModalOpen(false)
            toast.success("Appointment Created")
        } catch (err: any) {
            toast.error("Unexpected Error")
        } finally {
            setIsSubmitting(false)
        }
    }

    function startEditing(item: Appointment) {
        setEditingId(item.id)
        setEditFormData({
            clientName: item.clientName,
            date: item.date,
            time: item.time,
            status: item.status
        })
    }

    async function saveEdit(id: string, item: Appointment) {
        if (!editFormData.clientName || !editFormData.date || !editFormData.time) {
            toast.error("Fill all required fields")
            return
        }

        const hasChanged =
            editFormData.clientName !== item.clientName ||
            editFormData.date !== item.date ||
            editFormData.time !== item.time ||
            editFormData.status !== item.status

        if (!hasChanged) {
            setEditingId(null)
            return
        }

        try {
            const response = await apiFetch(`/api/v1/appointments/${id}`, {
                method: "PUT",
                body: JSON.stringify(editFormData)
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.detail || "Failed to Update")
                return
            }

            setAppointments(appointments.map(a => (a.id === id ? data : a)))
            setEditingId(null)
            toast.success("Appointment Updated")
        } catch (err: any) {
            toast.error("error updating appointment")
        }
    }

    async function handleDelete(id: string) {
        try {
            const response = await apiFetch(`/api/v1/appointments/${id}`, {
                method: "DELETE"
            })

            if (!response.ok) {
                const data = await response.json()
                toast.error(data.detail || "failed to delete")
                return
            }

            setAppointments(appointments.filter(a => a.id !== id))
            toast.success("appointment deleted")
        } catch (err: any) {
            toast.error("Error Deleting Appointment")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule</h1>
                    <p className="mt-1 text-sm text-foreground-muted">manage your upcoming appointments and events.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    New Appointment
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-background/50">
                            <tr>
                                <th className="px-6 py-4 font-medium text-foreground-muted">Client</th>
                                <th className="px-6 py-4 font-medium text-foreground-muted">Date</th>
                                <th className="px-6 py-4 font-medium text-foreground-muted">Time</th>
                                <th className="px-6 py-4 font-medium text-foreground-muted">Status</th>
                                <th className="px-6 py-4 text-right font-medium text-foreground-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-4 w-24 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-4 w-16 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-6 w-20 rounded-full bg-border" />
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="ml-auto h-8 w-8 rounded bg-border" />
                                        </td>
                                    </tr>
                                ))
                            ) : appointments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-foreground-muted">
                                        no appointments found. click 'new appointment' to start.
                                    </td>
                                </tr>
                            ) : (
                                appointments.map((item) => (
                                    editingId === item.id ? (
                                        <tr key={item.id} className="bg-background/50">
                                            <td className="px-6 py-4">
                                                <input
                                                    value={editFormData.clientName}
                                                    onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-sans focus:border-primary focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="date"
                                                    value={editFormData.date}
                                                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-sans focus:border-primary focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="time"
                                                    value={editFormData.time}
                                                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-sans focus:border-primary focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={editFormData.status}
                                                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-sans [&>option]:font-sans focus:border-primary focus:outline-none"
                                                >
                                                    <option value="SCHEDULED">Scheduled</option>
                                                    <option value="COMPLETED">Completed</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => saveEdit(item.id, item)}
                                                        className="rounded-md bg-emerald-500/10 p-2 text-emerald-500 transition-colors hover:bg-emerald-500/20"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="rounded-md bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500/20"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={item.id} className="transition-colors hover:bg-background/50">
                                            <td className="px-6 py-4 font-medium text-foreground">{item.clientName}</td>
                                            <td className="px-6 py-4 text-foreground-muted">{item.date}</td>
                                            <td className="px-6 py-4 text-foreground-muted">{item.time}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${item.status === 'SCHEDULED'
                                                    ? 'border-primary/20 bg-primary/10 text-primary'
                                                    : item.status === 'COMPLETED'
                                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                                        : 'border-red-500/20 bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-foreground-muted outline-none transition-colors hover:bg-border hover:text-foreground focus:ring-2 focus:ring-primary/50">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32 font-sans">
                                                        <DropdownMenuItem onClick={() => startEditing(item)} className="cursor-pointer">
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500">
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    )
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <h2 className="text-xl font-semibold text-foreground">New Appointment</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-foreground-muted transition-colors hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">Client Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-sans focus:border-primary focus:outline-none"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-sans focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-sans focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-border hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Save Appointment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
