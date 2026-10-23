"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertItem } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface AlertFeedProps {
  alerts: AlertItem[]
  loading: boolean
  isPaused: boolean
  togglePause: () => void
  lastUpdated: Date | null
  onRefresh: () => void
}

export function AlertFeed({
  alerts,
  loading,
  isPaused,
  togglePause,
  lastUpdated,
  onRefresh,
}: AlertFeedProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="py-6">
      {/* Header with Title, Pulsing Dot & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-850">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isPaused ? "bg-amber-400" : "bg-emerald-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full size-2.5 ${
                isPaused ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <h3 className="text-base font-semibold text-zinc-100">Live alerts</h3>
          <span className="text-xs font-mono text-zinc-400">
            ({alerts.length} active notifications)
          </span>
        </div>

        {/* Status indicator & pause controls */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-zinc-400" suppressHydrationWarning>
            Updated {formatRelativeTime(lastUpdated)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={togglePause}
            aria-label={isPaused ? "Resume live alerts stream" : "Pause live alerts stream"}
            className="h-7 px-2.5 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
          >
            {isPaused ? (
              <>
                <Play className="size-3 mr-1 text-emerald-400" aria-hidden="true" />
                Resume
              </>
            ) : (
              <>
                <Pause className="size-3 mr-1 text-amber-400" aria-hidden="true" />
                Pause
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh alerts list"
            className="size-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Alert Feed Container with aria-live="polite" */}
      <div
        role="region"
        aria-label="Live Operator Alerts Feed"
        aria-live="polite"
        className="rounded-lg bg-zinc-900/30 border border-zinc-850 overflow-hidden"
      >
        <ScrollArea className="h-[380px]">
          <div className="p-3 space-y-2">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-400">
                No active operational alerts across dark stores.
              </div>
            ) : (
              alerts.map((alert, idx) => {
                const Icon =
                  alert.severity === "critical"
                    ? AlertCircle
                    : alert.severity === "warning"
                    ? AlertTriangle
                    : Info

                const colorClasses =
                  alert.severity === "critical"
                    ? "border-l-rose-500 text-rose-300 bg-rose-950/20"
                    : alert.severity === "warning"
                    ? "border-l-amber-500 text-amber-300 bg-amber-950/20"
                    : "border-l-emerald-500 text-emerald-300 bg-emerald-950/20"

                const badgeBg =
                  alert.severity === "critical"
                    ? "bg-rose-950/80 text-rose-400 border-rose-900/60"
                    : alert.severity === "warning"
                    ? "bg-amber-950/80 text-amber-400 border-amber-900/60"
                    : "bg-emerald-950/80 text-emerald-400 border-emerald-900/60"

                return (
                  <motion.div
                    key={alert.id || idx}
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: -10 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "p-3 rounded-md border-l-2 bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3 transition-colors hover:bg-zinc-900/80",
                      colorClasses
                    )}
                  >
                    <Icon className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border tracking-wider",
                            badgeBg
                          )}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">
                          {alert.module}
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-zinc-300 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                    <time className="text-[11px] font-mono text-zinc-400 whitespace-nowrap shrink-0" suppressHydrationWarning>
                      {formatRelativeTime(alert.timestamp)}
                    </time>
                  </motion.div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
