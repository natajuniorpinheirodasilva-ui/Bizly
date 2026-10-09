'use client'

import { useEffect, useState } from "react"
import { Users, Calendar, TrendingUp } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

type Stats = {
    total_clients: number
    total_appointments: number
    total_revenue: number
}

type Appointment = {
    id: string
    clientName: string
    date: string
    time: string
    status: string
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const [statsRes, appointmentsRes] = await Promise.all([
                    apiFetch("/api/v1/dashboard/stats"),
                    apiFetch("/api/v1/appointments")
                ])

                if (statsRes.ok) {
                    const statsData = await statsRes.json()
                    setStats(statsData)
                }

                if (appointmentsRes.ok) {
                    const appointmentsData = await appointmentsRes.json()
                    setAppointments(appointmentsData.slice(0, 5))
                }
            } catch (error) {
                console.error(error)
                toast.error("Error loading dashboard data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchDashboardData()
    }, [])

    const statCards = [
        {
            label: "Total Clients",
            value: stats ? (stats.total_clients || 0) : "—",
            icon: Users,
        },
        {
            label: "Appointments",
            value: stats ? (stats.total_appointments || 0) : "—",
            icon: Calendar,
        },
        {
            label: "Revenue",
            value: stats ? `$${(stats.total_revenue || 0).toFixed(2)}` : "—",
            icon: TrendingUp,
        },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                <p className="text-foreground-muted mt-1">Here is what's happening with your business today.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                <card.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground-muted">{card.label}</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {isLoading ? <span className="animate-pulse">...</span> : card.value}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
                {isLoading ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-background/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Client
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Date
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Time
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3">
                                            <div className="h-4 w-28 rounded bg-border" />
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="h-4 w-20 rounded bg-border" />
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="h-4 w-12 rounded bg-border" />
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="h-5 w-16 rounded-full bg-border" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/50 py-12">
                        <p className="text-sm text-foreground-muted">Recent appointments will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-background/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Client
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Date
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Time
                                    </th>

                                    <th className="px-4 py-3 font-medium text-foreground-muted">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {appointments.map((item) => (
                                    <tr key={item.id} className="transition-colors hover:bg-background/50">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {item.clientName}
                                        </td>

                                        <td className="px-4 py-3 text-foreground-muted">
                                            {item.date}
                                        </td>

                                        <td className="px-4 py-3 text-foreground-muted">
                                            {item.time}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${item.status === 'SCHEDULED'
                                                ? 'border-primary/20 bg-primary/10 text-primary'
                                                : item.status === 'COMPLETED'
                                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                                    : 'border-red-500/20 bg-red-500/10 text-red-500'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}