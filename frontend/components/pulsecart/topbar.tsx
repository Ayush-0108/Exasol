"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "./sidebar"

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="lg:hidden sticky top-0 z-30 h-14 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-60 border-zinc-800 bg-zinc-950">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-semibold text-lg tracking-tight text-zinc-50">
            Pulse<span className="text-emerald-400">Cart</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
