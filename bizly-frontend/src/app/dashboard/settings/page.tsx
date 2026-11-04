import FormInput from "@/components/ui/FormInput"

export default function Settings() {
    return (
        <main className="space-y-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div >
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Settings
                    </h1>

                    <p className="mt-1 text-sm text-foreground-muted">
                        Change your preferences.
                    </p>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                <div className="">
                    
                </div>
            </section>
        </main>
    )
}
