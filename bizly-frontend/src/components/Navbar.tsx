'use client'

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"

type NavLink = {
    label: string
    anchor: string
}

type item = {
    name: string
    links: NavLink[]
}

const navItems: item[] = [
    {
        name: "Product",
        links: [
            { label: "Features", anchor: "features" },
            { label: "How it works", anchor: "how-it-works" },
        ]
    },
    {
        name: "Pricing",
        links: [
            { label: "Plans", anchor: "pricing" },
        ]
    },
    {
        name: "Support",
        links: [
            { label: "FAQ", anchor: "faq" },
        ]
    },
]

export default function Navbar() {
    const router = useRouter()

    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const navRef = useRef<HTMLElement>(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        import("js-cookie").then((Cookies) => {
            const token = Cookies.default.get("bizly_token")
            if (token) setIsLoggedIn(true)
        })

        function handleClickOutside(event: MouseEvent) {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setActiveMenu(null)
                setIsMobileMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    function handleLogout() {
        Cookies.remove("bizly_token")
        router.push("/login")
        router.refresh()
    }

    function scrollToAnchor(anchor: string) {
        setActiveMenu(null)
        setIsMobileMenuOpen(false)
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" })
    }

    return (
        <nav ref={navRef} className="fixed top-0 z-50 w-full border-b border-white/10 bg-navbar text-navbar-foreground">
            <div className="flex items-center justify-between px-6 py-3">
                <Link
                    href="/"
                    className="cursor-pointer text-xl font-semibold tracking-tight"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    Biz<span className="text-primary">ly</span>
                </Link>

                {/* desktop Links */}
                <div className="hidden md:flex gap-2 text-white/80 *:cursor-pointer *:hover:text-white">
                    {!isLoggedIn && navItems.map((item) => (
                        <div key={item.name} className="relative">
                            <button
                                onClick={() => setActiveMenu(activeMenu === item.name ? null : item.name)}
                                className={`flex items-center gap-1.5 cursor-pointer transition-colors hover:text-white ${activeMenu === item.name ? "text-white" : ""}`}
                            >
                                {item.name}
                                <span className={`text-xs transition-transform ${activeMenu === item.name ? "rotate-180" : ""}`}>
                                    ▼
                                </span>
                            </button>

                            {activeMenu === item.name && (
                                <div className="absolute left-0 top-full mt-4 w-48 rounded-xl border border-white/10 bg-navbar p-2 shadow-xl">
                                    {item.links.map((link) => (
                                        <button
                                            key={link.anchor}
                                            onClick={() => scrollToAnchor(link.anchor)}
                                            className="block w-full rounded-lg px-4 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                        >
                                            {link.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* desktop auth buttons */}
                <div className="hidden md:flex items-center gap-6">
                    {isLoggedIn ? (
                        <>
                            <button
                                className="cursor-pointer text-navbar-muted transition-colors hover:text-navbar-foreground"
                                onClick={handleLogout}
                            >
                                Log out
                            </button>
                            <Link
                                href="/dashboard"
                                className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover"
                            >
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="cursor-pointer text-navbar-muted transition-colors hover:text-navbar-foreground"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover"
                            >
                                Get to Know
                            </Link>
                        </>
                    )}
                </div>

                {/* mobile hamburger button */}
                <button
                    className="md:hidden p-2 text-white/80 transition-colors hover:text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* mobile dropdown menu */}
            {isMobileMenuOpen && (
                <div className="border-t border-white/10 bg-navbar px-6 py-4 md:hidden">
                    {!isLoggedIn && (
                        <div className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <div key={item.name} className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === item.name ? null : item.name)}
                                        className="flex items-center justify-between font-medium text-white/90"
                                    >
                                        {item.name}
                                        <span className={`text-xs transition-transform ${activeMenu === item.name ? "rotate-180" : ""}`}>
                                            ▼
                                        </span>
                                    </button>
                                    {activeMenu === item.name && (
                                        <div className="ml-2 flex flex-col gap-2 border-l border-white/10 pl-4">
                                            {item.links.map((link) => (
                                                <button
                                                    key={link.anchor}
                                                    onClick={() => scrollToAnchor(link.anchor)}
                                                    className="py-1 text-left text-sm text-white/70"
                                                >
                                                    {link.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* mobile auth buttons */}
                    <div className={`flex flex-col gap-3 pt-6 ${!isLoggedIn ? 'mt-4 border-t border-white/10' : ''}`}>
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full rounded-lg bg-primary px-4 py-2 text-center font-medium text-white transition-colors hover:bg-primary-hover"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        handleLogout()
                                    }}
                                    className="w-full py-2 text-center text-navbar-muted transition-colors hover:text-navbar-foreground"
                                >
                                    Log out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/register"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full rounded-lg bg-primary px-4 py-2 text-center font-medium text-white transition-colors hover:bg-primary-hover"
                                >
                                    Get to Know
                                </Link>
                                <Link
                                    href="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-2 text-center text-navbar-muted transition-colors hover:text-navbar-foreground"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}