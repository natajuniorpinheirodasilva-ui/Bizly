'use client'

import { useMemo, useState } from "react"
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts"
import ChartCard, { ChartTooltip, EmptyChart } from "./ChartCard"
import { makeFormatters, monthLabel, DAY_LABELS } from "./format"

export type Monthly = {
    month: string
    revenue: number
    expenses: number
    profit: number
    appointments: number
    newClients: number
}
export type PeakCell = { dayOfWeek: number; hour: number; count: number }
export type ServiceStat = { name: string; appointments: number; revenue: number }

type Fmt = ReturnType<typeof makeFormatters>

const AXIS_TICK = { fill: "var(--foreground-muted)", fontSize: 11 }
const GRID = { stroke: "var(--chart-grid)", strokeWidth: 1, vertical: false }
const CHART_HEIGHT = 260

/* Bar with a 4px rounded data-end and a square baseline, for both positive and negative values. */
type BarShapeProps = {
    x?: number
    y?: number
    width?: number
    height?: number
    fill?: string
    value?: number | [number, number]
}

function DataEndBar(props: BarShapeProps) {
    const { x = 0, y = 0, width, height, fill } = props
    if (!width || !height) return null
    const top = Math.min(y, y + height)
    const h = Math.abs(height)
    const r = Math.min(4, h, width / 2)
    // recharts may pass value as a number or as [base, value]
    const raw = Array.isArray(props.value) ? props.value[1] - props.value[0] : props.value
    const positive = (raw ?? 0) >= 0
    const path = positive
        ? `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${top + h} Z`
        : `M${x},${top} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + width - r} Q${x + width},${top + h} ${x + width},${top + h - r} V${top} Z`
    return <path d={path} fill={fill} />
}

/* ---------- revenue vs expenses (grouped columns) ---------- */

