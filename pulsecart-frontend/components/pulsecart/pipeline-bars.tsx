"use client"

import React from "react"
import { Pause, Play, RefreshCw, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PipelineHealth } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"

interface PipelineBarsProps {
  data: PipelineHealth | null
  loading: boolean
  isPaused: boolean
  togglePause: () => void
  lastUpdated: Date | null
  onRefresh: () => void
}

export function PipelineBars({
  data,
  loading,
  isPaused,
  togglePause,
  lastUpdated,
  onRefresh,
}: PipelineBarsProps) {
  const sources = data?.sources || [
    { name: "APP_EVENT_STREAM", rows_ingested_24h: 142500, latency_ms: 84, status: "healthy" as const },
    { name: "DARK_STORE_IOT", rows_ingested_24h: 98200, latency_ms: 142, status: "healthy" as const },
    { name: "ORDER_CHECKOUT_API", rows_ingested_24h: 34100, latency_ms: 195, status: "healthy" as const },
    { name: "SUPPORT_TICKETS_ZENDESK", rows_ingested_24h: 6200, latency_ms: 310, status: "warning" as const },
    { name: "REVERSE_LOGISTICS_HUB", rows_ingested_24h: 14800, latency_ms: 165, status: "healthy" as const },
  ]

  const maxRows = Math.max(...sources.map((s) => s.rows_ingested_24h), 1)

  return (
    <div className="py-6">
      {/* Header with Telemetry Status & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-850">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-100">Live data pipeline</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
              Last 24 hours
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Real-time ingestion telemetry into Exasol columnar tables
          </p>
        </div>

        {/* Polling status & pause control */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-zinc-400">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={togglePause}
            aria-label={isPaused ? "Resume pipeline polling" : "Pause pipeline polling"}
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
            aria-label="Refresh pipeline telemetry"
            className="size-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 5 Ingestion Bars */}
      <div className="space-y-4 font-mono">
        {sources.map((source) => {
          const percentage = Math.round((source.rows_ingested_24h / maxRows) * 100)
          const latencyColor =
            source.latency_ms < 200
              ? "text-emerald-400 bg-emerald-950/60 border-emerald-900/50"
              : source.latency_ms <= 500
              ? "text-amber-400 bg-amber-950/60 border-amber-900/50"
              : "text-rose-400 bg-rose-950/60 border-rose-900/50"

          return (
            <div key={source.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
              {/* Source Name */}
              <div className="sm:w-56 shrink-0 truncate text-zinc-300 font-medium">
                {source.name}
              </div>

              {/* Ingestion Bar */}
              <div className="flex-1 bg-zinc-900 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-800/80">
                <div
                  className="bg-emerald-500/80 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(percentage, 4)}%` }}
                  role="progressbar"
                  aria-valuenow={source.rows_ingested_24h}
                  aria-valuemin={0}
                  aria-valuemax={maxRows}
                  aria-label={`${source.name} ingestion volume: ${source.rows_ingested_24h} rows`}
                />
              </div>

              {/* Rows Count + Latency Badge */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-56 shrink-0 text-right">
                <span className="text-zinc-400" suppressHydrationWarning>
                  {source.rows_ingested_24h.toLocaleString("en-US")} rows
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border ${latencyColor}`}
                  title={`Ingestion Latency: ${source.latency_ms}ms`}
                >
                  {source.latency_ms}ms
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Throughput strip */}
      <div className="mt-6 pt-4 border-t border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <Activity className="size-4 text-emerald-400" aria-hidden="true" />
          <span>
            Current throughput:{" "}
            <strong className="text-zinc-100 font-semibold" suppressHydrationWarning>
              {data?.throughput_rows_per_min?.toLocaleString("en-US") ?? "2,480"}
            </strong>{" "}
            rows/min
          </span>
        </div>

        {/* Mini 60-min visual sparkline */}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="text-[11px] text-zinc-400">Past 60 min:</span>
          <div className="flex items-end gap-0.5 h-4 w-28 bg-zinc-900/60 p-0.5 rounded border border-zinc-800">
            {(data?.sparkline_60min || [40, 60, 45, 80, 95, 70, 85, 100, 75, 90, 85, 92]).map(
              (val, idx) => (
                <div
                  key={idx}
                  className="bg-emerald-500/70 hover:bg-emerald-400 flex-1 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(val, 15)}%` }}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
