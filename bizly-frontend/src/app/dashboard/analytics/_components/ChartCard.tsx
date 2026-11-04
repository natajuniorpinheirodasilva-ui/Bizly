'use client'

import { ReactNode, useState } from "react"
import { Table2, BarChart3 } from "lucide-react"

export type LegendItem = { label: string; color: string; shape?: "square" | "line" }

export type TableData = {
    columns: string[]
    rows: (string | number)[][]
}

export function Legend({ items }: { items: LegendItem[] }) {
    return (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {items.map(item => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <span
                        aria-hidden
                        className={item.shape === "line" ? "h-0.5 w-3 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
                        style={{ background: item.color }}
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    )
}

export default function ChartCard({ title, subtitle, legend, table, children, className = "" }: {
    title: string
    subtitle?: string
    legend?: LegendItem[]
    table?: TableData
    children: ReactNode
    className?: string
}) {
    const [showTable, setShowTable] = useState(false)

    return (
        <section className={`flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
            <header className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-foreground-muted">{subtitle}</p>}
                    {legend && legend.length > 1 && <div className="mt-2"><Legend items={legend} /></div>}
                </div>
                {table && (
                    <button
                        onClick={() => setShowTable(v => !v)}
                        aria-label={showTable ? "Show chart" : "Show as table"}
                        title={showTable ? "Show chart" : "Show as table"}
                        className="shrink-0 rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-background hover:text-foreground cursor-pointer"
                    >
                        {showTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
                    </button>
                )}
            </header>

            {showTable && table ? (
                <div className="max-h-72 overflow-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-surface">
                            <tr className="border-b border-border">
                                {table.columns.map(c => (
                                    <th key={c} className="px-2 py-2 font-medium text-foreground-muted">{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {table.rows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j} className={`px-2 py-1.5 text-foreground ${j > 0 ? "tabular-nums" : ""}`}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex-1">{children}</div>
            )}
        </section>
    )
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: {
    active?: boolean
    payload?: { name: string; value: number; color?: string; fill?: string; dataKey?: string }[]
    label?: string
    labelFormatter?: (label: string) => string
    valueFormatter: (value: number, dataKey?: string) => string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
            {label !== undefined && (
                <p className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>
            )}
            <ul className="space-y-0.5">
                {payload.map(p => (
                    <li key={p.dataKey ?? p.name} className="flex items-center gap-2">
                        <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: p.color ?? p.fill }} />
                        <span className="text-foreground-muted">{p.name}</span>
                        <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
                            {valueFormatter(p.value, p.dataKey)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function EmptyChart({ message }: { message: string }) {
    return (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background/50">
            <p className="px-6 text-center text-sm text-foreground-muted">{message}</p>
        </div>
    )
}
