'use client'

import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import Footer from "@/components/Footer"
import FormInput from "@/components/FormInput"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Cookies from "js-cookie"


export default function Login() {
    const router = useRouter()

    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [seePassword, setSeePassword] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [rememberMe, setRememberMe] = useState<boolean>(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim() || !password.trim()) {
            toast.error("Invalid credentials.")
            return
        }

        setIsLoading(true)

        try {
            const response = await apiFetch("/api/v1/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || "An error has ocurred.")
            }

            if (rememberMe) {
                Cookies.set("bizly_token", data.access_token, { expires: 7 })
            } else {
                Cookies.set("bizly_token", data.access_token)
            }

            setTimeout(() => router.push("/"))

        } catch (err: any) {
            toast.error("Unexpected error.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <nav className="flex w-full items-center justify-between border-b border-border bg-navbar px-8 py-4 text-navbar-foreground">
                <Link
                    href="/"
                    className="cursor-pointer text-xl font-semibold tracking-tight"
                >
                    Biz<span className="text-primary">ly</span>
                </Link>
            </nav>

            <main className="flex flex-1 items-center justify-center p-6 bg-surface/40">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-10 shadow-xl">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
                        Log in to your account
                    </h1>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-5"
                    >
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="email"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                            >
                                Email
                            </label>
                            <FormInput
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                autoComplete="email"
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="password"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                            >
                                Password
                            </label>
                            <div className="relative flex items-center">
                                <FormInput
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    autoComplete="current-password"
                                    id="password"
                                    type={seePassword ? "text" : "password"}
                                    placeholder="••••••••"
                                />

                                <button
                                    type="button"
                                    aria-label={seePassword ? "Hide password" : "Show password"}
                                    onClick={() => setSeePassword(!seePassword)}
                                    className="absolute right-3 text-foreground-muted hover:text-foreground transition-colors cursor-pointer top-1/2 -translate-y-1/2"
                                >
                                    {seePassword ?
                                        <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />
                                    }
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 accent-primary cursor-pointer rounded shrink-0"
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-foreground-muted cursor-pointer select-none leading-none"
                                >
                                    Remember me
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={isLoading
                                ? "cursor-not-allowed opacity-70 rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors"
                                : "cursor-pointer rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"}
                        >
                            {isLoading ? "LOGGING IN" : "LOG IN"}
                        </button>

                        <div className="text-center pt-2">
                            <Link
                                href="/passwordreset"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted hover:text-foreground transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    </form>

                    <div className="mt-8 border-t border-border pt-6 text-center">
                        <p className="text-sm text-foreground-muted">
                            Don't have an account?{" "}
                            <Link
                                href="/register"
                                className="font-semibold text-primary hover:underline"
                            >
                                Register
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
