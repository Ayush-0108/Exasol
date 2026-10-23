"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { Copy, Check, Database, Terminal, Layers, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const SQL_VIEWS = [
  {
    name: "VW_CUSTOMER_GOLDEN",
    description: "Unifies master customer identity records across app, web, and loyalty channels with entity resolution status and confidence score.",
    sql: `CREATE OR REPLACE VIEW PULSECART.VW_CUSTOMER_GOLDEN AS
SELECT 
    c.golden_id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.ltv,
    c.fraud_score,
    COUNT(DISTINCT a.address_id) AS addresses_linked,
    COUNT(DISTINCT o.order_id) AS total_orders,
    CASE 
        WHEN c.fraud_score > 0.50 THEN 'SUSPECTED_ALIAS'
        WHEN COUNT(DISTINCT a.address_id) > 1 THEN 'MULTI_ADDRESS_IDENTITY'
        ELSE 'VERIFIED_SINGLE'
    END AS resolution_status,
    ROUND(1.0 - c.fraud_score, 2) AS identity_confidence
FROM PULSECART.customer_golden_id c
LEFT JOIN PULSECART.customer_address_history a ON c.golden_id = a.golden_id
LEFT JOIN PULSECART.orders o ON c.golden_id = o.golden_id
GROUP BY c.golden_id, c.name, c.email, c.phone, c.city, c.ltv, c.fraud_score;`,
  },
  {
    name: "VW_STOCKOUT_WARNINGS",
    description: "Computes real-time runout probabilities for quick-commerce dark stores using 6-hour machine learning demand forecasts.",
    sql: `CREATE OR REPLACE VIEW PULSECART.VW_STOCKOUT_WARNINGS AS
SELECT 
    si.store_id,
    ds.name AS store_name,
    ds.city AS store_city,
    si.sku,
    ii.name AS sku_name,
    ii.category,
    si.current_stock,
    si.reorder_point,
    df.predicted_demand_6h,
    df.predicted_demand_24h,
    CASE 
        WHEN si.current_stock < df.predicted_demand_6h THEN 'CRITICAL'
        WHEN si.current_stock < df.predicted_demand_6h * 1.2 THEN 'WARNING'
        ELSE 'HEALTHY'
    END AS stockout_severity,
    GREATEST(0, (df.predicted_demand_24h * 3) - si.current_stock) AS recommended_reorder_qty,
    ROUND(si.current_stock * 1.0 / NULLIF(df.predicted_demand_6h, 0) * 6.0, 1) AS estimated_runout_hours
FROM PULSECART.store_inventory si
JOIN PULSECART.dark_store ds ON si.store_id = ds.store_id
JOIN PULSECART.inventory_item ii ON si.sku = ii.sku
JOIN PULSECART.demand_forecast df 
  ON si.store_id = df.store_id 
 AND si.sku = df.sku 
 AND df.forecast_date = CURRENT_DATE;`,
  },
  {
    name: "VW_CHURN_RISK",
    description: "Blends natural language customer sentiment and LLM churn risk scores into customer lifetime value protection metrics.",
    sql: `CREATE OR REPLACE VIEW PULSECART.VW_CHURN_RISK AS
SELECT 
    c.golden_id,
    c.name AS customer_name,
    c.email,
    c.city,
    c.ltv,
    c.churn_risk AS blended_churn_risk,
    c.churn_label,
    COUNT(t.ticket_id) AS total_tickets,
    SUM(CASE WHEN t.churn_risk_score >= 0.70 THEN 1 ELSE 0 END) AS high_risk_tickets,
    SUM(CASE WHEN t.offer_sent = TRUE THEN 1 ELSE 0 END) AS retention_offers_sent,
    MAX(t.created_at) AS last_ticket_date
FROM PULSECART.customer_golden_id c
LEFT JOIN PULSECART.support_tickets t ON c.golden_id = t.golden_id
GROUP BY c.golden_id, c.name, c.email, c.city, c.ltv, c.churn_risk, c.churn_label;`,
  },
  {
    name: "VW_RETURNS_ABUSERS",
    description: "Pinpoints high-velocity refunders and policy exploiters, calculating net margin erosion and return frequency bands.",
    sql: `CREATE OR REPLACE VIEW PULSECART.VW_RETURNS_ABUSERS AS
SELECT 
    c.golden_id,
    c.name AS customer_name,
    c.city,
    c.ltv,
    COUNT(r.return_id) AS total_returns,
    SUM(r.refund_amount) AS total_refunded_eur,
    SUM(r.margin_impact) AS total_margin_lost_eur,
    ROUND(COUNT(r.return_id) * 1.0 / NULLIF((SELECT COUNT(*) FROM PULSECART.orders WHERE golden_id = c.golden_id), 0), 2) AS return_rate,
    CASE 
        WHEN COUNT(r.return_id) >= 3 AND SUM(r.margin_impact) > 30 THEN 'RETURNS_ABUSER'
        WHEN COUNT(r.return_id) >= 2 AND SUM(r.margin_impact) > 15 THEN 'MODERATE_RISK'
        ELSE 'LOW_RISK'
    END AS abuse_band
FROM PULSECART.customer_golden_id c
JOIN PULSECART.return_events r ON c.golden_id = r.golden_id
GROUP BY c.golden_id, c.name, c.city, c.ltv;`,
  },
  {
    name: "MV_CUSTOMER_360",
    description: "Cross-module synthesis joining Identity, Inventory Orders, Churn Tickets, and Returns into a unified realized net margin view.",
    sql: `CREATE OR REPLACE VIEW PULSECART.MV_CUSTOMER_360 AS
SELECT 
    c.golden_id,
    c.customer_id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.status AS account_status,
    c.ltv,
    c.churn_risk,
    c.churn_label,
    c.fraud_score,
    COALESCE(o.order_count, 0) AS total_orders,
    COALESCE(o.total_spend, 0.0) AS total_spend,
    COALESCE(t.ticket_count, 0) AS total_tickets,
    COALESCE(t.avg_ticket_churn, 0.0) AS avg_ticket_churn_score,
    COALESCE(r.return_count, 0) AS total_returns,
    COALESCE(r.margin_lost, 0.0) AS total_return_margin_lost,
    ROUND(COALESCE(o.total_spend, 0.0) - COALESCE(r.margin_lost, 0.0), 2) AS net_realized_margin
FROM PULSECART.customer_golden_id c
LEFT JOIN (
    SELECT golden_id, COUNT(*) AS order_count, SUM(total) AS total_spend
    FROM PULSECART.orders
    GROUP BY golden_id
) o ON c.golden_id = o.golden_id
LEFT JOIN (
    SELECT golden_id, COUNT(*) AS ticket_count, AVG(churn_risk_score) AS avg_ticket_churn
    FROM PULSECART.support_tickets
    GROUP BY golden_id
) t ON c.golden_id = t.golden_id
LEFT JOIN (
    SELECT golden_id, COUNT(*) AS return_count, SUM(margin_impact) AS margin_lost
    FROM PULSECART.return_events
    GROUP BY golden_id
) r ON c.golden_id = r.golden_id;`,
  },
]

