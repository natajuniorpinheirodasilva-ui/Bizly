'use client'

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Edit, Trash, X, Clock } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Card, Field, inputClass, primaryButtonClass, secondaryButtonClass, errorMessage } from "./ui"

type Service = {
    id: string
    name: string
    description: string | null
    duration: number
    price: number
}

type ServiceForm = { name: string; description: string; duration: number; price: string }

const EMPTY_FORM: ServiceForm = { name: "", description: "", duration: 60, price: "0" }

export default function ServicesTab() {
    const [services, setServices] = useState<Service[]>([])
    const [currency, setCurrency] = useState("BRL")
    const [isLoading, setIsLoading] = useState(true)

    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
    const [isSaving, setIsSaving] = useState(false)

    const [toDelete, setToDelete] = useState<Service | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const [servicesRes, companyRes] = await Promise.all([
                    apiFetch("/api/v1/services"),
                    apiFetch("/api/v1/settings/company"),
                ])
                if (!servicesRes.ok) {
                    toast.error("Failed to load services.")
                    return
                }
                setServices(await servicesRes.json())
                if (companyRes.ok) setCurrency((await companyRes.json()).currency)
            } catch {
                toast.error("Unexpected error.")
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const formatPrice = (value: number) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value)

    function openCreate() {
        setEditingId(null)
        setForm(EMPTY_FORM)
        setModalOpen(true)
    }

    function openEdit(s: Service) {
        setEditingId(s.id)
        setForm({ name: s.name, description: s.description ?? "", duration: s.duration, price: String(s.price) })
        setModalOpen(true)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        const price = Number(form.price.replace(",", "."))
        if (!form.name.trim()) return toast.error("Service name is required.")
        if (Number.isNaN(price) || price < 0) return toast.error("Enter a valid price.")

        setIsSaving(true)
        try {
            const res = await apiFetch(editingId ? `/api/v1/services/${editingId}` : "/api/v1/services", {
                method: editingId ? "PUT" : "POST",
                body: JSON.stringify({ ...form, price }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to save service."))
                return
            }
            setServices(prev =>
                editingId
                    ? prev.map(s => (s.id === editingId ? data : s))
                    : [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
            )
            setModalOpen(false)
            toast.success(editingId ? "Service updated." : "Service created.")
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete(service: Service) {
        setToDelete(null)
        try {
            const res = await apiFetch(`/api/v1/services/${service.id}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to delete service."))
                return
            }
            setServices(prev => prev.filter(s => s.id !== service.id))
            toast.success("Service deleted.")
        } catch {
            toast.error("Unexpected error.")
        }
    }

    return (
        <>
            <Card title="Services" description="The services you offer, with their duration and price.">
                <div className="mb-4 flex justify-end">
                    <button onClick={openCreate} className={`${primaryButtonClass} flex items-center gap-2`}>
                        <Plus className="h-4 w-4" />
                        Add service
                    </button>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg bg-border" />
                        ))}
                    </div>
                ) : services.length === 0 ? (
                    <p className="py-10 text-center text-sm text-foreground-muted">
                        No services yet. Click "Add service" to create your first one.
                    </p>
                ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                        {services.map(s => (
                            <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-foreground">{s.name}</p>
                                    {s.description && (
                                        <p className="truncate text-xs text-foreground-muted">{s.description}</p>
                                    )}
                                </div>
                                <span className="flex items-center gap-1 text-sm text-foreground-muted">
                                    <Clock className="h-3.5 w-3.5" />
                                    {s.duration} min
                                </span>
                                <span className="w-24 text-right text-sm font-medium text-foreground">
                                    {formatPrice(s.price)}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}
                                        className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-border hover:text-foreground cursor-pointer">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setToDelete(s)} aria-label={`Delete ${s.name}`}
                                        className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer">
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {modalOpen && (
                <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <h2 className="text-xl font-semibold text-foreground">
                                {editingId ? "Edit service" : "New service"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} aria-label="Close"
                                className="text-foreground-muted transition-colors hover:text-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            <Field label="Name" htmlFor="svc-name">
                                <input id="svc-name" required className={inputClass} placeholder="Haircut"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </Field>
                            <Field label="Description" htmlFor="svc-desc">
                                <textarea id="svc-desc" rows={2} className={inputClass} placeholder="Optional"
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Duration (min)" htmlFor="svc-duration">
                                    <input id="svc-duration" type="number" min={5} max={480} step={5} required className={inputClass}
                                        value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
                                </Field>
                                <Field label={`Price (${currency})`} htmlFor="svc-price">
                                    <input id="svc-price" inputMode="decimal" required className={inputClass}
                                        value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                                </Field>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setModalOpen(false)} className={secondaryButtonClass}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className={primaryButtonClass}>
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            )}

            {toDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-foreground">Delete "{toDelete.name}"?</h3>
                        <p className="mt-2 text-sm text-foreground-muted">This action cannot be undone.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setToDelete(null)} className={secondaryButtonClass}>
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(toDelete)}
                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 active:scale-95 cursor-pointer">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
