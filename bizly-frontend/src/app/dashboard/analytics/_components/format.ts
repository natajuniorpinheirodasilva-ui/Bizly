export function makeFormatters(currency: string) {
    const money = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 })
    const moneyCompact = new Intl.NumberFormat("en-US", {
        style: "currency", currency, notation: "compact", maximumFractionDigits: 1,
    })
    const count = new Intl.NumberFormat("en-US")

    return {
        money: (v: number) => money.format(v),
        // axis ticks: full under 10k, compact above
        moneyAxis: (v: number) => (Math.abs(v) >= 10_000 ? moneyCompact.format(v) : money.format(Math.round(v)).replace(/\.00$/, "")),
        moneyCompact: (v: number) => moneyCompact.format(v),
        count: (v: number) => count.format(v),
    }
}

// "2026-06" -> "Jun 26"
export function monthLabel(key: string) {
    const [y, m] = key.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
