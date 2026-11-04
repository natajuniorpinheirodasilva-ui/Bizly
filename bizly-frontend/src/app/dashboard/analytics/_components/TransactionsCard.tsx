'use client'

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDownRight, ArrowUpRight, Plus, Trash, X } from "lucide-react"
import { apiFetch } from "@/lib/api"

type Kind = "income" | "expense"
type Entry = { id: string; kind: Kind; description: string; category: string; amount: number; date: string }

const CATEGORIES: Record<Kind, Record<string, string>> = {
    income: {
        SERVICES: "Services",
        PRODUCTS: "Product sales",
        SUBSCRIPTIONS: "Subscriptions",
        OTHER: "Other",
    },
    expense: {
        RENT: "Rent",
        SALARIES: "Salaries",
        SUPPLIES: "Supplies",
        MARKETING: "Marketing",
        UTILITIES: "Utilities",
        TAXES: "Taxes",
        OTHER: "Other",
    },
}

const ENDPOINT: Record<Kind, string> = { income: "/api/v1/incomes", expense: "/api/v1/expenses" }

const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

const today = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function TransactionsCard({ money, onChange }: { money: (v: number) => string; onChange: () => void }) {
    const [entries, setEntries] = useState<Entry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | Kind>("all")

    const [formOpen, setFormOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({ kind: "income" as Kind, description: "", category: "SERVICES", amount: "", date: today() })
    const [toDelete, setToDelete] = useState<Entry | null>(null)

    useEffect(() => {
        let ignore = false
        async function load() {
            try {
                const [inc, exp] = await Promise.all([apiFetch(ENDPOINT.income), apiFetch(ENDPOINT.expense)])
                if (ignore) return
                if (!inc.ok || !exp.ok) {
                    toast.error("Failed to load income and expenses.")
                    return
                }
                const incomes: Omit<Entry, "kind">[] = await inc.json()
                const expenses: Omit<Entry, "kind">[] = await exp.json()
                if (ignore) return
                setEntries([
                    ...incomes.map(e => ({ ...e, kind: "income" as const })),
                    ...expenses.map(e => ({ ...e, kind: "expense" as const })),
                ].sort((a, b) => b.date.localeCompare(a.date)))
            } catch {
                if (!ignore) toast.error("Unexpected error.")
            } finally {
                if (!ignore) setIsLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [])

    const visible = useMemo(() => (filter === "all" ? entries : entries.filter(e => e.kind === filter)), [entries, filter])

    function setKind(kind: Kind) {
        setForm(f => ({ ...f, kind, category: Object.keys(CATEGORIES[kind])[0] }))
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        const amount = Number(form.amount.replace(",", "."))
        if (!form.description.trim()) return toast.error("Description is required.")
        if (!amount || amount <= 0) return toast.error("Enter an amount greater than zero.")

        setIsSaving(true)
        try {
            const res = await apiFetch(ENDPOINT[form.kind], {
                method: "POST",
                body: JSON.stringify({ description: form.description, category: form.category, amount, date: form.date }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(typeof data.detail === "string" ? data.detail : "Failed to save.")
                return
            }
            setEntries(prev => [{ ...data, kind: form.kind }, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
            setForm(f => ({ ...f, description: "", amount: "" }))
            toast.success(form.kind === "income" ? "Income added." : "Expense added.")
            onChange()
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete(entry: Entry) {
        setToDelete(null)
        try {
            const res = await apiFetch(`${ENDPOINT[entry.kind]}/${entry.id}`, { method: "DELETE" })
            if (!res.ok) {
                toast.error("Failed to delete.")
                return
            }
            setEntries(prev => prev.filter(x => !(x.id === entry.id && x.kind === entry.kind)))
            toast.success("Deleted.")
            onChange()
        } catch {
            toast.error("Unexpected error.")
        }
    }

    return (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">Income & expenses</h2>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                        Register money that doesn&apos;t come from the schedule (product sales, one-off jobs) and your costs.
                        Profit = completed appointments + income − expenses.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div role="radiogroup" aria-label="Filter" className="flex rounded-lg bg-background p-1">
                        {(["all", "income", "expense"] as const).map(f => (
                            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${filter === f ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"}`}>
                                {f === "expense" ? "Expenses" : f}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setFormOpen(v => !v)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover active:scale-95 cursor-pointer"
                    >
                        {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {formOpen ? "Close" : "Add entry"}
                    </button>
                </div>
            </header>

            {formOpen && (
                <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-xl border border-border bg-background/50 p-3">
                    <div role="radiogroup" aria-label="Type" className="inline-flex rounded-lg border border-border bg-surface p-1">
                        {(["income", "expense"] as const).map(k => (
                            <button key={k} type="button" role="radio" aria-checked={form.kind === k} onClick={() => setKind(k)}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${form.kind === k ? "bg-primary text-white" : "text-foreground-muted hover:text-foreground"}`}>
                                {k === "income" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                {k === "income" ? "Income" : "Expense"}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                        <input aria-label="Description" required className={inputClass}
                            placeholder={form.kind === "income" ? "e.g. Shampoo sales" : "e.g. Office rent"}
                            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <select aria-label="Category" className={inputClass}
                            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            {Object.entries(CATEGORIES[form.kind]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input aria-label="Amount" inputMode="decimal" placeholder="0.00" required className={inputClass}
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                        <input aria-label="Date" type="date" required className={inputClass}
                            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        <button type="submit" disabled={isSaving}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-border" />)}
                </div>
            ) : visible.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-background/50 py-8 text-center text-sm text-foreground-muted">
                    Nothing registered yet.
                </p>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-surface">
                            <tr className="border-b border-border text-xs">
                                <th className="py-2 pr-2 font-medium text-foreground-muted">Date</th>
                                <th className="py-2 pr-2 font-medium text-foreground-muted">Description</th>
                                <th className="py-2 pr-2 font-medium text-foreground-muted">Category</th>
                                <th className="py-2 pr-2 text-right font-medium text-foreground-muted">Amount</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {visible.map(x => {
                                const isIncome = x.kind === "income"
                                const Icon = isIncome ? ArrowUpRight : ArrowDownRight
                                return (
                                    <tr key={`${x.kind}-${x.id}`} className="hover:bg-background/50">
                                        <td className="py-2 pr-2 tabular-nums text-foreground-muted">{x.date}</td>
                                        <td className="py-2 pr-2 text-foreground">{x.description}</td>
                                        <td className="py-2 pr-2 text-foreground-muted">
                                            {isIncome ? "Income" : "Expense"} · {CATEGORIES[x.kind][x.category] ?? x.category}
                                        </td>
                                        <td className="py-2 pr-2 text-right font-medium tabular-nums text-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Icon aria-hidden className="h-3.5 w-3.5"
                                                    style={{ color: isIncome ? "var(--success-text)" : "var(--chart-negative)" }} />
                                                {isIncome ? "+" : "−"}{money(x.amount)}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right">
                                            <button onClick={() => setToDelete(x)} aria-label={`Delete ${x.description}`}
                                                className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer">
                                                <Trash className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {toDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-foreground">Delete &ldquo;{toDelete.description}&rdquo;?</h3>
                        <p className="mt-2 text-sm text-foreground-muted">This action cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setToDelete(null)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(toDelete)}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 cursor-pointer">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
