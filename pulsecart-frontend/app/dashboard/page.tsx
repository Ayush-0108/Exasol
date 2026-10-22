"use client"

import React, { useCallback } from "react"
import { StatCard } from "@/components/pulsecart/stat-card"
import { PipelineBars } from "@/components/pulsecart/pipeline-bars"
import { AlertFeed } from "@/components/pulsecart/alert-feed"
import { usePolling } from "@/lib/use-polling"
import { apiGet } from "@/lib/api"
import { ROIReport, PipelineHealth, AlertItem, SystemHealth } from "@/lib/types"
import { formatEur, formatRelativeTime } from "@/lib/format"

export default function CommandCenterPage() {
  // 1. Polling ROI (30s)
  const fetchRoi = useCallback(() => apiGet<ROIReport>("/api/v1/overview/roi"), [])
  const {
    data: roiData,
    loading: roiLoading,
    refresh: refreshRoi,
  } = usePolling<ROIReport>(fetchRoi, 30000)

  // 2. Polling Pipeline Health (15s)
  const fetchPipeline = useCallback(
    () => apiGet<PipelineHealth>("/api/v1/overview/pipeline-health"),
    []
  )
  const {
    data: pipelineData,
    loading: pipelineLoading,
    isPaused: pipelinePaused,
    togglePause: togglePipelinePause,
    lastUpdated: pipelineUpdated,
    refresh: refreshPipeline,
  } = usePolling<PipelineHealth>(fetchPipeline, 15000)

  // 3. Polling Alerts (10s)
  const fetchAlerts = useCallback(
    () => apiGet<AlertItem[]>("/api/v1/overview/alerts"),
    []
  )
  const {
    data: alertsData,
    loading: alertsLoading,
    isPaused: alertsPaused,
    togglePause: toggleAlertsPause,
    lastUpdated: alertsUpdated,
    refresh: refreshAlerts,
  } = usePolling<AlertItem[]>(fetchAlerts, 10000)

  // 4. Polling System Health (30s)
  const fetchSystem = useCallback(
    () => apiGet<SystemHealth>("/api/v1/overview/system-health"),
    []
  )
  const { data: systemData } = usePolling<SystemHealth>(fetchSystem, 30000)

  const alerts = alertsData || []
  const activeAlertsCount = alerts.filter((a) => a.severity === "critical" || a.severity === "warning").length

  return (
    <div className="space-y-8">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-zinc-850">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Module 05 · Global Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mt-1">
            Command Center
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Engine: <span className="text-zinc-200">Exasol Columnar In-Memory</span>
        </div>
      </div>

      {/* ── Top Row: ROI Metrics (Asymmetric 60/40 Split) ── */}
      <section aria-labelledby="roi-heading">
        <h2 id="roi-heading" className="sr-only">Revenue &amp; Alert Metrics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Hero stat: 60% (7 cols on lg) */}
          <div className="lg:col-span-7 bg-zinc-900/60 border-l-2 border-emerald-500 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                  Revenue saved today
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
                  +18.4% vs 7d avg
                </span>
              </div>

              <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tight text-emerald-400 my-2">
                {roiData ? formatEur(roiData.revenue_saved_today) : "₹1,842.50"}
              </div>

              <p className="text-xs font-mono text-zinc-400 mt-2">
                Consolidated impact across fraud blocks, churn retention offers, and stockout mitigations.
              </p>
            </div>

            {/* Breakdown row */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 grid grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-zinc-400 text-[11px] block">Fraud blocked</span>
                <span className="text-violet-400 font-semibold text-sm">
                  {roiData ? formatEur(roiData.breakdown.fraud_blocked) : "₹740.00"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Churn retained</span>
                <span className="text-rose-400 font-semibold text-sm">
                  {roiData ? formatEur(roiData.breakdown.churn_retained) : "₹680.00"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Stockouts avoided</span>
                <span className="text-amber-400 font-semibold text-sm">
                  {roiData ? formatEur(roiData.breakdown.restock_avoided) : "₹422.50"}
                </span>
              </div>
            </div>
          </div>

          {/* Stacked right stats: 40% (5 cols on lg) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <StatCard
              label="7-Day Cumulative Savings"
              value={roiData ? formatEur(roiData.revenue_saved_week) : "₹12,980.00"}
              sublabel="Trailing 168h analytical aggregation from Exasol"
              trend={{ value: "+9.2%", isPositive: true }}
              accentColor="#34d399"
            />
            <StatCard
              label="Active Priority Alerts"
              value={activeAlertsCount}
              sublabel="Critical and warning conditions requiring review"
              trend={{
                value: activeAlertsCount > 5 ? "Elevated" : "Normal",
                neutral: activeAlertsCount <= 5,
                isPositive: false,
              }}
              accentColor={activeAlertsCount > 5 ? "#f59e0b" : "#f4f4f5"}
            />
          </div>
        </div>
      </section>

      {/* ── Middle: Pipeline Health ── */}
      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="sr-only">Pipeline Health</h2>
        <PipelineBars
          data={pipelineData}
          loading={pipelineLoading}
          isPaused={pipelinePaused}
          togglePause={togglePipelinePause}
          lastUpdated={pipelineUpdated}
          onRefresh={refreshPipeline}
        />
      </section>

      {/* ── Bottom: Alert Feed ── */}
      <section aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="sr-only">Live Alerts Feed</h2>
        <AlertFeed
          alerts={alerts}
          loading={alertsLoading}
          isPaused={alertsPaused}
          togglePause={toggleAlertsPause}
          lastUpdated={alertsUpdated}
          onRefresh={refreshAlerts}
        />
      </section>

      {/* ── Footer Strip: System Health (No Boxes) ── */}
      <footer aria-label="System Health" className="pt-6 border-t border-zinc-850">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>
              Database:{" "}
              <strong className="text-zinc-200">
                {systemData?.database ?? "Exasol Personal (In-Memory)"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>
              LLM Service:{" "}
              <strong className="text-zinc-200">
                {systemData?.llm_service ?? "Groq (Llama 3.1 8B)"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>
              Last pipeline event:{" "}
              <strong className="text-zinc-200">
                {formatRelativeTime(systemData?.last_pipeline_event)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-zinc-500" aria-hidden="true" />
            <span>
              Uptime:{" "}
              <strong className="text-zinc-200">
                {systemData ? `${Math.floor(systemData.uptime_seconds / 3600)}h ${Math.floor((systemData.uptime_seconds % 3600) / 60)}m` : "99.98%"}
              </strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
