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

export default function DashboardHome() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await apiFetch("/api/v1/dashboard/stats")

                if (!res.ok) {
                    toast.error("Data error")
                    return
                }

                const data = await res.json()
                setStats(data)
            } catch (error) {
                console.error(error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStats()
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

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm min-h-100">
                <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/50 py-20">
                    <p className="text-sm text-foreground-muted">Recent appointments will appear here.</p>
                </div>
            </div>
        </div>
    )
}