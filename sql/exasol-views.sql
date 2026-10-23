-- ============================================================================
-- PulseCart: Production-Ready Exasol Views
-- ============================================================================
-- These analytical views showcase Exasol's in-memory columnar compute engine.
-- They provide real-time aggregation across millions of quick-commerce events
-- and power the Operator Dashboard.
-- ============================================================================

OPEN SCHEMA PULSECART;

-- ============================================================================
-- View 1: VW_CUSTOMER_GOLDEN (Powers Module 1: Master Identity Resolution)
-- Unifies customer records across app, web, and loyalty channels.
-- Displays identity resolution status and linkage confidence.
-- ============================================================================
CREATE OR REPLACE VIEW PULSECART.VW_CUSTOMER_GOLDEN AS
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
GROUP BY c.golden_id, c.name, c.email, c.phone, c.city, c.ltv, c.fraud_score;


-- ============================================================================
-- View 2: VW_STOCKOUT_WARNINGS (Powers Module 2: Predictive Inventory Radar)
-- Computes real-time runout probabilities for quick-commerce dark stores.
-- Prioritizes stock replenishments based on 6-hour machine learning demand forecasts.
-- ============================================================================
CREATE OR REPLACE VIEW PULSECART.VW_STOCKOUT_WARNINGS AS
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
 AND df.forecast_date = CURRENT_DATE;


-- ============================================================================
-- View 3: VW_CHURN_RISK (Powers Module 3: Churn Miner & Retention Engine)
-- Blends natural language customer sentiment and LLM churn risk scores 
-- from support tickets into customer lifetime value protection metrics.
-- ============================================================================
CREATE OR REPLACE VIEW PULSECART.VW_CHURN_RISK AS
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
GROUP BY c.golden_id, c.name, c.email, c.city, c.ltv, c.churn_risk, c.churn_label;


-- ============================================================================
-- View 4: VW_RETURNS_ABUSERS (Powers Module 4: Margin Protection)
-- Pinpoints high-velocity refunders and policy exploiters.
-- Calculates net margin impact, reverse logistics overhead, and return velocity.
-- ============================================================================
CREATE OR REPLACE VIEW PULSECART.VW_RETURNS_ABUSERS AS
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
GROUP BY c.golden_id, c.name, c.city, c.ltv;


-- ============================================================================
-- View 5: MV_CUSTOMER_360 (Customer 360 Full Cross-Module Synthesis)
-- Joins all 4 operational modules per customer:
-- Identity (Module 1) + Orders & Inventory (Module 2) + Churn Tickets (Module 3) + Returns (Module 4)
-- ============================================================================
CREATE OR REPLACE VIEW PULSECART.MV_CUSTOMER_360 AS
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
) r ON c.golden_id = r.golden_id;
