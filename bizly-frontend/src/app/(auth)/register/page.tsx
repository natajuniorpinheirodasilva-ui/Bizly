'use client'

import Link from "next/link"
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import Footer from "@/components/Footer"
import FormInput from "@/components/FormInput"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function Register() {
    const router = useRouter()

    const [seePassword, setSeePassword] = useState(false)

    const [companyName, setCompanyName] = useState<string>("")
    const [name, setName] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await apiFetch("/api/v1/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    company_name: companyName,
                    name: name,
                    email: email,
                    password: password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || "An error has occurred.")
            }

            setSuccess(true)
            setTimeout(() => router.push("/login"), 1000)

        } catch (err: any) {
            setError(err.message)
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

            <main className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-10 shadow-xl">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
                        Register an account
                    </h1>

                    {error && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
                            <AlertCircle className="h-5 w-5" />
                            <p>{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 p-4 text-sm text-green-500 border border-green-500/20">
                            <CheckCircle2 className="h-5 w-5" />
                            <p>Account created successfully</p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-5"
                    >
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="company-name"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                            >
                                Your Company Name
                            </label>
                            <FormInput
                                onChange={(e) => setCompanyName(e.target.value)}
                                value={companyName}
                                autoComplete="organization"
                                id="company-name"
                                type="text"
                                placeholder="Bizly"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="name"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                            >
                                Name
                            </label>
                            <FormInput
                                onChange={(e) => setName(e.target.value)}
                                value={name}
                                autoComplete="name"
                                id="name"
                                type="text"
                                placeholder="John Alex"
                            />
                        </div>

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
                                    autoComplete="new-password"
                                    id="password"
                                    type={seePassword ? "text" : "password"}
                                    placeholder="••••••••"
                                />

                                <button
                                    type="button"
                                    onClick={() => setSeePassword(!seePassword)}
                                    className="absolute right-3 text-foreground-muted hover:text-foreground transition-colors cursor-pointer top-1/2 -translate-y-1/2"
                                >

                                    {seePassword ?
                                        <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />
                                    }
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-foreground-muted">
                            By signing up, you agree to our{" "}
                            <Link
                                href="/terms"
                                className="text-primary hover:underline"
                            >
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                                href="/privacy"
                                className="text-primary hover:underline"
                            >
                                Privacy Policy
                            </Link>.
                        </p>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 cursor-pointer rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"
                        >
                            {isLoading ? "CREATING..." : "CREATE ACCOUNT"}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-border pt-6 text-center">
                        <p className="text-sm text-foreground-muted">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="font-semibold text-primary hover:underline"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