const SCHEMA_TABLES = [
  { name: "PULSECART.customer_golden_id", desc: "Master golden customer identity table with LTV, churn risk, and fraud score" },
  { name: "PULSECART.customer_address_history", desc: "Historical delivery address variants used for fuzzy matching and alias detection" },
  { name: "PULSECART.support_tickets", desc: "Zendesk customer tickets enriched with Groq sentiment, category, and churn score" },
  { name: "PULSECART.dark_store", desc: "Physical micro-fulfillment centers with geographical coordinates and delivery zones" },
  { name: "PULSECART.inventory_item", desc: "Product catalog items with category, unit cost, packaging type, and perishable flags" },
  { name: "PULSECART.store_inventory", desc: "Live on-shelf stock levels and reorder safety thresholds per dark store hub" },
  { name: "PULSECART.demand_forecast", desc: "Machine learning 6-hour and 24-hour demand predictions per store and SKU" },
  { name: "PULSECART.orders", desc: "Completed grocery delivery orders with items count, total value, and delivery hub" },
  { name: "PULSECART.order_items", desc: "Line-level item quantities and gross margins per checkout transaction" },
  { name: "PULSECART.return_events", desc: "Refund and return claims with reason codes, refunded amount, and reverse margin impact" },
  { name: "PULSECART.fraud_evaluation_log", desc: "Audit log of all checkout promo evaluations, match algorithms, and block decisions" },
  { name: "PULSECART.pipeline_event_log", desc: "Real-time streaming ingestion heartbeat and latency metrics across the 5 source systems" },
  { name: "PULSECART.retention_offers", desc: "Automated wallet credit vouchers and retention offers dispatched to high-risk customers" },
]

