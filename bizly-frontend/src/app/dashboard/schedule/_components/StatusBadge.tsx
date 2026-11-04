import type { AppointmentStatus } from "./types"
import { STATUS } from "./types"

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
    const meta = STATUS[status]
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
        </span>
    )
}
