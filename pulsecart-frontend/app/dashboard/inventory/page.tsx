"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  PackageSearch,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Pause,
  Play,
  ArrowUpDown,
  Building2,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePolling } from "@/lib/use-polling"
import { apiGet, apiPost } from "@/lib/api"
import { DarkStoreItem, StockoutWarning, StoreHeatmapItem } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function InventoryRadarPage() {
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("ALL")
  const [activeHeatmapStore, setActiveHeatmapStore] = useState<string>("DS-01")
  const [reorderingSkus, setReorderingSkus] = useState<Record<string, boolean>>({})
  const [reorderedSkus, setReorderedSkus] = useState<Record<string, boolean>>({})

  // 1. Fetch dark stores
  const fetchStores = useCallback(() => apiGet<DarkStoreItem[]>("/api/v1/inventory/stores"), [])
  const {
    data: storesData,
    loading: storesLoading,
    refresh: refreshStores,
  } = usePolling<DarkStoreItem[]>(fetchStores, 60000)

  // 2. Fetch stockout warnings (polled every 60s)
  const fetchWarnings = useCallback(
    () => apiGet<StockoutWarning[]>("/api/v1/inventory/stockout-warnings"),
    []
  )
  const {
    data: warningsData,
    loading: warningsLoading,
    isPaused: warningsPaused,
    togglePause: toggleWarningsPause,
    lastUpdated: warningsUpdated,
    refresh: refreshWarnings,
  } = usePolling<StockoutWarning[]>(fetchWarnings, 60000)

  // 3. Fetch heatmap for active store
  const [heatmap, setHeatmap] = useState<StoreHeatmapItem[]>([])
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  const loadHeatmap = useCallback(async (storeId: string) => {
    setHeatmapLoading(true)
    try {
      const data = await apiGet<StoreHeatmapItem[]>(`/api/v1/inventory/store/${storeId}/heatmap`)
      setHeatmap(data || [])
    } catch {
      // Fallback heatmap items for store demonstration
      setHeatmap([
        { sku: "OAT-MILK-1L", sku_name: "Oat Milk Barista Edition 1L", category: "Dairy & Alt", current_stock: 4, reorder_point: 20, predicted_demand_6h: 18, status: "critical" },
        { sku: "AVO-HASS-2PK", sku_name: "Organic Hass Avocados 2pk", category: "Produce", current_stock: 2, reorder_point: 15, predicted_demand_6h: 14, status: "critical" },
        { sku: "BREAD-SOUR-500G", sku_name: "Artisan Sourdough Loaf 500g", category: "Bakery", current_stock: 6, reorder_point: 25, predicted_demand_6h: 22, status: "critical" },
        { sku: "EGGS-FREE-10PK", sku_name: "Free Range Eggs 10pk", category: "Dairy & Alt", current_stock: 5, reorder_point: 30, predicted_demand_6h: 24, status: "critical" },
        { sku: "BANANA-ORG-1KG", sku_name: "Organic Fairtrade Bananas 1kg", category: "Produce", current_stock: 8, reorder_point: 20, predicted_demand_6h: 19, status: "critical" },
        { sku: "SPARKLING-WATER-6PK", sku_name: "Mineral Sparkling Water 6x500ml", category: "Beverages", current_stock: 12, reorder_point: 20, predicted_demand_6h: 10, status: "warning" },
        { sku: "COFFEE-BEANS-250G", sku_name: "Espresso Roast Beans 250g", category: "Pantry", current_stock: 14, reorder_point: 18, predicted_demand_6h: 12, status: "warning" },
        { sku: "PASTA-PENNE-500G", sku_name: "Bronze-Cut Penne Rigate 500g", category: "Pantry", current_stock: 45, reorder_point: 20, predicted_demand_6h: 8, status: "healthy" },
        { sku: "OLIVE-OIL-EV-500ML", sku_name: "Cold Pressed Extra Virgin 500ml", category: "Pantry", current_stock: 32, reorder_point: 15, predicted_demand_6h: 4, status: "healthy" },
        { sku: "BUTTER-SALTED-250G", sku_name: "Grass-Fed Salted Butter 250g", category: "Dairy & Alt", current_stock: 28, reorder_point: 15, predicted_demand_6h: 6, status: "healthy" },
        { sku: "CHEDDAR-AGED-200G", sku_name: "Vintage White Cheddar 200g", category: "Dairy & Alt", current_stock: 35, reorder_point: 18, predicted_demand_6h: 7, status: "healthy" },
        { sku: "DARK-CHOCO-85G", sku_name: "Single Origin 85% Dark Chocolate", category: "Snacks", current_stock: 40, reorder_point: 15, predicted_demand_6h: 5, status: "healthy" },
      ])
    } finally {
      setHeatmapLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeatmap(activeHeatmapStore)
  }, [activeHeatmapStore, loadHeatmap])

  // Stores fallback if API empty
  const stores = storesData && storesData.length > 0 ? storesData : [
    { store_id: "DS-01", name: "Mitte Hub 01", city: "Berlin", zone: "Zone A · Urban Core", health_score: 78, total_skus: 420, critical_count: 5, warning_count: 8, healthy_count: 407 },
    { store_id: "DS-02", name: "Kreuzberg Hub 02", city: "Berlin", zone: "Zone B · High Density", health_score: 82, total_skus: 395, critical_count: 3, warning_count: 6, healthy_count: 386 },
    { store_id: "DS-03", name: "Prenzlauer Berg 03", city: "Berlin", zone: "Zone C · Residential", health_score: 91, total_skus: 410, critical_count: 1, warning_count: 4, healthy_count: 405 },
    { store_id: "DS-04", name: "Charlottenburg 04", city: "Berlin", zone: "Zone D · West Corridor", health_score: 85, total_skus: 380, critical_count: 2, warning_count: 5, healthy_count: 373 },
  ]

  // Warnings fallback if API empty
  const warnings = warningsData && warningsData.length > 0 ? warningsData : [
    { store_id: "DS-01", store_name: "Mitte Hub 01", store_city: "Berlin", sku: "OAT-MILK-1L", sku_name: "Oat Milk Barista Edition 1L", category: "Dairy & Alt", current_stock: 4, reorder_point: 20, predicted_demand_6h: 18, predicted_demand_24h: 54, stockout_severity: "CRITICAL" as const, recommended_reorder_qty: 158, estimated_runout_hours: 1.3 },
    { store_id: "DS-01", store_name: "Mitte Hub 01", store_city: "Berlin", sku: "AVO-HASS-2PK", sku_name: "Organic Hass Avocados 2pk", category: "Produce", current_stock: 2, reorder_point: 15, predicted_demand_6h: 14, predicted_demand_24h: 40, stockout_severity: "CRITICAL" as const, recommended_reorder_qty: 118, estimated_runout_hours: 0.9 },
    { store_id: "DS-02", store_name: "Kreuzberg Hub 02", store_city: "Berlin", sku: "BREAD-SOUR-500G", sku_name: "Artisan Sourdough Loaf 500g", category: "Bakery", current_stock: 6, reorder_point: 25, predicted_demand_6h: 22, predicted_demand_24h: 60, stockout_severity: "CRITICAL" as const, recommended_reorder_qty: 174, estimated_runout_hours: 1.6 },
    { store_id: "DS-01", store_name: "Mitte Hub 01", store_city: "Berlin", sku: "EGGS-FREE-10PK", sku_name: "Free Range Eggs 10pk", category: "Dairy & Alt", current_stock: 5, reorder_point: 30, predicted_demand_6h: 24, predicted_demand_24h: 70, stockout_severity: "CRITICAL" as const, recommended_reorder_qty: 205, estimated_runout_hours: 1.25 },
    { store_id: "DS-03", store_name: "Prenzlauer Berg 03", store_city: "Berlin", sku: "BANANA-ORG-1KG", sku_name: "Organic Fairtrade Bananas 1kg", category: "Produce", current_stock: 8, reorder_point: 20, predicted_demand_6h: 19, predicted_demand_24h: 48, stockout_severity: "CRITICAL" as const, recommended_reorder_qty: 136, estimated_runout_hours: 2.5 },
    { store_id: "DS-04", store_name: "Charlottenburg 04", store_city: "Berlin", sku: "SPARKLING-WATER-6PK", sku_name: "Mineral Sparkling Water 6x500ml", category: "Beverages", current_stock: 12, reorder_point: 20, predicted_demand_6h: 10, predicted_demand_24h: 30, stockout_severity: "WARNING" as const, recommended_reorder_qty: 78, estimated_runout_hours: 7.2 },
  ]

  const filteredWarnings =
    selectedStoreFilter === "ALL"
      ? warnings
      : warnings.filter((w) => w.store_id === selectedStoreFilter)

  const criticalCount = warnings.filter((w) => w.stockout_severity === "CRITICAL").length

  // Handle Reorder POST
  const handleApproveReorder = async (warning: StockoutWarning) => {
    const key = `${warning.store_id}-${warning.sku}`
    setReorderingSkus((prev) => ({ ...prev, [key]: true }))

    try {
      await apiPost("/api/v1/inventory/reorder", {
        store_id: warning.store_id,
        sku: warning.sku,
        quantity: warning.recommended_reorder_qty,
      })
      toast.success(
        `Reorder approved: +${warning.recommended_reorder_qty} units of ${warning.sku} at ${warning.store_name}`
      )
      setReorderedSkus((prev) => ({ ...prev, [key]: true }))
    } catch (err) {
      toast.error(`Reorder failed: ${(err as Error).message}`)
    } finally {
      setReorderingSkus((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-zinc-850">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
            Module 02 · Dark Store Logistics
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mt-1">
            Predictive Inventory Radar
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Forecast Window: <span className="text-zinc-200">6h ML Inference · Exasol DDL</span>
        </div>
      </div>

      {/* ── Top: Dark Store Health (4 stores, Bento Grid) ── */}
      <section aria-labelledby="stores-heading">
        <h2 id="stores-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
          Dark Store Network Health ({stores.length} Hubs)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store, index) => {
            const isSelected = selectedStoreFilter === store.store_id
            return (
              <button
                key={store.store_id}
                type="button"
                onClick={() => {
                  setSelectedStoreFilter(
                    selectedStoreFilter === store.store_id ? "ALL" : store.store_id
                  )
                  setActiveHeatmapStore(store.store_id)
                }}
                className={cn(
                  "p-5 rounded-xl text-left border transition-all flex flex-col justify-between group",
                  isSelected
                    ? "bg-zinc-900 border-amber-500 shadow-md ring-1 ring-amber-500/50"
                    : "bg-zinc-900/50 border-zinc-850 hover:bg-zinc-900/80 hover:border-zinc-800"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-zinc-400">{store.zone}</span>
                    <span
                      className={cn(
                        "text-xs font-mono px-2 py-0.5 rounded font-semibold",
                        store.health_score >= 85
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-900/50"
                          : "bg-amber-950 text-amber-300 border border-amber-900/50"
                      )}
                    >
                      {store.health_score}% health
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 group-hover:text-zinc-50">
                    {store.name}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">{store.city}</p>
                </div>

                {/* 3-segment progress indicator: red critical / amber warning / green healthy */}
                <div className="mt-5 space-y-2">
                  <div className="h-2 rounded-full bg-zinc-950 overflow-hidden flex gap-0.5">
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${Math.max((store.critical_count / store.total_skus) * 100 * 5, 4)}%` }}
                      title={`${store.critical_count} critical SKUs`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${Math.max((store.warning_count / store.total_skus) * 100 * 3, 6)}%` }}
                      title={`${store.warning_count} warning SKUs`}
                    />
                    <div
                      className="bg-emerald-500 h-full flex-1"
                      title={`${store.healthy_count} healthy SKUs`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-rose-400">{store.critical_count} critical</span>
                    <span className="text-amber-400">{store.warning_count} warning</span>
                    <span className="text-zinc-400">{store.total_skus} SKUs</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Middle: 6-Hour Stockout Warnings Table ── */}
      <section aria-labelledby="warnings-heading" className="space-y-4">
        {/* Critical Banner Alert if > 0 */}
        {criticalCount > 0 && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-rose-950/40 border border-rose-900/60 flex items-center justify-between text-xs font-mono text-rose-200"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-rose-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>{criticalCount} SKUs</strong> are projected to exhaust total stock before next scheduled replenishment run.
              </span>
            </div>
            {selectedStoreFilter !== "ALL" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStoreFilter("ALL")}
                className="text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 h-7"
              >
                Clear store filter ({selectedStoreFilter})
              </Button>
            )}
          </div>
        )}

        {/* Section Header with Telemetry Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-850">
          <div>
            <h2 id="warnings-heading" className="text-base font-semibold text-zinc-100">
              6-hour stockout warnings
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Runout probability computed against current dark store inventory and rolling order velocity
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-zinc-400">
              Updated {formatRelativeTime(warningsUpdated)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleWarningsPause}
              aria-label={warningsPaused ? "Resume inventory warnings polling" : "Pause inventory warnings polling"}
              className="h-7 px-2.5 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            >
              {warningsPaused ? (
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
              onClick={refreshWarnings}
              aria-label="Refresh stockout warnings"
              className="size-7 text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className={`size-3.5 ${warningsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-900/40">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">SKU / Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Pred 6h</th>
                <th className="py-3 px-4 text-right">Pred 24h</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-right">Suggested Reorder</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/60">
              {filteredWarnings.map((warning) => {
                const key = `${warning.store_id}-${warning.sku}`
                const isReordering = reorderingSkus[key]
                const isReordered = reorderedSkus[key]

                return (
                  <tr key={key} className="hover:bg-zinc-900/70 transition-colors">
                    <td className="py-3 px-4 text-zinc-300 font-medium">
                      {warning.store_name}
                      <span className="block text-[10px] text-zinc-400">{warning.store_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-100 font-medium block">{warning.sku_name}</span>
                      <span className="text-zinc-400 text-[10px]">{warning.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{warning.category}</td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-100">
                      {warning.current_stock}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 font-medium">
                      {warning.predicted_demand_6h}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400">
                      {warning.predicted_demand_24h}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider",
                          warning.stockout_severity === "CRITICAL"
                            ? "bg-rose-950 text-rose-300 border border-rose-900/60"
                            : "bg-amber-950 text-amber-300 border border-amber-900/60"
                        )}
                      >
                        {warning.stockout_severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-400">
                      +{warning.recommended_reorder_qty} units
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isReordered || isReordering}
                        onClick={() => handleApproveReorder(warning)}
                        className={cn(
                          "h-7 px-3 text-xs font-mono font-medium transition-colors",
                          isReordered
                            ? "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950 focus-visible:ring-emerald-400"
                        )}
                      >
                        {isReordering ? (
                          <>
                            <Loader2 className="size-3 mr-1 animate-spin" aria-hidden="true" />
                            Sending…
                          </>
                        ) : isReordered ? (
                          <>
                            <CheckCircle2 className="size-3 mr-1 text-emerald-400" aria-hidden="true" />
                            Reordered
                          </>
                        ) : (
                          "Approve reorder"
                        )}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom: Per-Store SKU Detail Grid (12 SKUs) ── */}
      <section aria-labelledby="sku-grid-heading" className="space-y-4 pt-4 border-t border-zinc-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="sku-grid-heading" className="text-base font-semibold text-zinc-100">
              Per-store SKU inventory heatmap
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Visual stock level versus reorder thresholds across top catalog items
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Store:</span>
            <Select value={activeHeatmapStore} onValueChange={(val) => val && setActiveHeatmapStore(val)}>
              <SelectTrigger className="w-52 h-8 bg-zinc-900 border-zinc-800 text-zinc-200 font-mono text-xs">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs">
                {stores.map((s) => (
                  <SelectItem key={s.store_id} value={s.store_id}>
                    {s.name} ({s.store_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 12 SKU Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {heatmap.map((item) => {
            const ratio = item.reorder_point > 0 ? (item.current_stock / item.reorder_point) * 100 : 100
            const isCritical = item.current_stock < item.predicted_demand_6h
            const isWarning = item.current_stock <= item.reorder_point

            return (
              <div
                key={item.sku}
                className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-850 flex flex-col justify-between font-mono text-xs hover:border-zinc-800 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                        isCritical
                          ? "bg-rose-950 text-rose-300"
                          : isWarning
                          ? "bg-amber-950 text-amber-300"
                          : "bg-emerald-950 text-emerald-300"
                      )}
                    >
                      {isCritical ? "CRITICAL" : isWarning ? "LOW" : "OPTIMAL"}
                    </span>
                  </div>

                  <h3 className="font-medium text-zinc-200 text-xs line-clamp-1" title={item.sku_name}>
                    {item.sku_name}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{item.sku}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Stock: <strong className="text-zinc-100">{item.current_stock}</strong></span>
                    <span className="text-zinc-400">Reorder pt: {item.reorder_point}</span>
                  </div>

                  {/* Stock vs Reorder Bar */}
                  <div className="h-2 rounded-full bg-zinc-950 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>6h forecast: <strong className="text-amber-400">{item.predicted_demand_6h} units</strong></span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
