"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent, NAV_ITEMS } from "./sidebar"
import { apiGet } from "@/lib/api"
import { HealthResponse } from "@/lib/types"

export function Topbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const [timeString, setTimeString] = useState<string>("")

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeString(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Health check polling (every 30s)
  useEffect(() => {
    let isMounted = true
    const checkHealth = async () => {
      try {
        const res = await apiGet<HealthResponse>("/health")
        if (isMounted) {
          setBackendConnected(res && (res.ok === true || res.database !== undefined))
        }
      } catch {
        if (isMounted) {
          setBackendConnected(false)
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Determine breadcrumb
  const currentNav = NAV_ITEMS.find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(item.href)
  )
  const currentTitle = currentNav ? currentNav.name : "Operator dashboard"

  return (
    <header className="sticky top-0 z-30 h-14 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                aria-label="Open operator menu"
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-60 border-zinc-800 bg-zinc-950">
            <SheetTitle className="sr-only">Operator Navigation Menu</SheetTitle>
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs font-mono">
            <li className="text-zinc-500">PulseCart</li>
            <li className="text-zinc-600" aria-hidden="true">/</li>
            <li className="text-zinc-200 font-medium">{currentTitle}</li>
          </ol>
        </nav>
      </div>

      {/* Status indicator & Clock */}
      <div className="flex items-center gap-4 text-xs font-mono">
        {/* Backend health */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-950/80 border border-zinc-800"
          title={
            backendConnected === null
              ? "Checking FastAPI telemetry..."
              : backendConnected
              ? "FastAPI + Exasol operational"
              : "Backend unreachable at http://localhost:8000"
          }
        >
          <span
            className={`size-2 rounded-full ${
              backendConnected === true
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                : backendConnected === false
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                : "bg-amber-500 animate-pulse"
            }`}
            aria-hidden="true"
          />
          <span className="text-zinc-300">
            {backendConnected === true
              ? "Connected"
              : backendConnected === false
              ? "Offline"
              : "Checking..."}
          </span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 px-2 py-1 rounded bg-zinc-950/40 border border-zinc-800/60 font-mono">
          <span className="text-zinc-200 font-semibold">{timeString || "--:--:--"}</span>
          <span className="text-[10px] text-zinc-400">UTC</span>
        </div>
      </div>
    </header>
  )
}
