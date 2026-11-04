'use client'

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash, X } from "lucide-react"
import { apiFetch } from "@/lib/api"

type Expense = { id: string; description: string; category: string; amount: number; date: string }

export const CATEGORIES: Record<string, string> = {
    RENT: "Rent",
    SALARIES: "Salaries",
    SUPPLIES: "Supplies",
    MARKETING: "Marketing",
    UTILITIES: "Utilities",
    TAXES: "Taxes",
    OTHER: "Other",
}

const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

const today = () => new Date().toISOString().slice(0, 10)

export default function ExpensesCard({ money, onChange }: { money: (v: number) => string; onChange: () => void }) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({ description: "", category: "OTHER", amount: "", date: today() })
    const [toDelete, setToDelete] = useState<Expense | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch("/api/v1/expenses")
                if (res.ok) setExpenses(await res.json())
                else toast.error("Failed to load expenses.")
            } catch {
                toast.error("Unexpected error.")
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        const amount = Number(form.amount.replace(",", "."))
        if (!form.description.trim()) return toast.error("Description is required.")
        if (!amount || amount <= 0) return toast.error("Enter an amount greater than zero.")

        setIsSaving(true)
        try {
            const res = await apiFetch("/api/v1/expenses", {
                method: "POST",
                body: JSON.stringify({ ...form, amount }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(typeof data.detail === "string" ? data.detail : "Failed to add expense.")
                return
            }
            setExpenses(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
            setForm({ description: "", category: form.category, amount: "", date: form.date })
            setFormOpen(false)
            toast.success("Expense added.")
            onChange()
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete(expense: Expense) {
        setToDelete(null)
        try {
            const res = await apiFetch(`/api/v1/expenses/${expense.id}`, { method: "DELETE" })
            if (!res.ok) {
                toast.error("Failed to delete expense.")
                return
            }
            setExpenses(prev => prev.filter(x => x.id !== expense.id))
            toast.success("Expense deleted.")
            onChange()
        } catch {
            toast.error("Unexpected error.")
        }
    }

    return (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <header className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">Expenses</h2>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                        Register your costs so Bizly can calculate your profit.
                    </p>
                </div>
                <button
                    onClick={() => setFormOpen(v => !v)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover active:scale-95 cursor-pointer"
                >
                    {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {formOpen ? "Close" : "Add expense"}
                </button>
            </header>

            {formOpen && (
                <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-background/50 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                    <input aria-label="Description" placeholder="e.g. Office rent" className={inputClass} required
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <select aria-label="Category" className={inputClass}
                        value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input aria-label="Amount" inputMode="decimal" placeholder="0.00" className={inputClass} required
                        value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    <input aria-label="Date" type="date" className={inputClass} required
                        value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    <button type="submit" disabled={isSaving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </form>
            )}

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-border" />)}
                </div>
            ) : expenses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-background/50 py-8 text-center text-sm text-foreground-muted">
                    No expenses yet. Without them, profit equals revenue.
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
                            {expenses.map(x => (
                                <tr key={x.id} className="hover:bg-background/50">
                                    <td className="py-2 pr-2 tabular-nums text-foreground-muted">{x.date}</td>
                                    <td className="py-2 pr-2 text-foreground">{x.description}</td>
                                    <td className="py-2 pr-2 text-foreground-muted">{CATEGORIES[x.category] ?? x.category}</td>
                                    <td className="py-2 pr-2 text-right font-medium tabular-nums text-foreground">{money(x.amount)}</td>
                                    <td className="py-2 text-right">
                                        <button onClick={() => setToDelete(x)} aria-label={`Delete ${x.description}`}
                                            className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer">
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
