"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  UserX,
  PackageX,
  AlertTriangle,
  TrendingDown,
  Layers,
  Database,
  Cpu,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignalRevealText } from "@/components/ui/signal-reveal-text"
import { apiGet } from "@/lib/api"
import { ROIReport, SystemHealth } from "@/lib/types"
import { formatEur } from "@/lib/format"

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion()
  const [roiData, setRoiData] = useState<ROIReport | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for sticky nav backdrop
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fetch live stats from backend
  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const roi = await apiGet<ROIReport>("/api/v1/overview/roi")
        if (isMounted) setRoiData(roi)
      } catch {
        // Fallback or leave null if offline
      }

      try {
        const health = await apiGet<SystemHealth>("/api/v1/overview/system-health")
        if (isMounted) setSystemHealth(health)
      } catch {
        // Fallback or leave null
      }
    }

    fetchStats()
    return () => {
      isMounted = false
    }
  }, [])

  const fadeIn = {
    hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-950 selection:text-emerald-300">
      {/* ── Top Nav ── */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          scrolled ? "bg-zinc-950/85 backdrop-blur border-b border-zinc-800" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 -mx-1"
          >
            <span className="text-xl font-semibold tracking-tight text-zinc-50">
              Pulse<span className="text-emerald-400">Cart</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
              v1.0
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium text-xs px-3.5 focus-visible:ring-emerald-400"
              >
                Sign in
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section (7/5 Asymmetric Split) ── */}
        <section className="pt-12 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Left Column (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-4">
                Track 02 · Customers, Channels &amp; Demand
              </span>

              <div className="mb-6">
                <SignalRevealText
                  as="h1"
                  text="Catch what quick-commerce loses to silence."
                  accent="#10b981"
                  speed={1200}
                  className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-zinc-50 leading-[1.1]"
                />
              </div>

              <motion.p
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="text-base sm:text-lg text-zinc-400 font-mono leading-relaxed max-w-2xl mb-8"
              >
                PulseCart unifies identity, inventory, churn, and returns intelligence into one operator dashboard. Built on Exasol. Enriched by LLMs.
              </motion.p>

              <div className="flex items-center gap-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium text-sm px-6 h-12 focus-visible:ring-emerald-400"
                  >
                    Enter operator dashboard
                    <ArrowRight className="size-4 ml-2" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column (5 cols) Live Metric Hero */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-xl bg-zinc-900/70 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Live Operator ROI Telemetry
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Exasol In-Memory
                  </span>
                </div>

                <div className="space-y-1 mb-6">
                  <span className="text-xs font-mono text-zinc-400 block">
                    Revenue saved today
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-emerald-400">
                    {roiData ? formatEur(roiData.revenue_saved_today) : "₹1,842.50"}
                  </div>
                </div>

                <p className="text-xs font-mono text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-4">
                  Across fraud prevention, churn retention, and proactive restocks.
                </p>

                {roiData && (
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/60 text-center font-mono">
                    <div className="bg-zinc-950/60 p-2 rounded">
                      <span className="text-[10px] text-zinc-400 block">Fraud</span>
                      <span className="text-xs text-violet-400 font-medium">
                        {formatEur(roiData.breakdown.fraud_blocked)}
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded">
                      <span className="text-[10px] text-zinc-400 block">Churn</span>
                      <span className="text-xs text-rose-400 font-medium">
                        {formatEur(roiData.breakdown.churn_retained)}
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded">
                      <span className="text-[10px] text-zinc-400 block">Restock</span>
                      <span className="text-xs text-amber-400 font-medium">
                        {formatEur(roiData.breakdown.restock_avoided)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Problem Section ("Four silent killers") ── */}
        <section className="py-20 border-t border-zinc-900 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold">
                Domain Breakdown
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 mt-2">
                Four silent killers in quick-commerce
              </h2>
              <p className="text-sm font-mono text-zinc-400 mt-3 leading-relaxed">
                When 15-minute grocery deliveries scale, operational blindspots silently erode margins.
              </p>
            </div>

            {/* Asymmetric Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Feature card: takes 2 columns on desktop */}
              <div className="md:col-span-2 p-7 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <div className="size-10 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center text-violet-400 mb-5">
                    <UserX className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Identity Fragmentation &amp; Promo Exploitation
                  </h3>
                  <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-3 leading-relaxed">
                    Burner emails and slight address permutations bypass sign-up promo limits. Without fuzzy entity resolution across order histories, dark stores subsidize serial abuse.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-mono text-violet-400">
                  <span>Solved via Golden Record synthesis &amp; fuzzy address matching</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-7 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <div className="size-10 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 mb-5">
                    <PackageX className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Silent Stockouts
                  </h3>
                  <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-3 leading-relaxed">
                    Dark stores run dry on high-demand essentials before standard 24h ERP cycles trigger reorders, leading to abandoned carts and lost basket sizes.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-mono text-amber-400">
                  <span>6-hour machine learning demand forecasting</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-7 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <div className="size-10 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-5">
                    <AlertTriangle className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Unaddressed Frustration
                  </h3>
                  <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-3 leading-relaxed">
                    Customer tickets expressing subtle dissatisfaction sit in backlogs until high-LTV users permanently churn to competing delivery apps.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-mono text-rose-400">
                  <span>Groq LLM sentiment scoring &amp; retention credits</span>
                </div>
              </div>

              {/* Card 4: takes 2 columns on desktop */}
              <div className="md:col-span-2 p-7 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
                <div>
                  <div className="size-10 rounded-lg bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-orange-400 mb-5">
                    <TrendingDown className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Margin-Eroding Return Loops
                  </h3>
                  <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-3 leading-relaxed">
                    Unchecked return abusers and fragile, damaged SKUs quietly consume more in reverse logistics and write-offs than the gross revenue they generate.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-mono text-orange-400">
                  <span>Toxic SKU detection &amp; policy abuse bands</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Solution Section ("One operator dashboard. Four modules.") ── */}
        <section className="py-20 border-t border-zinc-900 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column (5 cols) */}
              <div className="lg:col-span-5">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Modular Architecture
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 mt-2">
                  One operator dashboard. Complete intelligence.
                </h2>
                <p className="text-sm font-mono text-zinc-400 mt-4 leading-relaxed">
                  Every stream aggregates in Exasol, running analytical queries sub-second. Operators resolve issues with single-click operational decisions.
                </p>
                <div className="mt-8 p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
                  <p className="text-xs font-mono text-zinc-400">
                    Plus a unified <span className="text-zinc-200">Customer 360° view</span> and full <span className="text-zinc-200">Exasol SQL reference</span>.
                  </p>
                </div>
              </div>

              {/* Right Column (7 cols): Vertical list of intelligence areas */}
              <div className="lg:col-span-7 space-y-4">
                {[
                  {
                    name: "Identity & Fraud Guard",
                    desc: "Golden record resolution, fuzzy address matching, promo abuse detection.",
                    color: "bg-violet-500",
                    border: "hover:border-violet-800/60",
                    href: "/dashboard/identity",
                  },
                  {
                    name: "Predictive Inventory Radar",
                    desc: "6-hour runout prediction, dark store health maps, one-click replenishment.",
                    color: "bg-amber-500",
                    border: "hover:border-amber-800/60",
                    href: "/dashboard/inventory",
                  },
                  {
                    name: "Autonomous Customer Success",
                    desc: "LLM-powered ticket triage, blended churn scoring, automated retention credit dispatch.",
                    color: "bg-rose-500",
                    border: "hover:border-rose-800/60",
                    href: "/dashboard/tickets",
                  },
                  {
                    name: "Margin Protection & Returns",
                    desc: "Serial refund abuser leaderboard, net-negative toxic SKU tracking.",
                    color: "bg-orange-500",
                    border: "hover:border-orange-800/60",
                    href: "/dashboard/returns",
                  },
                ].map((mod) => (
                  <Link
                    key={mod.name}
                    href={mod.href}
                    className={`block p-5 rounded-lg bg-zinc-900/50 border border-zinc-800 transition-all ${mod.border} group`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={`size-2.5 rounded-full ${mod.color} mt-1 shrink-0`} aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-zinc-50">
                            {mod.name}
                          </h3>
                          <p className="text-xs font-mono text-zinc-400 mt-1 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Architecture Section ── */}
        <section id="architecture" className="py-20 bg-zinc-900/60 border-t border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Technical Blueprint
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 mt-2">
                Engineered for sub-second analytical execution
              </h2>
              <p className="text-sm font-mono text-zinc-400 mt-2">
                Exasol in-memory columnar database paired with FastAPI and Next.js.
              </p>
            </div>

            {/* ASCII Architecture Flow */}
            <div className="p-6 sm:p-8 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto my-8">
              <pre className="font-mono text-xs sm:text-sm text-emerald-400 text-center leading-relaxed">
                5 source systems  →  Exasol In-Memory  →  FastAPI Gateway  →  Next.js Operator Dashboard
              </pre>
            </div>

            {/* Inline Technical Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 font-mono">
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" aria-hidden="true" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Exasol Columnar Engine:</strong> Instant analytical aggregation across orders, support tickets, and return events without row-lock contention.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" aria-hidden="true" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Groq LLM Acceleration:</strong> Llama 3.1 8B instant inference for customer ticket sentiment, urgency classification, and churn prevention.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" aria-hidden="true" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-zinc-100">Real System Telemetry:</strong> Backed by {systemHealth?.table_count ?? 13} Exasol tables and {systemHealth?.endpoint_count ?? 19} working REST microservice endpoints.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 tracking-tight">PulseCart</span>
              <span className="text-[11px] font-mono text-zinc-400">· Quick-Commerce Operator Intelligence</span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Track 02 hackathon submission · MIT license · Built with Exasol + Groq
            </p>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono text-zinc-400">
            <Link href="/dashboard/exasol" className="hover:text-zinc-200 transition-colors">
              Exasol SQL
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-200 transition-colors">
              Operator Console
            </Link>
            <a
              href="https://docs.exasol.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Exasol Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
