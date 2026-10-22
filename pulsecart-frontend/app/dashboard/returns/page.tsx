"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  TrendingDown,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  ShoppingBag,
  RotateCcw,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePolling } from "@/lib/use-polling"
import { apiGet } from "@/lib/api"
import {
  ReturnAbuser,
  ToxicSku,
  ReturnsImpactSummary,
  CustomerReturnHistoryItem,
} from "@/lib/types"
import { formatEur, formatPercent, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function MarginProtectionPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<ReturnAbuser | null>(null)
  const [customerReturns, setCustomerReturns] = useState<CustomerReturnHistoryItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // 1. Fetch Impact Summary
  const fetchSummary = useCallback(
    () => apiGet<ReturnsImpactSummary>("/api/v1/returns/impact-summary"),
    []
  )
  const { data: summaryData, refresh: refreshSummary } = usePolling<ReturnsImpactSummary>(
    fetchSummary,
    30000
  )

  // 2. Fetch Abusers Leaderboard
  const fetchAbusers = useCallback(
    () => apiGet<ReturnAbuser[]>("/api/v1/returns/abusers?limit=20"),
    []
  )
  const { data: abusersData, refresh: refreshAbusers } = usePolling<ReturnAbuser[]>(
    fetchAbusers,
    30000
  )

  // 3. Fetch Toxic SKUs
  const fetchToxicSkus = useCallback(
    () => apiGet<ToxicSku[]>("/api/v1/returns/toxic-skus"),
    []
  )
  const { data: toxicSkusData, refresh: refreshToxic } = usePolling<ToxicSku[]>(
    fetchToxicSkus,
    30000
  )

  // Fallbacks if backend seed is loading or offline
  const summary = summaryData || {
    total_margin_lost_eur: 1845.2,
    total_refunded_eur: 3240.0,
    erosion_percentage: 14.8,
    avg_impact_per_return: 18.25,
    by_reason: [
      { reason: "Damaged packaging", margin_lost: 680.0 },
      { reason: "Spoiled produce", margin_lost: 540.0 },
      { reason: "Wrong item delivered", margin_lost: 390.0 },
      { reason: "Customer remorse", margin_lost: 235.2 },
    ],
    by_category: [
      { category: "Produce", margin_lost: 720.0 },
      { category: "Dairy & Alt", margin_lost: 510.0 },
      { category: "Bakery", margin_lost: 340.0 },
      { category: "Snacks", margin_lost: 275.2 },
    ],
  }

  const abusers = abusersData && abusersData.length > 0 ? abusersData : [
    { rank: 1, golden_id: "GID-1005", customer_name: "Rohit Gupta", city: "Bengaluru", ltv: 8500.0, total_returns: 6, total_refunded_eur: 142.50, total_margin_lost_eur: 94.20, return_rate: 0.62, abuse_band: "RETURNS_ABUSER" },
    { rank: 2, golden_id: "GID-1008", customer_name: "Sneha Desai", city: "Bengaluru", ltv: 19350.0, total_returns: 5, total_refunded_eur: 118.00, total_margin_lost_eur: 78.50, return_rate: 0.55, abuse_band: "RETURNS_ABUSER" },
    { rank: 3, golden_id: "GID-1002", customer_name: "Priya Verma", city: "Bengaluru", ltv: 111600.0, total_returns: 3, total_refunded_eur: 52.00, total_margin_lost_eur: 32.10, return_rate: 0.28, abuse_band: "MODERATE_RISK" },
    { rank: 4, golden_id: "GID-1003", customer_name: "Aarav Sharma", city: "Bengaluru", ltv: 52200.0, total_returns: 2, total_refunded_eur: 34.00, total_margin_lost_eur: 18.50, return_rate: 0.15, abuse_band: "MODERATE_RISK" },
    { rank: 5, golden_id: "GID-1001", customer_name: "Aarav Sharma", city: "Bengaluru", ltv: 52200.0, total_returns: 1, total_refunded_eur: 16.00, total_margin_lost_eur: 8.20, return_rate: 0.05, abuse_band: "LOW_RISK" },
  ]

  const toxicSkus = toxicSkusData && toxicSkusData.length > 0 ? toxicSkusData : [
    { sku: "AV-006", sku_name: "Ripe Hass Avocado Pre-pack", category: "Produce", total_sold: 140, total_returned: 42, return_rate: 0.30, total_refunded: 189.0, margin_lost: 126.0, net_margin: -48.5, is_toxic: true },
    { sku: "BK-012", sku_name: "Artisan Brioche Burger Buns 4pk", category: "Bakery", total_sold: 95, total_returned: 24, return_rate: 0.25, total_refunded: 96.0, margin_lost: 64.0, net_margin: -18.2, is_toxic: true },
    { sku: "DR-004", sku_name: "Glass Bottle Organic Milk 1L", category: "Dairy & Alt", total_sold: 210, total_returned: 38, return_rate: 0.18, total_refunded: 114.0, margin_lost: 82.0, net_margin: -12.4, is_toxic: true },
    { sku: "SN-022", sku_name: "Kettle Cooked Truffle Chips 150g", category: "Snacks", total_sold: 320, total_returned: 18, return_rate: 0.056, total_refunded: 54.0, margin_lost: 22.0, net_margin: 185.0, is_toxic: false },
    { sku: "BV-008", sku_name: "Cold Pressed Green Juice 330ml", category: "Beverages", total_sold: 180, total_returned: 12, return_rate: 0.067, total_refunded: 48.0, margin_lost: 19.5, net_margin: 94.0, is_toxic: false },
  ]

  // Handle clicking row to view customer history drawer
  const handleViewCustomerReturns = async (customer: ReturnAbuser) => {
    setSelectedCustomer(customer)
    setDrawerOpen(true)
    setDrawerLoading(true)

    try {
      const history = await apiGet<CustomerReturnHistoryItem[]>(
        `/api/v1/returns/by-customer/${customer.golden_id}`
      )
      setCustomerReturns(history || [])
    } catch {
      // Fallback returns history
      setCustomerReturns([
        {
          return_id: "RET-881",
          order_id: "ORD-9021",
          sku: "AV-006",
          sku_name: "Ripe Hass Avocado Pre-pack",
          return_reason: "Bruised on arrival",
          refund_amount: 4.5,
          margin_impact: 3.2,
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
        {
          return_id: "RET-875",
          order_id: "ORD-8940",
          sku: "BK-012",
          sku_name: "Artisan Brioche Burger Buns 4pk",
          return_reason: "Crushed packaging",
          refund_amount: 4.0,
          margin_impact: 2.8,
          created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
        },
        {
          return_id: "RET-860",
          order_id: "ORD-8712",
          sku: "DR-004",
          sku_name: "Glass Bottle Organic Milk 1L",
          return_reason: "Leaked in bag",
          refund_amount: 3.0,
          margin_impact: 2.1,
          created_at: new Date(Date.now() - 3600000 * 168).toISOString(),
        },
      ])
    } finally {
      setDrawerLoading(false)
    }
  }

  // Chart Palette (PulseCart curated: emerald, orange, rose, amber)
  const PIE_COLORS = ["#f97316", "#f43f5e", "#f59e0b", "#71717a"]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-zinc-850">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
            Module 04 · Margin Defense
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mt-1">
            Margin Protection &amp; Returns
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Compute: <span className="text-zinc-200">Exasol Materialized Net-Margin Synthesis</span>
        </div>
      </div>

      {/* ── Top: Impact Summary Stats (4 Inline Stats, No Boxes) ── */}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">Margin Impact Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono border-b border-zinc-850 pb-6">
          <div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider block">Total Margin Lost</span>
            <span className="text-2xl sm:text-3xl font-bold text-rose-400 block mt-1">
              {formatEur(summary.total_margin_lost_eur)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">Direct inventory &amp; reverse delivery</span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider block">Total Refunded</span>
            <span className="text-2xl sm:text-3xl font-bold text-orange-400 block mt-1">
              {formatEur(summary.total_refunded_eur)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">App wallet credits &amp; card reversals</span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider block">Margin Erosion</span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-400 block mt-1">
              {formatPercent(summary.erosion_percentage)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">Of gross quick-commerce margins</span>
          </div>

          <div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider block">Avg Impact / Return</span>
            <span className="text-2xl sm:text-3xl font-bold text-zinc-200 block mt-1">
              {formatEur(summary.avg_impact_per_return)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">Net write-off per incident</span>
          </div>
        </div>
      </section>

      {/* ── Middle: Split Layout (50/50) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Returns Abuser Leaderboard */}
        <section aria-labelledby="abusers-heading" className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
            <div>
              <h2 id="abusers-heading" className="text-base font-semibold text-zinc-100">
                Returns abuser leaderboard
              </h2>
              <p className="text-xs font-mono text-zinc-400">
                Top serial refunders flagged by Exasol abuse band threshold
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">Top 20</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-900/40">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">LTV</th>
                  <th className="py-2.5 px-3 text-right">Returns</th>
                  <th className="py-2.5 px-3 text-right">Margin Lost</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-center">Abuse Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {abusers.map((item, idx) => {
                  const rank = item.rank || idx + 1
                  const isTop3 = rank <= 3
                  const isAbuser = item.abuse_band?.toLowerCase().includes("abuser")

                  return (
                    <tr
                      key={item.golden_id}
                      onClick={() => handleViewCustomerReturns(item)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-zinc-800/60",
                        isTop3 ? "bg-rose-950/20" : ""
                      )}
                      title="Click to view returns incident history"
                    >
                      <td className="py-2.5 px-3 text-zinc-400 font-semibold">{rank}</td>
                      <td className="py-2.5 px-3 text-zinc-200">
                        <span className="font-medium block">{item.customer_name || `Customer ${item.golden_id}`}</span>
                        <span className="text-[10px] text-zinc-400">{item.golden_id}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300 font-medium">
                        {formatEur(item.ltv)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">
                        {item.total_returns}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">
                        {formatEur(item.total_margin_lost_eur)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        {formatPercent(item.return_rate, true)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider",
                            isAbuser
                              ? "bg-rose-950 text-rose-300 border border-rose-900/60"
                              : item.abuse_band === "MODERATE_RISK"
                              ? "bg-amber-950 text-amber-300 border border-amber-900/60"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                          )}
                        >
                          {isAbuser ? "abuser" : item.abuse_band === "MODERATE_RISK" ? "moderate" : "low"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Toxic SKUs */}
        <section aria-labelledby="toxic-heading" className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
            <div>
              <h2 id="toxic-heading" className="text-base font-semibold text-zinc-100">
                Toxic SKUs
              </h2>
              <p className="text-xs font-mono text-zinc-400">
                Products producing net-negative margin after packaging and write-offs
              </p>
            </div>
            <span className="text-xs font-mono text-rose-400">Net-negative after returns</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-900/40">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Item / Category</th>
                  <th className="py-2.5 px-3 text-right">Returns</th>
                  <th className="py-2.5 px-3 text-right">Margin Lost</th>
                  <th className="py-2.5 px-3 text-right">Net Margin</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {toxicSkus.map((sku) => {
                  return (
                    <tr key={sku.sku} className="hover:bg-zinc-900/70 transition-colors">
                      <td className="py-2.5 px-3 text-zinc-300 font-medium">{sku.sku}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-zinc-100 font-medium block truncate max-w-[160px]" title={sku.sku_name}>
                          {sku.sku_name}
                        </span>
                        <span className="text-[10px] text-zinc-400">{sku.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-medium">
                        {sku.total_returned}
                        <span className="text-[10px] text-zinc-400 block">
                          ({formatPercent(sku.return_rate, true)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">
                        {formatEur(sku.margin_lost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={sku.net_margin < 0 ? "text-rose-400" : "text-emerald-400"}>
                          {formatEur(sku.net_margin)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {sku.is_toxic || Number(sku.net_margin) < 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/70 border border-rose-900/60 text-rose-300 text-[10px] font-semibold">
                            <span className="size-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                            TOXIC
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400">Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Bottom: Impact Visualizations (Recharts) ── */}
      <section aria-labelledby="charts-heading" className="space-y-4 pt-6 border-t border-zinc-850">
        <div>
          <h2 id="charts-heading" className="text-base font-semibold text-zinc-100">
            Returns Margin Erosion Distribution
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Breakdown across root causes and vulnerable dark store categories
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Margin Lost by Reason (Donut/Pie) */}
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-850">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-4">
              Margin Lost by Claim Reason
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.by_reason}
                    dataKey="margin_lost"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {summary.by_reason.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      color: "#f4f4f5",
                      fontFamily: "var(--font-geist-mono)",
                      fontSize: "12px",
                      borderRadius: "6px",
                    }}
                    formatter={(val) => [formatEur(Number(val)), "Margin Lost"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800 font-mono text-xs">
              {summary.by_reason.map((item, idx) => (
                <div key={item.reason} className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-zinc-400 truncate">{item.reason}:</span>
                  <span className="text-zinc-200 font-semibold">{formatEur(item.margin_lost)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Margin Lost by Category (Horizontal Bar) */}
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-850">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 mb-4">
              Margin Lost by Category (₹)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.by_category}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      color: "#f4f4f5",
                      fontFamily: "var(--font-geist-mono)",
                      fontSize: "12px",
                      borderRadius: "6px",
                    }}
                    formatter={(val) => [formatEur(Number(val)), "Margin Lost"]}
                  />
                  <Bar dataKey="margin_lost" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ── Customer Returns History Drawer (Sheet) ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
          <SheetHeader className="pb-4 border-b border-zinc-850">
            <SheetTitle className="text-lg font-semibold text-zinc-100 font-sans">
              Customer Returns History
            </SheetTitle>
            <SheetDescription className="text-xs font-mono text-zinc-400">
              Audit log for {selectedCustomer?.customer_name} ({selectedCustomer?.golden_id})
            </SheetDescription>
          </SheetHeader>

          {selectedCustomer && (
            <div className="mt-4 space-y-4 font-mono text-xs">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-850 text-center">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Total Incidents</span>
                  <span className="text-base font-bold text-rose-400">{selectedCustomer.total_returns}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Total Refunded</span>
                  <span className="text-base font-bold text-orange-400">
                    {formatEur(selectedCustomer.total_refunded_eur)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Margin Impact</span>
                  <span className="text-base font-bold text-rose-400">
                    {formatEur(selectedCustomer.total_margin_lost_eur)}
                  </span>
                </div>
              </div>

              {/* Incidents List */}
              <div>
                <h4 className="text-xs font-mono uppercase text-zinc-400 mb-2">
                  Logged Incidents ({customerReturns.length})
                </h4>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-2 pr-2">
                    {customerReturns.map((item, idx) => (
                      <div
                        key={item.return_id || idx}
                        className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{item.sku_name}</span>
                          <span className="text-rose-400 font-bold">{formatEur(item.margin_impact)} loss</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Reason: <em className="text-zinc-300 not-italic">{item.return_reason}</em></span>
                          <span>Refunded: {formatEur(item.refund_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                          <span>Order: {item.order_id}</span>
                          <time>{formatRelativeTime(item.created_at)}</time>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
