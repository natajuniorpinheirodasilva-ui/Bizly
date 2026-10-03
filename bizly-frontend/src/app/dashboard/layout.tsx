'use client'

import { useState } from "react"
import Sidebar from "@/components/SideBar"
import Header from "@/components/Header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex flex-1 flex-col overflow-hidden">
                <Header setIsOpen={setIsSidebarOpen} />

                {/* main workspace area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}