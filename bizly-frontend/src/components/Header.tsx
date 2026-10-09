import { Menu, LogOut, User } from "lucide-react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"

type HeaderProps = {
    setIsOpen: (isOpen: boolean) => void
}

export default function Header({ setIsOpen }: HeaderProps) {
    const router = useRouter()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
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

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 shadow-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className="text-foreground-muted hover:text-foreground lg:hidden"
                    onClick={() => setIsOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-semibold text-foreground hidden sm:block">
                    Workspace
                </h2>
            </div>

            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                    <User className="h-5 w-5 cursor-pointer" />
                </button>

                {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-surface py-1 shadow-lg">
                        <div className="px-4 py-2 border-b border-border mb-1">
                            <p className="text-sm font-medium text-foreground">My Account</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}