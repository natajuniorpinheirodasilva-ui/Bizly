'use client'

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Card, Field, inputClass, primaryButtonClass, errorMessage } from "./ui"

type Company = {
    name: string
    email: string
    phone: string
    address: string
    website: string
    taxId: string
    currency: string
    timezone: string
    defaultDuration: number
}

const EMPTY: Company = {
    name: "", email: "", phone: "", address: "", website: "", taxId: "",
    currency: "BRL", timezone: "America/Sao_Paulo", defaultDuration: 60,
}

const CURRENCIES = [
    { value: "BRL", label: "Brazilian Real (R$)" },
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
]

const TIMEZONES = [
    "America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Noronha",
    "America/New_York", "America/Chicago", "America/Los_Angeles",
    "Europe/London", "Europe/Lisbon", "Europe/Madrid", "UTC",
]

const DURATIONS = [15, 30, 45, 60, 90, 120]

export default function BusinessTab() {
    const [form, setForm] = useState<Company>(EMPTY)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch("/api/v1/settings/company")
                if (!res.ok) {
                    toast.error("Failed to load business settings.")
                    return
                }
                const data = await res.json()
                // null -> "" so inputs stay controlled
                setForm({
                    ...EMPTY,
                    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
                })
            } catch {
                toast.error("Unexpected error.")
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    function set<K extends keyof Company>(key: K, value: Company[K]) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error("Business name is required.")
            return
        }

        setIsSaving(true)
        try {
            const res = await apiFetch("/api/v1/settings/company", {
                method: "PUT",
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to save settings."))
                return
            }
            toast.success("Business settings saved.")
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSaving(false)
        }
    }

    const saveButton = (
        <button type="submit" form="business-form" disabled={isSaving || isLoading} className={primaryButtonClass}>
            {isSaving ? "Saving..." : "Save changes"}
        </button>
    )

    return (
        <form id="business-form" onSubmit={handleSave} className="space-y-6">
            <Card title="Business profile" description="How your business appears on reports and to your clients.">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Field label="Business name" htmlFor="biz-name">
                            <input id="biz-name" className={inputClass} disabled={isLoading}
                                value={form.name} onChange={e => set("name", e.target.value)} placeholder="Bizly" />
                        </Field>
                    </div>
                    <Field label="Contact email" htmlFor="biz-email">
                        <input id="biz-email" type="email" className={inputClass} disabled={isLoading}
                            value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@company.com" />
                    </Field>
                    <Field label="Phone" htmlFor="biz-phone">
                        <input id="biz-phone" type="tel" className={inputClass} disabled={isLoading}
                            value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+55 11 99999-0000" />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Address" htmlFor="biz-address">
                            <input id="biz-address" className={inputClass} disabled={isLoading}
                                value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street, number, city - state" />
                        </Field>
                    </div>
                    <Field label="Website" htmlFor="biz-website">
                        <input id="biz-website" className={inputClass} disabled={isLoading}
                            value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://company.com" />
                    </Field>
                    <Field label="Tax ID (CNPJ / CPF)" htmlFor="biz-tax">
                        <input id="biz-tax" className={inputClass} disabled={isLoading}
                            value={form.taxId} onChange={e => set("taxId", e.target.value)} placeholder="00.000.000/0001-00" />
                    </Field>
                </div>
            </Card>

            <Card title="Preferences" description="Regional and scheduling defaults for your business." footer={saveButton}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <Field label="Currency" htmlFor="biz-currency">
                        <select id="biz-currency" className={inputClass} disabled={isLoading}
                            value={form.currency} onChange={e => set("currency", e.target.value)}>
                            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Timezone" htmlFor="biz-tz">
                        <select id="biz-tz" className={inputClass} disabled={isLoading}
                            value={form.timezone} onChange={e => set("timezone", e.target.value)}>
                            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
                        </select>
                    </Field>
                    <Field label="Default appointment length" htmlFor="biz-duration" hint="Used when creating new appointments.">
                        <select id="biz-duration" className={inputClass} disabled={isLoading}
                            value={form.defaultDuration} onChange={e => set("defaultDuration", Number(e.target.value))}>
                            {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                    </Field>
                </div>
            </Card>
        </form>
    )
}
