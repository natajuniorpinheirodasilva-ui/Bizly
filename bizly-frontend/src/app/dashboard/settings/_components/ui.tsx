import { ReactNode } from "react"

export const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"

export const primaryButtonClass =
    "rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:scale-95 disabled:opacity-50 cursor-pointer"

export const secondaryButtonClass =
    "flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background active:scale-95 cursor-pointer"

export function Card({ title, description, children, footer }: {
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
            </div>
            <div className="p-6">{children}</div>
            {footer && (
                <div className="flex justify-end border-t border-border bg-background/50 px-6 py-3">
                    {footer}
                </div>
            )}
        </section>
    )
}

export function Field({ label, htmlFor, hint, children }: {
    label: string
    htmlFor: string
    hint?: string
    children: ReactNode
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
        </div>
    )
}

export function errorMessage(data: any, fallback: string): string {
    if (typeof data?.detail === "string") return data.detail
    // FastAPI validation errors come as a list
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg
    return fallback
}
