'use client'

import { useEffect, useState } from "react"
import { Search, Plus, MoreHorizontal, X } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Client = {
    id: string
    name: string
    email: string
    phone: string
    status: string
    created_at: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [searchQuery, setSearchQuery] = useState("")

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: ""
    })

    const [editColumn, setEditColumn] = useState<string | null>(null)

    useEffect(() => {
        async function fetchClients() {
            try {
                const res = await apiFetch("/api/v1/clients")
                if (!res.ok) {
                    toast.error("failed to fetch clients")
                    return
                }
                const data = await res.json()
                setClients(data)
            } catch (err: any) {
                toast.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchClients()
    }, [])

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function handleAddClient(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const res = await apiFetch("/api/v1/clients", {
                method: "POST",
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.detail || "Failed to create client")
                return
            }

            setClients([data, ...clients])
            setFormData({ name: "", email: "", phone: "" })
            setIsModalOpen(false)
            toast.success("Client created successfully!")
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Clients
                    </h1>

                    <p className="mt-1 text-sm text-foreground-muted">
                        Manage your clients and their information.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Add Client
                </button>
            </div>

            {/* toolbar & search */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-2 shadow-sm">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-foreground-muted" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clients..."
                        className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* clients table */}
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-background/50">
                            <tr>
                                <th className="px-6 py-4 font-medium text-foreground-muted">
                                    Name
                                </th>

                                <th className="px-6 py-4 font-medium text-foreground-muted">
                                    Contact
                                </th>

                                <th className="px-6 py-4 font-medium text-foreground-muted">
                                    Status
                                </th>

                                <th className="px-6 py-4 font-medium text-foreground-muted">
                                    Added
                                </th>

                                <th className="px-6 py-4 text-right font-medium text-foreground-muted">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                // loading skeleton
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-4 w-40 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-6 w-16 rounded-full bg-border" />
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="h-4 w-24 rounded bg-border" />
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="ml-auto h-8 w-8 rounded bg-border" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredClients.length === 0 ? (
                                // empty state
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-foreground-muted">
                                        {searchQuery ? "No clients match your search." : "No clients found. Click 'Add Client' to get started."}
                                    </td>
                                </tr>
                            ) : (
                                // actual data
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="transition-colors hover:bg-background/50">
                                        <td className="px-6 py-4 font-medium capitalize text-foreground">
                                            {client.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-foreground">{client.email}</span>
                                                <span className="mt-0.5 text-xs text-foreground-muted">{client.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${client.status === 'active'
                                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                                : 'border-border bg-zinc-500/10 text-foreground-muted'
                                                }`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-foreground-muted">
                                            {client.created_at}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground outline-none focus:ring-2 focus:ring-primary/50">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* add client modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <h2 className="text-xl font-semibold text-foreground">Add New Client</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-foreground-muted transition-colors hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddClient} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                                        Company Name
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="contact@acme.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground">
                                        Phone Number
                                    </label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="+1 555-0000"
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
                                    {isSubmitting ? "Saving..." : "Save Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}