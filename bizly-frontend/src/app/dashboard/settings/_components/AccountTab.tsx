'use client'

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Card, Field, inputClass, primaryButtonClass, errorMessage } from "./ui"

export default function AccountTab() {
    const [profile, setProfile] = useState({ name: "", email: "" })
    const [role, setRole] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" })
    const [isSavingPassword, setIsSavingPassword] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch("/api/v1/settings/account")
                if (!res.ok) {
                    toast.error("Failed to load account.")
                    return
                }
                const data = await res.json()
                setProfile({ name: data.name, email: data.email })
                setRole(data.role)
            } catch {
                toast.error("Unexpected error.")
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault()
        if (!profile.name.trim() || !profile.email.trim()) {
            toast.error("Name and email are required.")
            return
        }

        setIsSavingProfile(true)
        try {
            const res = await apiFetch("/api/v1/settings/account", {
                method: "PUT",
                body: JSON.stringify(profile),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to update account."))
                return
            }
            toast.success("Account updated.")
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSavingProfile(false)
        }
    }

    async function savePassword(e: React.FormEvent) {
        e.preventDefault()
        if (passwords.newPassword.length < 8) {
            toast.error("New password must have at least 8 characters.")
            return
        }
        if (passwords.newPassword !== passwords.confirm) {
            toast.error("Passwords don't match.")
            return
        }

        setIsSavingPassword(true)
        try {
            const res = await apiFetch("/api/v1/settings/account/password", {
                method: "PUT",
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(errorMessage(data, "Failed to change password."))
                return
            }
            setPasswords({ currentPassword: "", newPassword: "", confirm: "" })
            toast.success("Password changed.")
        } catch {
            toast.error("Unexpected error.")
        } finally {
            setIsSavingPassword(false)
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={saveProfile}>
                <Card
                    title="Profile"
                    description={role ? `Your personal information. Role: ${role.toLowerCase()}.` : "Your personal information."}
                    footer={
                        <button type="submit" disabled={isSavingProfile || isLoading} className={primaryButtonClass}>
                            {isSavingProfile ? "Saving..." : "Save profile"}
                        </button>
                    }
                >
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Name" htmlFor="acc-name">
                            <input id="acc-name" autoComplete="name" className={inputClass} disabled={isLoading}
                                value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                        </Field>
                        <Field label="Email" htmlFor="acc-email" hint="You'll use this email to log in.">
                            <input id="acc-email" type="email" autoComplete="email" className={inputClass} disabled={isLoading}
                                value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
                        </Field>
                    </div>
                </Card>
            </form>

            <form onSubmit={savePassword}>
                <Card
                    title="Password"
                    description="Use at least 8 characters."
                    footer={
                        <button type="submit" disabled={isSavingPassword} className={primaryButtonClass}>
                            {isSavingPassword ? "Updating..." : "Update password"}
                        </button>
                    }
                >
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <Field label="Current password" htmlFor="pw-current">
                            <input id="pw-current" type="password" autoComplete="current-password" required className={inputClass}
                                value={passwords.currentPassword}
                                onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                        </Field>
                        <Field label="New password" htmlFor="pw-new">
                            <input id="pw-new" type="password" autoComplete="new-password" required className={inputClass}
                                value={passwords.newPassword}
                                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
                        </Field>
                        <Field label="Confirm new password" htmlFor="pw-confirm">
                            <input id="pw-confirm" type="password" autoComplete="new-password" required className={inputClass}
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
                        </Field>
                    </div>
                </Card>
            </form>
        </div>
    )
}
