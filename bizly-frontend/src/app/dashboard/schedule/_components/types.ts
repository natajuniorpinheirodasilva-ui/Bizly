export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"

export type Appointment = {
    id: string
    customerId: string | null
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    serviceId: string
    serviceName: string
    date: string      // YYYY-MM-DD
    time: string      // HH:MM
    endTime: string   // HH:MM
    duration: number  // minutes
    price: number
    status: AppointmentStatus
    notes: string | null
}

export type Client = { id: string; name: string; email: string; phone: string }
export type Service = { id: string; name: string; description: string | null; duration: number; price: number }
export type BusinessHour = { dayOfWeek: number; startTime: string; endTime: string }

type StatusMeta = {
    label: string
    color: string   // calendar accent
    badge: string   // tailwind classes for the pill
    action: string  // verb used on quick-action buttons
}

export const STATUS: Record<AppointmentStatus, StatusMeta> = {
    SCHEDULED: { label: "Scheduled", color: "#2563eb", action: "Mark as scheduled", badge: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    CONFIRMED: { label: "Confirmed", color: "#0891b2", action: "Confirm", badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" },
    COMPLETED: { label: "Completed", color: "#16a34a", action: "Complete", badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    CANCELLED: { label: "Cancelled", color: "#dc2626", action: "Cancel", badge: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400" },
    NO_SHOW: { label: "No-show", color: "#d97706", action: "Mark no-show", badge: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
}

export const STATUS_ORDER: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]

export const isInactive = (s: AppointmentStatus) => s === "CANCELLED" || s === "NO_SHOW"

export function errorMessage(data: unknown, fallback: string): string {
    const detail = (data as { detail?: unknown } | null)?.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg
    return fallback
}
