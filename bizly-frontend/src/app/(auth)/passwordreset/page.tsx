'use client'

import Link from "next/link"
import FormFormInput from "@/components/FormInput"
import FormInput from "@/components/FormInput"

export default function PasswordReset() {
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
                    <form
                        className="flex flex-col gap-5"
                        onSubmit={(e) => e.preventDefault}
                    >
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="email"
                                className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                            >
                                Password Reset
                            </label>
                            <FormInput
                                autoComplete="email"
                                id="email"
                                type="email"
                                placeholder="Enter the account email"
                            />
                        </div>

                        <button
                            type="submit"
                            className="mt-2 cursor-pointer rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"
                        >
                            SEND
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}