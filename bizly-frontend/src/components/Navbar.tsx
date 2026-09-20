'use client'

import { useState } from "react"
import Link from "next/link"

type item = {
    name: string;
    links: string[];
}

const navItems: item[] = [
    { name: "Learn", links: ["Blog", "Tutorials", "Documentation"] },
    { name: "Integrations", links: ["Google Calendar", "Stripe", "Zoom"] },
    { name: "Features", links: ["Scheduling", "Multi-Tenant", "Notifications"] },
    { name: "Industries", links: ["Salons", "Consulting", "Fitness"] },
    { name: "Pricing", links: ["Plans", "Enterprise", "Compare"] },
]

export default function Navbar() {
    const [activeMenu, setActiveMenu] = useState<string | null>(null)

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-navbar text-navbar-foreground">
            <div className="flex items-center justify-between px-6 py-3">
                <p className="text-xl font-semibold tracking-tight cursor-default">
                    Biz<span className="text-primary">ly</span>
                </p>

                <div className="flex gap-2 text-white/80 *:hover:text-white *:cursor-pointer">
                    {navItems.map((item) => (
                        <div
                            key={item.name}
                            className="relative"
                        >
                            <button
                                onClick={() => setActiveMenu(activeMenu === item.name ? null : item.name)}
                                className={`flex items-center gap-1.5 transition-colors hover:text-white ${activeMenu === item.name ? "text-white" : ""}`}
                            >
                                {item.name}

                                <span className={`text-xs transition-transform ${activeMenu === item.name ? "rotate-180" : ""}`}>
                                    ▼
                                </span>
                            </button>

                            {activeMenu === item.name && (
                                <div className="absolute top-full left-0 mt-4 w-48 rounded-xl border border-white/10 bg-navbar p-2 shadow-xl">
                                    {item.links.map((linkName) => (
                                        <Link
                                            key={linkName}
                                            href="#"
                                            onClick={() => setActiveMenu(null)}
                                            className="block rounded-lg px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                        >
                                            {linkName}
                                        </Link>

                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-6">
                    <Link
                        href="/login"
                        className="cursor-pointer text-navbar-muted transition-colors hover:text-navbar-foreground"
                    >
                        Login
                    </Link>

                    <Link
                        href="/register"
                        className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover"
                    >
                        Get to Know
                    </Link>
                </div>
            </div>
        </nav>
    )
}