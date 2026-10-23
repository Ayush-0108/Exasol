import React from "react"
import { SidebarContent } from "@/components/pulsecart/sidebar"
import { Topbar } from "@/components/pulsecart/topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex">
      {/* Desktop Sidebar (fixed, 240px) */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-60">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-[100dvh] w-full">
        <Topbar />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
