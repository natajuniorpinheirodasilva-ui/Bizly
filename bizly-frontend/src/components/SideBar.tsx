import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Calendar, Settings, X } from "lucide-react"

type SidebarProps = {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Schedule", href: "/dashboard/schedule", icon: Calendar },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname()

    return (
        <>
            {/* mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* sidebar component */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:flex lg:translate-x-0 ${isOpen ? "translate-x-0 flex" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border">
                    <Link href="/dashboard" className="text-xl font-bold tracking-tight text-foreground">
                        Biz<span className="text-primary">ly</span>
                    </Link>

                    <button
                        className="lg:hidden text-foreground-muted hover:text-foreground"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-foreground-muted"}`} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </aside>
        </>
    )
}