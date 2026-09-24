'use client'

import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import Footer from "@/components/Footer"
import FormInput from "@/components/FormInput"

export default function Login() {
    const [seePassword, setSeePassword] = useState<boolean>(false)

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
                        Log in to your account
                    </h1>

                    <form
                        onSubmit={(e) => e.preventDefault()} // until I integrate FastAPI
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
                                    autoComplete="current-password"
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

                        <button
                            type="submit"
                            className="mt-2 cursor-pointer rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"
                        >
                            LOG IN
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
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
