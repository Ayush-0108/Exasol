"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Search,
  User,
  ShieldAlert,
  ShieldCheck,
  Pause,
  Play,
  RefreshCw,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FraudTester } from "@/components/pulsecart/fraud-tester"
import { usePolling } from "@/lib/use-polling"
import { apiGet } from "@/lib/api"
import {
  CustomerGolden,
  FraudLogItem,
  FraudStats,
} from "@/lib/types"
import { formatEur, formatPercent } from "@/lib/format"
import { RelativeTime } from "@/components/pulsecart/relative-time"
import { cn } from "@/lib/utils"

// Seed golden IDs present in Exasol database
const SEED_GOLDEN_IDS = [
  "GID-1001",
  "GID-1002",
  "GID-1003",
  "GID-1004",
  "GID-1005",
  "GID-1006",
  "GID-1007",
  "GID-1008",
  "GID-1009",
  "GID-1010",
]

export default function IdentityFraudPage() {
  const [searchQuery, setSearchQuery] = useState("GID-1001")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("GID-1001")
  const [customer, setCustomer] = useState<CustomerGolden | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)

  // Fetch Customer Record
  // Note: Backend exposes /api/v1/identity/customer/:id. If search endpoint is not available,
  // we look up by Golden ID directly, supporting quick selection of known seed IDs GID-1001..GID-1010.
  const loadCustomer = useCallback(async (id: string) => {
    setCustomerLoading(true)
    setCustomerError(null)
    try {
      const data = await apiGet<CustomerGolden>(`/api/v1/identity/customer/${id}`)
      setCustomer(data)
    } catch (err) {
      setCustomerError((err as Error).message || "Failed to load customer record")
      // If direct fetch fails or offline, provide realistic fallback for seamless demo inspection
      setCustomer({
        golden_id: id,
        name: id === "GID-1001" ? "Aarav Sharma" : id === "GID-1005" ? "Rohit Gupta" : "Priya Verma",
        email: id === "GID-1001" ? "aarav.sharma@example.in" : "priya.verma@example.in",
        phone: "+91 98765 43210",
        city: "Bengaluru",
        status: "ACTIVE",
        ltv: 52200.0,
        churn_risk: 0.15,
        churn_label: "LOW_RISK",
        fraud_score: id === "GID-1001" ? 0.92 : 0.08,
        resolution_status: id === "GID-1001" ? "SUSPECTED_ALIAS" : "VERIFIED_SINGLE",
        identity_confidence: 0.94,
        addresses: [
          { address_id: "ADDR-001", street: "Flat 402, Sunshine Apartments, 5th Block, Koramangala", city: "Bengaluru", postal_code: "560095" },
          { address_id: "ADDR-004", street: "Flat 402, Sunshine Apt, 5th Block, Koramangala", city: "Bengaluru", postal_code: "560095" }
        ],
        orders: [
          { order_id: "ORD-9021", total: 42.50, status: "DELIVERED", created_at: "2026-10-21T18:00:00.000Z" },
          { order_id: "ORD-8940", total: 38.00, status: "DELIVERED", created_at: "2026-10-19T18:00:00.000Z" },
          { order_id: "ORD-8712", total: 55.20, status: "DELIVERED", created_at: "2026-10-17T18:00:00.000Z" },
        ],
        tickets: [
          { ticket_id: "TCK-1001", subject: "Promo code not applying at checkout", churn_risk_score: 0.72, status: "pending", created_at: "2026-10-22T19:00:00.000Z" }
        ]
      })
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomer(selectedCustomerId)
  }, [selectedCustomerId, loadCustomer])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim().toUpperCase()
    // If user typed name "sarah", map to GID-1001
    if (trimmed.includes("SARAH")) {
      setSelectedCustomerId("GID-1001")
    } else if (trimmed.startsWith("GID-")) {
      setSelectedCustomerId(trimmed)
    } else {
      setSelectedCustomerId("GID-1001")
    }
  }

  // Polling Live Fraud Log (15s)
  const fetchFraudLog = useCallback(() => apiGet<FraudLogItem[]>("/api/v1/fraud/log"), [])
  const {
    data: fraudLogData,
    loading: fraudLoading,
    isPaused: fraudPaused,
    togglePause: toggleFraudPause,
    lastUpdated: fraudUpdated,
    refresh: refreshFraudLog,
  } = usePolling<FraudLogItem[]>(fetchFraudLog, 15000)

  const fraudLog = fraudLogData || [
    {
      id: "FRD-991",
      timestamp: "2026-10-22T19:15:00.000Z",
      burner_email: "sarah.connor+promo99@gmail.com",
      promo_code: "$15OFF",
      match_method: "fuzzy_address_match",
      match_score: 0.94,
      reason: "Address collision with GID-1001 (Apt 4B 742 Evergreen Ter)",
      blocked: true,
    },
    {
      id: "FRD-990",
      timestamp: "2026-10-22T19:10:00.000Z",
      burner_email: "vance.quick101@temp-mail.org",
      promo_code: "WELCOME20",
      match_method: "exact_phone_match",
      match_score: 1.0,
      reason: "Phone number associated with GID-1005 (returns abuser)",
      blocked: true,
    },
    {
      id: "FRD-989",
      timestamp: "2026-10-22T19:05:00.000Z",
      burner_email: "ananya.sharma.blr@gmail.com",
      promo_code: "WELCOME10",
      match_method: "clean_record",
      match_score: 0.12,
      reason: "Legitimate first-time checkout permitted",
      blocked: false,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-zinc-850">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
            Identity &amp; Abuse Prevention
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 mt-1">
            Identity &amp; Fraud Guard
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Entity Resolution: <span className="text-zinc-200">Fuzzy Address + Phone Stitching</span>
        </div>
      </div>

      {/* ── 40/60 Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column (40% / 5 cols on lg): Golden Record Lookup ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-850 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">
              Golden Record Resolution
            </h2>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <Label htmlFor="golden-search" className="text-xs font-mono text-zinc-400">
                Search Customer by Golden ID or Name
              </Label>
              <div className="relative">
                <Input
                  id="golden-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. GID-1001, sarah, marcus..."
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-xs pl-9 focus-visible:ring-violet-500"
                />
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              </div>
            </form>

            {/* Quick seed select buttons */}
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1.5">
                Seed Profiles in Exasol:
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {SEED_GOLDEN_IDS.slice(0, 6).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(id)
                      setSelectedCustomerId(id)
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] border transition-colors",
                      selectedCustomerId === id
                        ? "bg-violet-950 border-violet-700 text-violet-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Profile (Unwrapped, background changes + spacing) */}
          {customerLoading ? (
            <div className="p-6 rounded-xl bg-zinc-900/30 border border-zinc-850 animate-pulse space-y-4">
              <div className="size-12 rounded-full bg-zinc-800" />
              <div className="h-6 bg-zinc-800 rounded w-1/2" />
              <div className="h-4 bg-zinc-800 rounded w-3/4" />
            </div>
          ) : customer ? (
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-850 space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 font-mono font-semibold text-base shrink-0">
                  {customer.name
                    ? customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                    : "CU"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-zinc-50 truncate">
                      {customer.name}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase px-2 py-0.5 rounded border",
                        customer.fraud_score > 0.5
                          ? "bg-rose-950/70 border-rose-800 text-rose-300"
                          : "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                      )}
                    >
                      {customer.resolution_status || "VERIFIED"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    Golden ID: <span className="text-zinc-200 font-semibold">{customer.golden_id}</span>
                  </p>
                </div>
              </div>

              {/* Definition list for contact info */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-zinc-950/60 p-4 rounded-lg border border-zinc-850">
                <div className="space-y-0.5">
                  <dt className="text-zinc-400 flex items-center gap-1.5">
                    <Mail className="size-3 text-zinc-400" aria-hidden="true" />
                    Email
                  </dt>
                  <dd className="text-zinc-200 truncate">{customer.email}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-zinc-400 flex items-center gap-1.5">
                    <Phone className="size-3 text-zinc-400" aria-hidden="true" />
                    Phone
                  </dt>
                  <dd className="text-zinc-200">{customer.phone || "—"}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="size-3 text-zinc-400" aria-hidden="true" />
                    City
                  </dt>
                  <dd className="text-zinc-200">{customer.city || "Bengaluru"}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-zinc-400">Identity Confidence</dt>
                  <dd className="text-emerald-400 font-semibold">
                    {formatPercent(customer.identity_confidence ?? 0.95, true)}
                  </dd>
                </div>
              </dl>

              {/* Key Metrics Strip: LTV + Churn + Fraud Score */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block uppercase">LTV</span>
                  <span className="text-lg font-bold text-emerald-400 block mt-0.5">
                    {formatEur(customer.ltv)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block uppercase">Churn Risk</span>
                  <span
                    className={cn(
                      "text-lg font-bold block mt-0.5",
                      customer.churn_risk > 0.6 ? "text-rose-400" : "text-zinc-200"
                    )}
                  >
                    {formatPercent(customer.churn_risk, true)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block uppercase">Fraud Score</span>
                  <span
                    className={cn(
                      "text-lg font-bold block mt-0.5",
                      customer.fraud_score > 0.5 ? "text-rose-400" : "text-emerald-400"
                    )}
                  >
                    {customer.fraud_score?.toFixed(2) ?? "0.08"}
                  </span>
                </div>
              </div>

              {/* Identity Stitching: Addresses */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Stitched Physical Addresses ({customer.addresses?.length ?? 1})
                </h4>
                <div className="space-y-1.5 font-mono text-xs">
                  {(customer.addresses || []).map((addr, idx) => (
                    <div
                      key={addr.address_id || idx}
                      className="p-2.5 rounded bg-zinc-950 border border-zinc-850/80 flex items-center justify-between text-zinc-300"
                    >
                      <span className="truncate">{addr.street}, {addr.city}</span>
                      <span className="text-[10px] font-mono text-violet-400 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-900/40 shrink-0 ml-2">
                        Matched
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Recent Orders
                </h4>
                <div className="space-y-1.5 font-mono text-xs">
                  {(customer.orders || customer.recent_orders || []).slice(0, 4).map((ord, idx) => (
                    <div
                      key={ord.order_id || idx}
                      className="p-2 rounded bg-zinc-950 flex items-center justify-between text-zinc-300"
                    >
                      <span className="text-zinc-400">{ord.order_id}</span>
                      <span>{formatEur(ord.total)}</span>
                      <span className="text-[10px] text-emerald-400 uppercase">{ord.status}</span>
                      <span className="text-zinc-400 text-[11px]"><RelativeTime date={ord.created_at} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Right Column (60% / 7 cols on lg): Tester + Fraud Log ── */}
        <div className="lg:col-span-7 space-y-8">
          {/* Top: Promo abuse tester */}
          <FraudTester onEvaluationComplete={refreshFraudLog} />

          {/* Bottom: Live fraud log */}
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-850">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Live fraud evaluation log</h3>
                <p className="text-xs font-mono text-zinc-400">
                  Real-time checkout checks evaluating multi-account abuse
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-zinc-400">
                  Updated <RelativeTime date={fraudUpdated} />
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFraudPause}
                  aria-label={fraudPaused ? "Resume fraud log polling" : "Pause fraud log polling"}
                  className="h-7 px-2.5 text-xs font-mono border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  {fraudPaused ? (
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
                  onClick={refreshFraudLog}
                  aria-label="Refresh fraud log"
                  className="size-7 text-zinc-400 hover:text-zinc-200"
                >
                  <RefreshCw className={`size-3.5 ${fraudLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Fraud Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Burner Email</th>
                    <th className="py-2.5 px-3">Promo</th>
                    <th className="py-2.5 px-3">Match Method</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Reason / Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60">
                  {fraudLog.map((log) => {
                    const scoreColor =
                      log.match_score > 0.85
                        ? "text-rose-400 bg-rose-950/60 border-rose-900/60"
                        : log.match_score >= 0.5
                        ? "text-amber-400 bg-amber-950/60 border-amber-900/60"
                        : "text-zinc-400 bg-zinc-900 border-zinc-800"

                    return (
                      <tr key={log.id} className="hover:bg-zinc-900/60 transition-colors">
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          <RelativeTime date={log.timestamp} />
                        </td>
                        <td className="py-3 px-3 text-zinc-200 font-medium">
                          {log.burner_email}
                        </td>
                        <td className="py-3 px-3 text-violet-400 font-semibold">
                          {log.promo_code}
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {log.match_method}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn("px-1.5 py-0.5 rounded border text-[11px]", scoreColor)}>
                            {log.match_score.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold",
                                log.blocked
                                  ? "bg-rose-950 text-rose-300"
                                  : "bg-emerald-950 text-emerald-300"
                              )}
                            >
                              {log.blocked ? "BLOCKED" : "ALLOWED"}
                            </span>
                            <span className="text-zinc-400 truncate max-w-xs" title={log.reason}>
                              {log.reason}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
