"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ShieldCheck,
  PackageSearch,
  MessageSquare,
  TrendingDown,
  Database,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const NAV_ITEMS = [
  {
    name: "Command Center",
    href: "/dashboard",
    icon: LayoutDashboard,
    accent: "text-emerald-400",
    module: "command",
  },
  {
    name: "Identity & Fraud",
    href: "/dashboard/identity",
    icon: ShieldCheck,
    accent: "text-violet-400",
    module: "identity",
  },
  {
    name: "Inventory Radar",
    href: "/dashboard/inventory",
    icon: PackageSearch,
    accent: "text-amber-400",
    module: "inventory",
  },
  {
    name: "Customer Success",
    href: "/dashboard/tickets",
    icon: MessageSquare,
    accent: "text-rose-400",
    module: "tickets",
  },
  {
    name: "Margin Protection",
    href: "/dashboard/returns",
    icon: TrendingDown,
    accent: "text-orange-400",
    module: "returns",
  },
  {
    name: "Exasol SQL",
    href: "/dashboard/exasol",
    icon: Database,
    accent: "text-zinc-400",
    module: "exasol",
  },
]

interface SidebarContentProps {
  onItemClick?: () => void
}

export function SidebarContent({ onItemClick }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = () => {
    // Clear pulsecart_auth cookie
    document.cookie = "pulsecart_auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/")
  }

  return (
    <div className="flex h-full flex-col justify-between bg-zinc-950 text-zinc-100 border-r border-zinc-800/80 w-60">
      <div>
        {/* Brand Wordmark */}
        <div className="h-14 flex items-center px-5 border-b border-zinc-850">
          <Link
            href="/dashboard"
            onClick={onItemClick}
            className="flex items-center gap-2 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 -mx-1"
          >
            <span className="font-semibold text-lg tracking-tight text-zinc-50">
              Pulse<span className="text-emerald-400">Cart</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
              Operator
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all group",
                  isActive
                    ? "bg-zinc-900 text-zinc-50 border-l-2 border-emerald-500 rounded-l-none"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive ? item.accent : "text-zinc-400 group-hover:text-zinc-300"
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Operator Account Footer */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded bg-zinc-900/60 border border-zinc-850">
          <div className="size-6 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 text-xs font-mono font-medium">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-medium text-zinc-200 truncate">
              admin@pulsecart.io
            </p>
            <p className="text-[10px] text-zinc-400 font-mono">Dark Store Lead</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-rose-500"
        >
          <span>Sign out</span>
          <LogOut className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
