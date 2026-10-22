export interface HealthResponse {
  ok: boolean
  database: string
  version?: string
}

export interface ROIReport {
  revenue_saved_today: number
  revenue_saved_week: number
  breakdown: {
    fraud_blocked: number
    churn_retained: number
    restock_avoided: number
  }
  currency?: string
  last_calculated?: string
}

export interface PipelineSource {
  name: string
  rows_ingested_24h: number
  latency_ms: number
  status: 'healthy' | 'warning' | 'critical'
}

export interface PipelineHealth {
  sources: PipelineSource[]
  throughput_rows_per_min: number
  sparkline_60min: number[]
  updated_at: string
}

export interface AlertItem {
  id: string
  timestamp: string
  severity: 'critical' | 'warning' | 'info'
  module: 'identity' | 'inventory' | 'tickets' | 'returns' | 'system'
  title: string
  message: string
}

export interface SystemHealth {
  database: string
  llm_service: string
  last_pipeline_event: string
  uptime_seconds: number
  table_count?: number
  endpoint_count?: number
}

export interface CustomerAddress {
  address_id: string
  street: string
  city: string
  postal_code?: string
  confidence?: number
}

export interface CustomerOrderSummary {
  order_id: string
  total: number
  status: string
  created_at: string
}

export interface CustomerTicketSummary {
  ticket_id: string
  subject: string
  churn_risk_score: number
  status: string
  created_at: string
}

export interface CustomerGolden {
  golden_id: string
  customer_id?: string
  name: string
  email: string
  phone: string
  city: string
  status?: string
  ltv: number
  churn_risk: number
  churn_label: string
  fraud_score: number
  addresses_linked?: number
  total_orders?: number
  resolution_status?: string
  identity_confidence?: number
  addresses?: CustomerAddress[]
  orders?: CustomerOrderSummary[]
  tickets?: CustomerTicketSummary[]
  recent_orders?: CustomerOrderSummary[]
}

export interface CheckoutRequest {
  email: string
  address: string
  promo_code: string
}

export interface CheckoutResult {
  ok: boolean
  blocked: boolean
  match_method?: string
  match_score?: number
  reason?: string
  golden_id?: string
}

export interface FraudLogItem {
  id: string
  timestamp: string
  burner_email: string
  promo_code: string
  match_method: string
  match_score: number
  reason: string
  blocked: boolean
}

export interface FraudStats {
  total_evaluated: number
  blocked_count: number
  promo_abusers_caught: number
  estimated_savings_eur: number
}

export interface DarkStoreItem {
  store_id: string
  name: string
  city: string
  zone: string
  health_score: number
  total_skus: number
  critical_count: number
  warning_count: number
  healthy_count: number
}

export interface StockoutWarning {
  store_id: string
  store_name: string
  store_city: string
  sku: string
  sku_name: string
  category: string
  current_stock: number
  reorder_point: number
  predicted_demand_6h: number
  predicted_demand_24h: number
  stockout_severity: 'CRITICAL' | 'WARNING' | 'HEALTHY'
  recommended_reorder_qty: number
  estimated_runout_hours: number
}

export interface StoreHeatmapItem {
  sku: string
  sku_name: string
  category: string
  current_stock: number
  reorder_point: number
  predicted_demand_6h: number
  status: 'critical' | 'warning' | 'healthy'
}

export interface SupportTicket {
  ticket_id: string
  golden_id: string
  customer_name?: string
  customer_email?: string
  customer_ltv?: number
  customer_churn_label?: string
  subject: string
  body: string
  sentiment?: 'positive' | 'neutral' | 'negative' | 'critical'
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  churn_risk_score?: number
  category?: string
  summary?: string
  recommended_action?: string
  suggested_offer?: string | null
  offer_sent?: boolean
  created_at: string
  analyzed_at?: string | null
}

export interface TicketStats {
  total: number
  pending: number
  analyzed: number
  high_churn_risk: number
}

export interface ReturnAbuser {
  rank?: number
  golden_id: string
  customer_name: string
  city: string
  ltv: number
  total_returns: number
  total_refunded_eur: number
  total_margin_lost_eur: number
  return_rate: number
  abuse_band: 'RETURNS_ABUSER' | 'MODERATE_RISK' | 'LOW_RISK' | string
}

export interface CustomerReturnHistoryItem {
  return_id: string
  order_id: string
  sku: string
  sku_name: string
  return_reason: string
  refund_amount: number
  margin_impact: number
  created_at: string
}

export interface ToxicSku {
  sku: string
  sku_name: string
  category: string
  total_sold: number
  total_returned: number
  return_rate: number
  total_refunded: number
  margin_lost: number
  net_margin: number
  is_toxic: boolean
}

export interface ReturnsImpactSummary {
  total_margin_lost_eur: number
  total_refunded_eur: number
  erosion_percentage: number
  avg_impact_per_return: number
  by_reason: Array<{ reason: string; margin_lost: number }>
  by_category: Array<{ category: string; margin_lost: number }>
}
