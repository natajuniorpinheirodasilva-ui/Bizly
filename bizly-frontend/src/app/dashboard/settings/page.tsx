'use client'

import { useState } from "react"
import { Building2, Clock, Briefcase, UserCircle } from "lucide-react"
import BusinessTab from "./_components/BusinessTab"
import HoursTab from "./_components/HoursTab"
import ServicesTab from "./_components/ServicesTab"
import AccountTab from "./_components/AccountTab"

const TABS = [
    { id: "business", label: "Business", icon: Building2, component: BusinessTab },
    { id: "hours", label: "Business Hours", icon: Clock, component: HoursTab },
    { id: "services", label: "Services", icon: Briefcase, component: ServicesTab },
    { id: "account", label: "Account", icon: UserCircle, component: AccountTab },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function Settings() {
    const [activeTab, setActiveTab] = useState<TabId>("business")
    const ActiveComponent = TABS.find(t => t.id === activeTab)!.component

    return (
        <main className="space-y-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Settings
                    </h1>

                    <p className="mt-1 text-sm text-foreground-muted">
                        Manage your business, services and account preferences.
                    </p>
                </div>
            </section>

            <nav
                role="tablist"
                aria-label="Settings sections"
                className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 shadow-sm"
            >
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={activeTab === id}
                        onClick={() => setActiveTab(id)}
                        className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${activeTab === id
                            ? "bg-primary text-white"
                            : "text-foreground-muted hover:bg-background hover:text-foreground"
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </nav>

            <ActiveComponent />
        </main>
    )
}
