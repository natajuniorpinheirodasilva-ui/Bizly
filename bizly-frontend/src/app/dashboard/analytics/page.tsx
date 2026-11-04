'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { makeFormatters } from "./_components/format"
import {
    RevenueExpensesChart, ProfitChart, ActivityChart, ServicesChart, PeakHoursHeatmap,
    type Monthly, type PeakCell, type ServiceStat,
} from "./_components/charts"
import ExpensesCard from "./_components/ExpensesCard"

type Analytics = {
    currency: string
    months: number
    totals: {
        revenue: number
        expenses: number
        profit: number
        appointments: number
        cancelled: number
        clients: number
        newClients: number
        services: number
    }
    monthly: Monthly[]
    peakHours: PeakCell[]
    byService: ServiceStat[]
}

const PERIODS = [3, 6, 12] as const
type Period = (typeof PERIODS)[number]

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm text-foreground-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            {detail && <p className="mt-1 text-xs text-foreground-muted">{detail}</p>}
        </div>
    )
}

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<Period>(6)
    const [data, setData] = useState<Analytics | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [forbidden, setForbidden] = useState(false)

    // bumped by the expenses card so the charts refresh after a change
    const [reloadKey, setReloadKey] = useState(0)
    const reload = useCallback(() => setReloadKey(k => k + 1), [])

    useEffect(() => {
        let ignore = false
        async function fetchAnalytics() {
            try {
                const res = await apiFetch(`/api/v1/analytics?months=${period}`)
                if (ignore) return
                if (res.status === 403) {
                    setForbidden(true)
                    return
                }
                if (!res.ok) {
                    toast.error("Failed to load analytics.")
                    return
                }
                const json = await res.json()
                if (!ignore) setData(json)
            } catch {
                if (!ignore) toast.error("Unexpected error.")
            } finally {
                if (!ignore) setIsLoading(false)
            }
        }
        fetchAnalytics()
        return () => { ignore = true }
    }, [period, reloadKey])

    const fmt = useMemo(() => makeFormatters(data?.currency ?? "BRL"), [data?.currency])

    if (forbidden) {
        return (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-foreground-muted">
                Only administrators can see the company analytics.
            </div>
        )
    }

    const t = data?.totals
    const profit = t?.profit ?? 0
    const ProfitIcon = profit > 0 ? TrendingUp : profit < 0 ? TrendingDown : Minus
    const margin = t && t.revenue > 0 ? Math.round((profit / t.revenue) * 100) : null

    return (
        <main className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
                    <p className="mt-1 text-sm text-foreground-muted">
                        See how your business is performing.
                    </p>
                </div>

                <div role="radiogroup" aria-label="Period" className="flex rounded-lg border border-border bg-surface p-1 shadow-sm">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            role="radio"
                            aria-checked={period === p}
                            onClick={() => setPeriod(p)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${period === p
                                ? "bg-primary text-white"
                                : "text-foreground-muted hover:text-foreground"}`}
                        >
                            {p} months
                        </button>
                    ))}
                </div>
            </header>

            {isLoading || !data || !t ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />
                    ))}
                </div>
            ) : (
                <>
                    {/* hero: profit or loss */}
                    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-foreground-muted">
                                <ProfitIcon
                                    aria-hidden
                                    className="h-4 w-4"
                                    style={{ color: profit > 0 ? "var(--success-text)" : profit < 0 ? "var(--chart-negative)" : undefined }}
                                />
                                {profit > 0 ? "Net profit" : profit < 0 ? "Net loss" : "Break-even"} · last {period} months
                            </div>
                            <p className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
                                {fmt.money(profit)}
                            </p>
                            <p className="mt-2 text-sm text-foreground-muted">
                                {margin !== null
                                    ? <>Profit margin <span className="font-medium text-foreground">{margin}%</span></>
                                    : "No revenue in this period yet."}
                            </p>
                        </div>
                        <StatTile label="Revenue" value={fmt.money(t.revenue)} detail="From non-cancelled appointments" />
                        <StatTile label="Expenses" value={fmt.money(t.expenses)} detail="Registered below" />
                    </section>

                    <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        <StatTile
                            label="Appointments"
                            value={fmt.count(t.appointments)}
                            detail={t.cancelled ? `${t.cancelled} cancelled` : "None cancelled"}
                        />
                        <StatTile
                            label="Clients"
                            value={fmt.count(t.clients)}
                            detail={`${t.newClients} new in this period`}
                        />
                        <StatTile label="Services" value={fmt.count(t.services)} detail="In your catalog" />
                    </section>

                    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <RevenueExpensesChart data={data.monthly} fmt={fmt} />
                        <ProfitChart data={data.monthly} fmt={fmt} />
                        <PeakHoursHeatmap data={data.peakHours} />
                        <ActivityChart data={data.monthly} fmt={fmt} />
                        <ServicesChart data={data.byService} fmt={fmt} />
                        <ExpensesCard money={fmt.money} onChange={reload} />
                    </section>
                </>
            )}
        </main>
    )
}