// Lightweight syntax highlighter rendering tokenized spans
function HighlightedSql({ sql }: { sql: string }) {
  const lines = sql.split("\n")

  return (
    <pre className="font-mono text-xs text-zinc-300 p-4 rounded-lg bg-zinc-950 overflow-x-auto leading-relaxed selection:bg-emerald-950 selection:text-emerald-300">
      <code>
        {lines.map((line, idx) => {
          if (line.trim().startsWith("--")) {
            return (
              <span key={idx} className="text-zinc-500 block">
                {line}
              </span>
            )
          }

          // Simple token highlighting using regex
          const tokens = line.split(
            /(\b(?:CREATE|OR|REPLACE|VIEW|AS|SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|GROUP|BY|ORDER|CASE|WHEN|THEN|ELSE|END|ROUND|COUNT|DISTINCT|SUM|AVG|MAX|MIN|COALESCE|NULLIF|GREATEST|CURRENT_DATE)\b|'[^']*'|\d+\.?\d*)/g
          )

          return (
            <span key={idx} className="block">
              {tokens.map((token, tIdx) => {
                if (
                  /^(CREATE|OR|REPLACE|VIEW|AS|SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|GROUP|BY|ORDER|CASE|WHEN|THEN|ELSE|END|ROUND|COUNT|DISTINCT|SUM|AVG|MAX|MIN|COALESCE|NULLIF|GREATEST|CURRENT_DATE)$/.test(
                    token
                  )
                ) {
                  return (
                    <span key={tIdx} className="text-emerald-400 font-semibold">
                      {token}
                    </span>
                  )
                }
                if (token.startsWith("'") && token.endsWith("'")) {
                  return (
                    <span key={tIdx} className="text-amber-300">
                      {token}
                    </span>
                  )
                }
                if (/^\d+\.?\d*$/.test(token)) {
                  return (
                    <span key={tIdx} className="text-violet-400">
                      {token}
                    </span>
                  )
                }
                return <span key={tIdx}>{token}</span>
              })}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

export default function ExasolSqlPage() {
  const [copiedView, setCopiedView] = useState<string | null>(null)

  const handleCopySql = (name: string, sql: string) => {
    navigator.clipboard.writeText(sql)
    setCopiedView(name)
    toast.success(`Copied ${name} SQL DDL to clipboard`)
    setTimeout(() => setCopiedView(null), 2000)
  }

  return (
    <div className="space-y-12">
      {/* ── Header ── */}
      <div className="space-y-3 pb-6 border-b border-zinc-850">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Analytics Compute Foundation
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
          Exasol SQL reference
        </h1>
        <p className="text-sm font-mono text-zinc-400 leading-relaxed max-w-3xl">
          Five production views powering PulseCart. Run these in your Exasol Personal instance to verify sub-second columnar performance.
        </p>

        {/* "Why Exasol?" Callout with emerald bullets */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 mt-4 space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Why Exasol for quick-commerce?
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs text-zinc-300 pt-1">
            <li className="flex items-start gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">In-Memory Columnar:</strong> Eliminates disk I/O bottlenecks across streaming checkout events.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">Billion-Row Scale:</strong> Sub-second analytical queries on massive order and ticket histories.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">Live Materialization:</strong> Powers operator dashboards with zero stale pre-aggregation caches.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Schema Overview: 13 Tables Definition List ── */}
      <section aria-labelledby="schema-heading" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
          <div>
            <h2 id="schema-heading" className="text-base font-semibold text-zinc-100">
              Database schema overview
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Thirteen analytical tables resident in the PULSECART Exasol schema
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400">13 tables active</span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {SCHEMA_TABLES.map((table) => (
            <div
              key={table.name}
              className="p-3.5 rounded-lg bg-zinc-900/30 border border-zinc-850/80 space-y-1"
            >
              <dt className="font-semibold text-zinc-200 text-xs">
                {table.name}
              </dt>
              <dd className="text-zinc-400 text-[11px] leading-relaxed">
                {table.desc}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 5 SQL View Cards (Spaced sections, no bordered card clutter) ── */}
      <section aria-labelledby="views-heading" className="space-y-8">
        <div className="pb-2 border-b border-zinc-850">
          <h2 id="views-heading" className="text-base font-semibold text-zinc-100">
            Production analytical views
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Embedded DDL views powering the Operator Dashboard
          </p>
        </div>

        <div className="space-y-10">
          {SQL_VIEWS.map((view, idx) => (
            <div key={view.name} className="space-y-3 pb-8 border-b border-zinc-850/60 last:border-b-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400">0{idx + 1}</span>
                    <h3 className="text-base font-mono font-semibold text-zinc-100">
                      {view.name}
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    {view.description}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySql(view.name, view.sql)}
                  className="h-8 px-3 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 shrink-0 self-start sm:self-center gap-1.5"
                >
                  {copiedView === view.name ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden="true" />
                      Copy SQL
                    </>
                  )}
                </Button>
              </div>

              {/* Syntax Highlighted SQL Pre */}
              <HighlightedSql sql={view.sql} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Integration Notes ── */}
      <section aria-labelledby="integration-heading" className="space-y-3 pt-6 border-t border-zinc-850 font-mono text-xs">
        <h2 id="integration-heading" className="text-sm font-semibold text-zinc-100">
          Operator architecture &amp; UDF integration notes
        </h2>
        <ul className="space-y-2 text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
            <span>
              The Next.js operator frontend consumes Exasol views via the FastAPI REST gateway (`http://localhost:8000`) using connection pooling over `pyexasol`.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
            <span>
              The Exasol scalar Python UDF specification is documented in `udf/fuzzy_match.sql` to execute string similarity natively in the columnar compute cluster.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
            <span>
              For developer portability across local evaluation containers, fuzzy address matching also incorporates a Python difflib fallback within FastAPI checkout verification.
            </span>
          </li>
        </ul>
      </section>
    </div>
  )
}