export function RevenueExpensesChart({ data, fmt }: { data: Monthly[]; fmt: Fmt }) {
    const empty = data.every(d => d.revenue === 0 && d.expenses === 0)
    return (
        <ChartCard
            title="Revenue vs expenses"
            subtitle="Per month · completed appointments + other income"
            legend={[
                { label: "Revenue", color: "var(--chart-1)" },
                { label: "Expenses", color: "var(--chart-2)" },
            ]}
            table={{
                columns: ["Month", "Revenue", "Expenses"],
                rows: data.map(d => [monthLabel(d.month), fmt.money(d.revenue), fmt.money(d.expenses)]),
            }}
        >
            {empty ? <EmptyChart message="No revenue or expenses in this period yet." /> : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart data={data} barGap={2} barCategoryGap="25%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                        <YAxis tickFormatter={fmt.moneyAxis} tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
                        <Tooltip
                            cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
                            content={<ChartTooltip labelFormatter={monthLabel} valueFormatter={fmt.money} />}
                        />
                        <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" maxBarSize={24} shape={<DataEndBar />} />
                        <Bar dataKey="expenses" name="Expenses" fill="var(--chart-2)" maxBarSize={24} shape={<DataEndBar />} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    )
}

/* ---------- net profit (diverging columns) ---------- */

export function ProfitChart({ data, fmt }: { data: Monthly[]; fmt: Fmt }) {
    const empty = data.every(d => d.profit === 0)
    const hasLoss = data.some(d => d.profit < 0)
    return (
        <ChartCard
            title="Net profit"
            subtitle="Revenue minus expenses, per month"
            legend={hasLoss ? [
                { label: "Profit", color: "var(--chart-1)" },
                { label: "Loss", color: "var(--chart-negative)" },
            ] : undefined}
            table={{
                columns: ["Month", "Profit / loss"],
                rows: data.map(d => [monthLabel(d.month), fmt.money(d.profit)]),
            }}
        >
            {empty ? <EmptyChart message="Add appointments and expenses to see your profit." /> : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={fmt.moneyAxis} tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
                        <ReferenceLine y={0} stroke="var(--chart-axis)" />
                        <Tooltip
                            cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
                            content={<ChartTooltip labelFormatter={monthLabel} valueFormatter={fmt.money} />}
                        />
                        <Bar dataKey="profit" name="Profit / loss" maxBarSize={24} shape={<DataEndBar />}>
                            {data.map(d => (
                                <Cell key={d.month} fill={d.profit < 0 ? "var(--chart-negative)" : "var(--chart-1)"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    )
}

/* ---------- appointments & new clients (lines) ---------- */

export function ActivityChart({ data, fmt }: { data: Monthly[]; fmt: Fmt }) {
    const empty = data.every(d => d.appointments === 0 && d.newClients === 0)
    return (
        <ChartCard
            title="Appointments & new clients"
            subtitle="Per month"
            legend={[
                { label: "Appointments", color: "var(--chart-1)", shape: "line" },
                { label: "New clients", color: "var(--chart-2)", shape: "line" },
            ]}
            table={{
                columns: ["Month", "Appointments", "New clients"],
                rows: data.map(d => [monthLabel(d.month), d.appointments, d.newClients]),
            }}
        >
            {empty ? <EmptyChart message="No appointments or new clients in this period yet." /> : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
                        <Tooltip
                            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
                            content={<ChartTooltip labelFormatter={monthLabel} valueFormatter={fmt.count} />}
                        />
                        {[
                            { key: "appointments", name: "Appointments", color: "var(--chart-1)" },
                            { key: "newClients", name: "New clients", color: "var(--chart-2)" },
                        ].map(s => (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={false}
                                activeDot={{ r: 5, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    )
}

/* ---------- appointments by service (horizontal bars) ---------- */

const MAX_SERVICES = 7

export function ServicesChart({ data, fmt }: { data: ServiceStat[]; fmt: Fmt }) {
    // fold the long tail into "Other" instead of growing the chart forever
    const rows = useMemo(() => {
        if (data.length <= MAX_SERVICES) return data
        const head = data.slice(0, MAX_SERVICES - 1)
        const tail = data.slice(MAX_SERVICES - 1)
        return [...head, {
            name: `Other (${tail.length})`,
            appointments: tail.reduce((s, t) => s + t.appointments, 0),
            revenue: tail.reduce((s, t) => s + t.revenue, 0),
        }]
    }, [data])

    const max = Math.max(1, ...rows.map(r => r.appointments))

    return (
        <ChartCard
            title="Most booked services"
            subtitle="Appointments per service in this period"
            table={{
                columns: ["Service", "Appointments", "Revenue"],
                rows: data.map(s => [s.name, s.appointments, fmt.money(s.revenue)]),
            }}
        >
            {rows.length === 0 ? <EmptyChart message="No appointments in this period yet." /> : (
                <ul className="space-y-3">
                    {rows.map(s => (
                        <li key={s.name} className="group" title={`${s.name}: ${s.appointments} appointments · ${fmt.money(s.revenue)}`}>
                            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                                <span className="truncate text-foreground">{s.name}</span>
                                <span className="shrink-0 tabular-nums text-foreground-muted">
                                    <span className="font-medium text-foreground">{fmt.count(s.appointments)}</span>
                                    {" · "}{fmt.money(s.revenue)}
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-surface-muted/60">
                                <div
                                    className="h-2 rounded-full transition-opacity group-hover:opacity-80"
                                    style={{ width: `${(s.appointments / max) * 100}%`, background: "var(--chart-1)" }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </ChartCard>
    )
}

/* ---------- peak hours (heatmap, sequential blue) ---------- */

// Monday first
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function PeakHoursHeatmap({ data }: { data: PeakCell[] }) {
    const [hover, setHover] = useState<PeakCell | null>(null)

    const { grid, hours, max, busiest } = useMemo(() => {
        const grid = new Map(data.map(c => [`${c.dayOfWeek}-${c.hour}`, c.count]))
        const used = data.map(c => c.hour)
        const from = used.length ? Math.min(8, ...used) : 8
        const to = used.length ? Math.max(18, ...used) : 18
        const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
        const max = Math.max(0, ...data.map(c => c.count))
        const busiest = data.reduce<PeakCell | null>((b, c) => (!b || c.count > b.count ? c : b), null)
        return { grid, hours, max, busiest }
    }, [data])

    const pad = (h: number) => `${String(h).padStart(2, "0")}:00`
    const shade = (count: number) =>
        count === 0
            ? "var(--surface-muted)"
            // one hue, light -> dark with magnitude
            : `color-mix(in oklab, var(--chart-1) ${Math.round(20 + (count / max) * 80)}%, var(--surface-muted))`

    return (
        <ChartCard
            title="Peak hours"
            subtitle={busiest ? `Busiest slot: ${DAY_LABELS[busiest.dayOfWeek]} at ${pad(busiest.hour)}` : "When your appointments happen"}
            table={{
                columns: ["Day", "Hour", "Appointments"],
                rows: [...data].sort((a, b) => b.count - a.count).map(c => [DAY_LABELS[c.dayOfWeek], pad(c.hour), c.count]),
            }}
        >
            {data.length === 0 ? <EmptyChart message="Peak hours will show up once you have appointments." /> : (
                <div className="overflow-x-auto">
                    <div
                        className="grid min-w-[520px] gap-[2px]"
                        style={{ gridTemplateColumns: `36px repeat(${hours.length}, minmax(0, 1fr))` }}
                        onMouseLeave={() => setHover(null)}
                    >
                        <span />
                        {hours.map(h => (
                            <span key={h} className="pb-1 text-center text-[10px] tabular-nums text-foreground-muted">
                                {h % 2 === 0 ? h : ""}
                            </span>
                        ))}

                        {DAY_ORDER.map(day => (
                            <div key={day} className="contents">
                                <span className="flex items-center text-[11px] text-foreground-muted">{DAY_LABELS[day]}</span>
                                {hours.map(hour => {
                                    const count = grid.get(`${day}-${hour}`) ?? 0
                                    const isHover = hover?.dayOfWeek === day && hover?.hour === hour
                                    return (
                                        <div
                                            key={hour}
                                            role="img"
                                            aria-label={`${DAY_LABELS[day]} ${pad(hour)}: ${count} appointments`}
                                            onMouseEnter={() => setHover({ dayOfWeek: day, hour, count })}
                                            className={`h-7 rounded-[3px] ${isHover ? "ring-2 ring-foreground/60" : ""}`}
                                            style={{ background: shade(count) }}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4 text-xs text-foreground-muted">
                        <span className="min-h-4 tabular-nums">
                            {hover
                                ? <><span className="font-medium text-foreground">{DAY_LABELS[hover.dayOfWeek]} {pad(hover.hour)}</span> · {hover.count} appointment{hover.count === 1 ? "" : "s"}</>
                                : "Hover a cell for details"}
                        </span>
                        <span className="flex items-center gap-2">
                            Fewer
                            <span
                                aria-hidden
                                className="h-2 w-20 rounded-full"
                                style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--chart-1) 20%, var(--surface-muted)), var(--chart-1))" }}
                            />
                            More
                        </span>
                    </div>
                </div>
            )}
        </ChartCard>
    )
}
