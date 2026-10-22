-- ============================================================================
-- PulseCart: Real-Time Customer Intelligence Platform
-- Exasol Database Initialization Script (All 5 Modules)
-- ============================================================================
-- Note: Exasol is an in-memory columnar engine that creates and maintains
-- internal indexes automatically. No manual CREATE INDEX is required.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS PULSECART;
OPEN SCHEMA PULSECART;

-- Drop existing tables in reverse dependency order for clean setup
DROP TABLE IF EXISTS PULSECART.fraud_event CASCADE;
DROP TABLE IF EXISTS PULSECART.promo_code CASCADE;
DROP TABLE IF EXISTS PULSECART.pipeline_event CASCADE;
DROP TABLE IF EXISTS PULSECART.return_events CASCADE;
DROP TABLE IF EXISTS PULSECART.order_items CASCADE;
DROP TABLE IF EXISTS PULSECART.orders CASCADE;
DROP TABLE IF EXISTS PULSECART.demand_forecast CASCADE;
DROP TABLE IF EXISTS PULSECART.store_inventory CASCADE;
DROP TABLE IF EXISTS PULSECART.inventory_item CASCADE;
DROP TABLE IF EXISTS PULSECART.dark_store CASCADE;
DROP TABLE IF EXISTS PULSECART.support_tickets CASCADE;
DROP TABLE IF EXISTS PULSECART.customer_address_history CASCADE;
DROP TABLE IF EXISTS PULSECART.customer_golden_id CASCADE;

-- ============================================================================
-- 1. Identity & Master Customer Tables (Module 1)
-- ============================================================================

CREATE TABLE PULSECART.customer_golden_id (
    golden_id    VARCHAR(40) PRIMARY KEY,
    customer_id  VARCHAR(40),
    email        VARCHAR(200),
    phone        VARCHAR(30),
    name         VARCHAR(100),
    city         VARCHAR(50),
    ltv          DECIMAL(10,2) DEFAULT 0,
    churn_risk   DECIMAL(3,2) DEFAULT 0,
    churn_label  VARCHAR(20) DEFAULT 'healthy',
    status       VARCHAR(20) DEFAULT 'active',
    fraud_score  DECIMAL(3,2) DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PULSECART.customer_address_history (
    address_id      VARCHAR(40) PRIMARY KEY,
    golden_id       VARCHAR(40) NOT NULL REFERENCES PULSECART.customer_golden_id(golden_id),
    address_text    VARCHAR(1000) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Support Tickets Table (Module 3 - Enhanced)
-- ============================================================================

CREATE TABLE PULSECART.support_tickets (
    ticket_id           VARCHAR(40) PRIMARY KEY,
    golden_id           VARCHAR(40) NOT NULL,
    subject             VARCHAR(200) NOT NULL,
    body                VARCHAR(4000) NOT NULL,
    sentiment           VARCHAR(20),
    urgency             VARCHAR(20),
    churn_risk_score    DECIMAL(3,2),
    category            VARCHAR(30),
    llm_summary         VARCHAR(500),
    recommended_action  VARCHAR(500),
    suggested_offer     VARCHAR(100),
    llm_analyzed        BOOLEAN DEFAULT FALSE,
    offer_sent          BOOLEAN DEFAULT FALSE,
    offer_sent_at       TIMESTAMP,
    llm_model_used      VARCHAR(50),
    analyzed_at         TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. Predictive Inventory Tables (Module 2)
-- ============================================================================

CREATE TABLE PULSECART.dark_store (
    store_id    VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    zone_label  VARCHAR(50),
    city        VARCHAR(50),
    lat         DECIMAL(9,6),
    lng         DECIMAL(9,6),
    active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE PULSECART.inventory_item (
    sku         VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(40),
    unit_price  DECIMAL(6,2),
    unit_cost   DECIMAL(6,2)
);

CREATE TABLE PULSECART.store_inventory (
    inventory_id      VARCHAR(40) PRIMARY KEY,
    store_id          VARCHAR(20) NOT NULL REFERENCES PULSECART.dark_store(store_id),
    sku               VARCHAR(20) NOT NULL REFERENCES PULSECART.inventory_item(sku),
    current_stock     INTEGER DEFAULT 0 NOT NULL,
    reorder_point     INTEGER DEFAULT 10 NOT NULL,
    last_restocked_at TIMESTAMP
);

CREATE TABLE PULSECART.demand_forecast (
    forecast_id          VARCHAR(40) PRIMARY KEY,
    store_id             VARCHAR(20) NOT NULL REFERENCES PULSECART.dark_store(store_id),
    sku                  VARCHAR(20) NOT NULL REFERENCES PULSECART.inventory_item(sku),
    forecast_date        DATE NOT NULL,
    predicted_demand_24h INTEGER NOT NULL,
    predicted_demand_6h  INTEGER NOT NULL,
    model_version        VARCHAR(20) DEFAULT 'v1.0',
    generated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. Orders, Items & Returns Tables (Module 4)
-- ============================================================================

CREATE TABLE PULSECART.orders (
    order_id         VARCHAR(40) PRIMARY KEY,
    golden_id        VARCHAR(40) NOT NULL REFERENCES PULSECART.customer_golden_id(golden_id),
    store_id         VARCHAR(20) NOT NULL REFERENCES PULSECART.dark_store(store_id),
    channel          VARCHAR(20) DEFAULT 'app',
    status           VARCHAR(20) DEFAULT 'fulfilled',
    subtotal         DECIMAL(8,2),
    discount_applied DECIMAL(8,2) DEFAULT 0,
    total            DECIMAL(8,2),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at     TIMESTAMP
);

CREATE TABLE PULSECART.order_items (
    item_id      VARCHAR(40) PRIMARY KEY,
    order_id     VARCHAR(40) NOT NULL REFERENCES PULSECART.orders(order_id),
    sku          VARCHAR(20) NOT NULL REFERENCES PULSECART.inventory_item(sku),
    quantity     INTEGER NOT NULL,
    unit_price   DECIMAL(6,2)
);

CREATE TABLE PULSECART.return_events (
    return_id              VARCHAR(40) PRIMARY KEY,
    golden_id              VARCHAR(40) NOT NULL REFERENCES PULSECART.customer_golden_id(golden_id),
    order_id               VARCHAR(40) NOT NULL REFERENCES PULSECART.orders(order_id),
    sku                    VARCHAR(20) NOT NULL REFERENCES PULSECART.inventory_item(sku),
    store_id               VARCHAR(20) NOT NULL REFERENCES PULSECART.dark_store(store_id),
    reason                 VARCHAR(30),
    refund_amount          DECIMAL(8,2),
    margin_impact          DECIMAL(8,2),
    reverse_logistics_cost DECIMAL(6,2) DEFAULT 2.50,
    restocking_cost        DECIMAL(6,2) DEFAULT 1.00,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. Command Center: Pipeline Health, Promos & Fraud (Module 5)
-- ============================================================================

CREATE TABLE PULSECART.pipeline_event (
    event_id        VARCHAR(40) PRIMARY KEY,
    source_system   VARCHAR(30),
    event_type      VARCHAR(20),
    rows_ingested   INTEGER,
    processed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latency_ms      INTEGER
);

CREATE TABLE PULSECART.promo_code (
    code                    VARCHAR(20) PRIMARY KEY,
    discount_amount         DECIMAL(8,2),
    max_uses_per_customer   INTEGER DEFAULT 1,
    valid_until             TIMESTAMP,
    abuse_blocked_count     INTEGER DEFAULT 0
);

CREATE TABLE PULSECART.fraud_event (
    fraud_id             VARCHAR(40) PRIMARY KEY,
    attempted_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    burner_email         VARCHAR(200),
    burner_phone         VARCHAR(30),
    attempted_promo_code VARCHAR(20) REFERENCES PULSECART.promo_code(code),
    matched_golden_id    VARCHAR(40),
    match_method         VARCHAR(50),
    match_score          DECIMAL(4,3),
    block_reason         VARCHAR(200),
    ip_address           VARCHAR(45),
    user_agent           VARCHAR(500),
    "BLOCKED"            BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 6. SEED DATA (Comprehensive multi-module coverage)
-- ============================================================================

-- Customers
INSERT INTO PULSECART.customer_golden_id VALUES
  ('GID-1001', 'CUST-001', 'sarah.connor@example.com',      '+1-555-0199',     'Sarah Connor',  'Springfield', 580.00,  0.32, 'monitor',   'active', 0.10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1002', 'CUST-002', 'alex.mercer@example.com',       '+1-555-0144',     'Alex Mercer',   'San Francisco', 1240.00, 0.18, 'healthy', 'active', 0.05, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1003', 'CUST-003', 'sarah.connor+spam@gmail.com',   '+1-555-0199',     'Sarah Connor',  'Springfield', 580.00,  0.32, 'monitor',   'active', 0.65, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1004', 'CUST-004', 'alex.mercer1@example.com',      '+1-555-0144',     'Alex Mercer',   'San Francisco', 1240.00, 0.18, 'healthy', 'active', 0.55, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1005', 'CUST-005', 'j.doe@example.com',             '+1-555-0188',     'John Doe',      'Springfield', 95.00,   0.78, 'critical',  'active', 0.20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1006', 'CUST-006', 'maya.sharma@example.com',       '+49-30-12345678', 'Maya Sharma',   'Berlin',      320.00,  0.85, 'critical',  'active', 0.05, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1007', 'CUST-007', 'liam.chen@example.com',         '+49-40-98765432', 'Liam Chen',     'Hamburg',     410.00,  0.72, 'critical',  'active', 0.05, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1008', 'CUST-008', 'noah.patel@example.com',        '+1-555-0233',     'Noah Patel',    'New York',    215.00,  0.45, 'at_risk',   'active', 0.30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1009', 'CUST-009', 'emma.kim@example.com',          '+1-555-0244',     'Emma Kim',      'Chicago',     680.00,  0.15, 'healthy',   'active', 0.05, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GID-1010', 'CUST-010', 'lucas.silva@example.com',       '+1-555-0255',     'Lucas Silva',   'Los Angeles', 150.00,  0.68, 'critical',  'active', 0.10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Addresses
INSERT INTO PULSECART.customer_address_history VALUES
  ('ADDR-001', 'GID-1001', 'Apartment 4B, 742 Evergreen Terrace, Springfield, OR 97477', CURRENT_TIMESTAMP),
  ('ADDR-002', 'GID-1002', 'Building 2, Suite 300, 100 Market St, San Francisco, CA 94105', CURRENT_TIMESTAMP),
  ('ADDR-003', 'GID-1002', '456 Elm Street, Apt 12, Seattle, WA 98101', CURRENT_TIMESTAMP),
  ('ADDR-004', 'GID-1005', 'Apt 4B, 742 Evergreen Terrace, Springfield, OR 97477', CURRENT_TIMESTAMP),
  ('ADDR-005', 'GID-1006', 'Linienstraße 100, 10115 Berlin, Germany', CURRENT_TIMESTAMP),
  ('ADDR-006', 'GID-1007', 'Reeperbahn 1, 20359 Hamburg, Germany', CURRENT_TIMESTAMP),
  ('ADDR-007', 'GID-1008', '500 Pine St, Apt 9C, New York, NY 10001', CURRENT_TIMESTAMP),
  ('ADDR-008', 'GID-1009', '88 Oak Avenue, Chicago, IL 60611', CURRENT_TIMESTAMP),
  ('ADDR-009', 'GID-1010', '12 Sunset Blvd, Los Angeles, CA 90028', CURRENT_TIMESTAMP);

-- Dark Stores
INSERT INTO PULSECART.dark_store VALUES
  ('STORE-BER-01', 'Berlin-Mitte Dark Store',     'Berlin Zone A',    'Berlin',   52.5200, 13.4050, TRUE),
  ('STORE-HAM-01', 'Hamburg-Altona Dark Store',   'Hamburg Zone A',   'Hamburg',  53.5511, 9.9937,  TRUE),
  ('STORE-MUC-01', 'Munich-Schwabing Dark Store', 'Munich Zone A',    'Munich',   48.1500, 11.5833, TRUE),
  ('STORE-HBL-01', 'Hubballi Zone A Dark Store',  'Hubballi Zone A',  'Hubballi', 15.3647, 75.1240, TRUE);

-- Inventory SKUs
INSERT INTO PULSECART.inventory_item VALUES
  ('MK-001',  '2% Milk 1L',           'Dairy',         1.49, 1.02),
  ('BR-002',  'Whole Wheat Bread',    'Bakery',        2.29, 1.30),
  ('EG-003',  'Free-Range Eggs (6)',  'Dairy',         2.49, 1.65),
  ('BV-004',  'Sparkling Water 6pk',  'Beverages',     3.99, 2.40),
  ('BG-005',  'Bananas (1kg)',        'Produce',       1.79, 0.95),
  ('AV-006',  'Hass Avocado',         'Produce',       1.19, 0.70),
  ('CH-007',  'Cheddar 200g',         'Dairy',         3.49, 2.10),
  ('CP-008',  'Ground Coffee 250g',   'Beverages',     5.99, 3.40),
  ('TP-009',  'Toilet Paper 12pk',    'Household',     6.49, 3.80),
  ('PS-010',  'Margherita Pizza',     'Frozen',        4.49, 2.55),
  ('JK-011',  'Orange Juice 1L',      'Beverages',     2.79, 1.55),
  ('YG-012',  'Greek Yogurt 500g',    'Dairy',         2.99, 1.75);

-- Store Inventory (48 rows across 4 stores)
INSERT INTO PULSECART.store_inventory VALUES
  -- Berlin (critical on MK, BR, AV, JK)
  ('SI-001', 'STORE-BER-01', 'MK-001', 5,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('SI-002', 'STORE-BER-01', 'BR-002', 3,  10, ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('SI-003', 'STORE-BER-01', 'EG-003', 8,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-004', 'STORE-BER-01', 'BV-004', 25, 10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-005', 'STORE-BER-01', 'BG-005', 15, 10, CURRENT_TIMESTAMP),
  ('SI-006', 'STORE-BER-01', 'AV-006', 4,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('SI-007', 'STORE-BER-01', 'CH-007', 18, 10, CURRENT_TIMESTAMP),
  ('SI-008', 'STORE-BER-01', 'CP-008', 22, 10, CURRENT_TIMESTAMP),
  ('SI-009', 'STORE-BER-01', 'TP-009', 30, 10, CURRENT_TIMESTAMP),
  ('SI-010', 'STORE-BER-01', 'PS-010', 12, 10, CURRENT_TIMESTAMP),
  ('SI-011', 'STORE-BER-01', 'JK-011', 6,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-012', 'STORE-BER-01', 'YG-012', 20, 10, CURRENT_TIMESTAMP),
  -- Hamburg (critical on MK, EG, PS)
  ('SI-013', 'STORE-HAM-01', 'MK-001', 4,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-014', 'STORE-HAM-01', 'BR-002', 15, 10, CURRENT_TIMESTAMP),
  ('SI-015', 'STORE-HAM-01', 'EG-003', 3,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('SI-016', 'STORE-HAM-01', 'BV-004', 30, 10, CURRENT_TIMESTAMP),
  ('SI-017', 'STORE-HAM-01', 'BG-005', 22, 10, CURRENT_TIMESTAMP),
  ('SI-018', 'STORE-HAM-01', 'AV-006', 16, 10, CURRENT_TIMESTAMP),
  ('SI-019', 'STORE-HAM-01', 'CH-007', 14, 10, CURRENT_TIMESTAMP),
  ('SI-020', 'STORE-HAM-01', 'CP-008', 19, 10, CURRENT_TIMESTAMP),
  ('SI-021', 'STORE-HAM-01', 'TP-009', 25, 10, CURRENT_TIMESTAMP),
  ('SI-022', 'STORE-HAM-01', 'PS-010', 2,  10, ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('SI-023', 'STORE-HAM-01', 'JK-011', 18, 10, CURRENT_TIMESTAMP),
  ('SI-024', 'STORE-HAM-01', 'YG-012', 24, 10, CURRENT_TIMESTAMP),
  -- Munich (critical on BR, AV, CP)
  ('SI-025', 'STORE-MUC-01', 'MK-001', 20, 10, CURRENT_TIMESTAMP),
  ('SI-026', 'STORE-MUC-01', 'BR-002', 4,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('SI-027', 'STORE-MUC-01', 'EG-003', 18, 10, CURRENT_TIMESTAMP),
  ('SI-028', 'STORE-MUC-01', 'BV-004', 19, 10, CURRENT_TIMESTAMP),
  ('SI-029', 'STORE-MUC-01', 'BG-005', 25, 10, CURRENT_TIMESTAMP),
  ('SI-030', 'STORE-MUC-01', 'AV-006', 3,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-031', 'STORE-MUC-01', 'CH-007', 22, 10, CURRENT_TIMESTAMP),
  ('SI-032', 'STORE-MUC-01', 'CP-008', 5,  10, ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('SI-033', 'STORE-MUC-01', 'TP-009', 18, 10, CURRENT_TIMESTAMP),
  ('SI-034', 'STORE-MUC-01', 'PS-010', 14, 10, CURRENT_TIMESTAMP),
  ('SI-035', 'STORE-MUC-01', 'JK-011', 21, 10, CURRENT_TIMESTAMP),
  ('SI-036', 'STORE-MUC-01', 'YG-012', 15, 10, CURRENT_TIMESTAMP),
  -- Hubballi (critical on MK, EG, BG, YG)
  ('SI-037', 'STORE-HBL-01', 'MK-001', 5,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-038', 'STORE-HBL-01', 'BR-002', 16, 10, CURRENT_TIMESTAMP),
  ('SI-039', 'STORE-HBL-01', 'EG-003', 4,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('SI-040', 'STORE-HBL-01', 'BV-004', 28, 10, CURRENT_TIMESTAMP),
  ('SI-041', 'STORE-HBL-01', 'BG-005', 6,  10, ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('SI-042', 'STORE-HBL-01', 'AV-006', 20, 10, CURRENT_TIMESTAMP),
  ('SI-043', 'STORE-HBL-01', 'CH-007', 15, 10, CURRENT_TIMESTAMP),
  ('SI-044', 'STORE-HBL-01', 'CP-008', 25, 10, CURRENT_TIMESTAMP),
  ('SI-045', 'STORE-HBL-01', 'TP-009', 35, 10, CURRENT_TIMESTAMP),
  ('SI-046', 'STORE-HBL-01', 'PS-010', 16, 10, CURRENT_TIMESTAMP),
  ('SI-047', 'STORE-HBL-01', 'JK-011', 19, 10, CURRENT_TIMESTAMP),
  ('SI-048', 'STORE-HBL-01', 'YG-012', 5,  10, ADD_DAYS(CURRENT_TIMESTAMP, -2));

-- Demand Forecast (48 rows matching store inventory)
INSERT INTO PULSECART.demand_forecast (forecast_id, store_id, sku, forecast_date, predicted_demand_24h, predicted_demand_6h) VALUES
  -- Berlin
  ('DF-001', 'STORE-BER-01', 'MK-001', CURRENT_DATE, 24, 7),
  ('DF-002', 'STORE-BER-01', 'BR-002', CURRENT_DATE, 18, 6),
  ('DF-003', 'STORE-BER-01', 'EG-003', CURRENT_DATE, 15, 9),
  ('DF-004', 'STORE-BER-01', 'BV-004', CURRENT_DATE, 12, 3),
  ('DF-005', 'STORE-BER-01', 'BG-005', CURRENT_DATE, 20, 5),
  ('DF-006', 'STORE-BER-01', 'AV-006', CURRENT_DATE, 22, 6),
  ('DF-007', 'STORE-BER-01', 'CH-007', CURRENT_DATE, 14, 4),
  ('DF-008', 'STORE-BER-01', 'CP-008', CURRENT_DATE, 10, 3),
  ('DF-009', 'STORE-BER-01', 'TP-009', CURRENT_DATE, 8,  2),
  ('DF-010', 'STORE-BER-01', 'PS-010', CURRENT_DATE, 16, 4),
  ('DF-011', 'STORE-BER-01', 'JK-011', CURRENT_DATE, 20, 7),
  ('DF-012', 'STORE-BER-01', 'YG-012', CURRENT_DATE, 12, 3),
  -- Hamburg
  ('DF-013', 'STORE-HAM-01', 'MK-001', CURRENT_DATE, 25, 6),
  ('DF-014', 'STORE-HAM-01', 'BR-002', CURRENT_DATE, 14, 3),
  ('DF-015', 'STORE-HAM-01', 'EG-003', CURRENT_DATE, 18, 5),
  ('DF-016', 'STORE-HAM-01', 'BV-004', CURRENT_DATE, 15, 4),
  ('DF-017', 'STORE-HAM-01', 'BG-005', CURRENT_DATE, 19, 5),
  ('DF-018', 'STORE-HAM-01', 'AV-006', CURRENT_DATE, 12, 3),
  ('DF-019', 'STORE-HAM-01', 'CH-007', CURRENT_DATE, 16, 4),
  ('DF-020', 'STORE-HAM-01', 'CP-008', CURRENT_DATE, 11, 2),
  ('DF-021', 'STORE-HAM-01', 'TP-009', CURRENT_DATE, 9,  2),
  ('DF-022', 'STORE-HAM-01', 'PS-010', CURRENT_DATE, 20, 4),
  ('DF-023', 'STORE-HAM-01', 'JK-011', CURRENT_DATE, 14, 3),
  ('DF-024', 'STORE-HAM-01', 'YG-012', CURRENT_DATE, 10, 2),
  -- Munich
  ('DF-025', 'STORE-MUC-01', 'MK-001', CURRENT_DATE, 18, 4),
  ('DF-026', 'STORE-MUC-01', 'BR-002', CURRENT_DATE, 22, 6),
  ('DF-027', 'STORE-MUC-01', 'EG-003', CURRENT_DATE, 15, 3),
  ('DF-028', 'STORE-MUC-01', 'BV-004', CURRENT_DATE, 13, 3),
  ('DF-029', 'STORE-MUC-01', 'BG-005', CURRENT_DATE, 18, 4),
  ('DF-030', 'STORE-MUC-01', 'AV-006', CURRENT_DATE, 24, 5),
  ('DF-031', 'STORE-MUC-01', 'CH-007', CURRENT_DATE, 14, 3),
  ('DF-032', 'STORE-MUC-01', 'CP-008', CURRENT_DATE, 20, 6),
  ('DF-033', 'STORE-MUC-01', 'TP-009', CURRENT_DATE, 10, 2),
  ('DF-034', 'STORE-MUC-01', 'PS-010', CURRENT_DATE, 15, 3),
  ('DF-035', 'STORE-MUC-01', 'JK-011', CURRENT_DATE, 17, 4),
  ('DF-036', 'STORE-MUC-01', 'YG-012', CURRENT_DATE, 12, 3),
  -- Hubballi
  ('DF-037', 'STORE-HBL-01', 'MK-001', CURRENT_DATE, 24, 6),
  ('DF-038', 'STORE-HBL-01', 'BR-002', CURRENT_DATE, 15, 3),
  ('DF-039', 'STORE-HBL-01', 'EG-003', CURRENT_DATE, 19, 5),
  ('DF-040', 'STORE-HBL-01', 'BV-004', CURRENT_DATE, 14, 3),
  ('DF-041', 'STORE-HBL-01', 'BG-005', CURRENT_DATE, 26, 8),
  ('DF-042', 'STORE-HBL-01', 'AV-006', CURRENT_DATE, 16, 4),
  ('DF-043', 'STORE-HBL-01', 'CH-007', CURRENT_DATE, 12, 3),
  ('DF-044', 'STORE-HBL-01', 'CP-008', CURRENT_DATE, 18, 4),
  ('DF-045', 'STORE-HBL-01', 'TP-009', CURRENT_DATE, 10, 2),
  ('DF-046', 'STORE-HBL-01', 'PS-010', CURRENT_DATE, 14, 3),
  ('DF-047', 'STORE-HBL-01', 'JK-011', CURRENT_DATE, 16, 4),
  ('DF-048', 'STORE-HBL-01', 'YG-012', CURRENT_DATE, 22, 6);

-- Support Tickets (8 initial tickets covering churn spectrum)
INSERT INTO PULSECART.support_tickets (ticket_id, golden_id, subject, body, created_at) VALUES
  ('TCK-1001', 'GID-1006', 'Late delivery - third time',
   'This is the THIRD time my order has been late. I switched to your app because you promised 15-min delivery but every order this week took 40+ min. Cancelling my membership and going back to Flink.',
   CURRENT_TIMESTAMP),
  ('TCK-1002', 'GID-1007', 'Missing items - refund required',
   'Two items were missing from my delivery — the milk and bread. Driver said out of stock but nobody told me before delivery and I was charged full price. This keeps happening.',
   ADD_HOURS(CURRENT_TIMESTAMP, -1)),
  ('TCK-1003', 'GID-1001', 'Wrong product delivered',
   'I ordered olive oil but received vegetable oil. Need an exchange ASAP, cooking dinner for guests.',
   ADD_HOURS(CURRENT_TIMESTAMP, -2)),
  ('TCK-1004', 'GID-1008', 'Damaged packaging',
   'Eggs arrived crushed. The packaging was clearly damaged before shipping. Please refund.',
   ADD_HOURS(CURRENT_TIMESTAMP, -3)),
  ('TCK-1005', 'GID-1009', 'App keeps crashing at checkout',
   'Love your service but the app has crashed 3 times during checkout today. Using iPhone 14, latest iOS. Please fix.',
   ADD_HOURS(CURRENT_TIMESTAMP, -5)),
  ('TCK-1006', 'GID-1002', 'Loyalty points not credited',
   'I redeemed 200 points last week but they are still showing as pending. Account: alex.mercer@example.com',
   ADD_HOURS(CURRENT_TIMESTAMP, -6)),
  ('TCK-1007', 'GID-1005', 'Positive feedback - great service',
   'Just wanted to say thanks for the amazing delivery today. Driver was polite, order was perfect, and arrived in 12 minutes. Will definitely recommend to friends!',
   ADD_HOURS(CURRENT_TIMESTAMP, -8)),
  ('TCK-1008', 'GID-1010', 'Charged twice for one order',
   'My card was charged twice for order #ORD-88492. Total should be €42 but I was charged €84. Need immediate refund.',
   ADD_HOURS(CURRENT_TIMESTAMP, -12));

-- Orders (20 realistic orders across customers and stores)
INSERT INTO PULSECART.orders VALUES
  ('ORD-1001', 'GID-1001', 'STORE-BER-01', 'app', 'fulfilled', 28.50, 0.00, 28.50, ADD_DAYS(CURRENT_TIMESTAMP, -10), ADD_DAYS(CURRENT_TIMESTAMP, -10)),
  ('ORD-1002', 'GID-1002', 'STORE-HAM-01', 'app', 'fulfilled', 64.20, 5.00, 59.20, ADD_DAYS(CURRENT_TIMESTAMP, -8), ADD_DAYS(CURRENT_TIMESTAMP, -8)),
  ('ORD-1003', 'GID-1003', 'STORE-BER-01', 'web', 'fulfilled', 22.00, 15.00, 7.00, ADD_DAYS(CURRENT_TIMESTAMP, -7), ADD_DAYS(CURRENT_TIMESTAMP, -7)),
  ('ORD-1004', 'GID-1004', 'STORE-HAM-01', 'app', 'fulfilled', 38.90, 0.00, 38.90, ADD_DAYS(CURRENT_TIMESTAMP, -6), ADD_DAYS(CURRENT_TIMESTAMP, -6)),
  ('ORD-1005', 'GID-1005', 'STORE-BER-01', 'app', 'fulfilled', 31.50, 0.00, 31.50, ADD_DAYS(CURRENT_TIMESTAMP, -5), ADD_DAYS(CURRENT_TIMESTAMP, -5)),
  ('ORD-1006', 'GID-1005', 'STORE-BER-01', 'app', 'returned',  24.80, 0.00, 24.80, ADD_DAYS(CURRENT_TIMESTAMP, -4), ADD_DAYS(CURRENT_TIMESTAMP, -4)),
  ('ORD-1007', 'GID-1005', 'STORE-BER-01', 'app', 'returned',  19.20, 0.00, 19.20, ADD_DAYS(CURRENT_TIMESTAMP, -3), ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('ORD-1008', 'GID-1005', 'STORE-BER-01', 'app', 'returned',  18.00, 0.00, 18.00, ADD_DAYS(CURRENT_TIMESTAMP, -2), ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('ORD-1009', 'GID-1006', 'STORE-BER-01', 'app', 'fulfilled', 45.00, 0.00, 45.00, ADD_DAYS(CURRENT_TIMESTAMP, -4), ADD_DAYS(CURRENT_TIMESTAMP, -4)),
  ('ORD-1010', 'GID-1007', 'STORE-HAM-01', 'app', 'fulfilled', 52.30, 0.00, 52.30, ADD_DAYS(CURRENT_TIMESTAMP, -3), ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('ORD-1011', 'GID-1008', 'STORE-MUC-01', 'app', 'fulfilled', 29.40, 0.00, 29.40, ADD_DAYS(CURRENT_TIMESTAMP, -6), ADD_DAYS(CURRENT_TIMESTAMP, -6)),
  ('ORD-1012', 'GID-1008', 'STORE-MUC-01', 'app', 'returned',  22.50, 0.00, 22.50, ADD_DAYS(CURRENT_TIMESTAMP, -4), ADD_DAYS(CURRENT_TIMESTAMP, -4)),
  ('ORD-1013', 'GID-1008', 'STORE-MUC-01', 'app', 'returned',  26.10, 0.00, 26.10, ADD_DAYS(CURRENT_TIMESTAMP, -2), ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('ORD-1014', 'GID-1009', 'STORE-MUC-01', 'app', 'fulfilled', 71.00, 10.00, 61.00, ADD_DAYS(CURRENT_TIMESTAMP, -5), ADD_DAYS(CURRENT_TIMESTAMP, -5)),
  ('ORD-1015', 'GID-1010', 'STORE-HBL-01', 'app', 'fulfilled', 42.00, 0.00, 42.00, ADD_DAYS(CURRENT_TIMESTAMP, -3), ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('ORD-1016', 'GID-1001', 'STORE-BER-01', 'app', 'fulfilled', 34.00, 0.00, 34.00, ADD_DAYS(CURRENT_TIMESTAMP, -2), ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('ORD-1017', 'GID-1002', 'STORE-HAM-01', 'app', 'fulfilled', 85.50, 0.00, 85.50, ADD_DAYS(CURRENT_TIMESTAMP, -1), ADD_DAYS(CURRENT_TIMESTAMP, -1)),
  ('ORD-1018', 'GID-1006', 'STORE-BER-01', 'app', 'fulfilled', 39.00, 0.00, 39.00, ADD_HOURS(CURRENT_TIMESTAMP, -18), ADD_HOURS(CURRENT_TIMESTAMP, -18)),
  ('ORD-1019', 'GID-1007', 'STORE-HAM-01', 'app', 'fulfilled', 31.00, 0.00, 31.00, ADD_HOURS(CURRENT_TIMESTAMP, -12), ADD_HOURS(CURRENT_TIMESTAMP, -12)),
  ('ORD-1020', 'GID-1010', 'STORE-HBL-01', 'app', 'fulfilled', 42.00, 0.00, 42.00, ADD_HOURS(CURRENT_TIMESTAMP, -6), ADD_HOURS(CURRENT_TIMESTAMP, -6));

-- Order Items
INSERT INTO PULSECART.order_items VALUES
  ('OI-001', 'ORD-1001', 'MK-001', 2, 1.49),
  ('OI-002', 'ORD-1001', 'BR-002', 1, 2.29),
  ('OI-003', 'ORD-1002', 'CP-008', 2, 5.99),
  ('OI-004', 'ORD-1002', 'AV-006', 4, 1.19),
  ('OI-005', 'ORD-1005', 'AV-006', 2, 1.19),
  ('OI-006', 'ORD-1006', 'AV-006', 3, 1.19),
  ('OI-007', 'ORD-1007', 'MK-001', 2, 1.49),
  ('OI-008', 'ORD-1008', 'EG-003', 2, 2.49),
  ('OI-009', 'ORD-1011', 'AV-006', 2, 1.19),
  ('OI-010', 'ORD-1012', 'AV-006', 2, 1.19),
  ('OI-011', 'ORD-1013', 'EG-003', 1, 2.49),
  ('OI-012', 'ORD-1015', 'PS-010', 2, 4.49),
  ('OI-013', 'ORD-1016', 'BG-005', 2, 1.79),
  ('OI-014', 'ORD-1017', 'CH-007', 3, 3.49),
  ('OI-015', 'ORD-1018', 'YG-012', 2, 2.99),
  ('OI-016', 'ORD-1019', 'JK-011', 2, 2.79),
  ('OI-017', 'ORD-1020', 'BV-004', 2, 3.99);

-- Return Events (8 returns concentrated: GID-1005 returns abuser, GID-1008 returns abuser, AV-006 toxic SKU)
INSERT INTO PULSECART.return_events VALUES
  ('RET-001', 'GID-1005', 'ORD-1005', 'AV-006', 'STORE-BER-01', 'quality',       4.76, 8.26,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -5)),
  ('RET-002', 'GID-1005', 'ORD-1006', 'AV-006', 'STORE-BER-01', 'quality',       3.57, 7.07,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -4)),
  ('RET-003', 'GID-1005', 'ORD-1007', 'MK-001', 'STORE-BER-01', 'expired',       5.96, 9.46,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -3)),
  ('RET-004', 'GID-1005', 'ORD-1008', 'EG-003', 'STORE-BER-01', 'damaged',       4.98, 8.48,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('RET-005', 'GID-1008', 'ORD-1011', 'AV-006', 'STORE-MUC-01', 'quality',       4.76, 8.26,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -6)),
  ('RET-006', 'GID-1008', 'ORD-1012', 'AV-006', 'STORE-MUC-01', 'quality',       2.38, 5.88,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -4)),
  ('RET-007', 'GID-1008', 'ORD-1013', 'EG-003', 'STORE-MUC-01', 'damaged',       4.98, 8.48,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -2)),
  ('RET-008', 'GID-1001', 'ORD-1001', 'BR-002', 'STORE-BER-01', 'wrong_item',    2.29, 5.79,  2.50, 1.00, ADD_DAYS(CURRENT_TIMESTAMP, -9));

-- Promo Codes
INSERT INTO PULSECART.promo_code VALUES
  ('$15OFF',    15.00, 1, ADD_DAYS(CURRENT_TIMESTAMP, 30), 0),
  ('$10SAVE',   10.00, 1, ADD_DAYS(CURRENT_TIMESTAMP, 30), 0),
  ('WELCOME5',  5.00,  1, ADD_DAYS(CURRENT_TIMESTAMP, 90), 0),
  ('VIP25',     25.00, 1, ADD_DAYS(CURRENT_TIMESTAMP, 30), 0);

-- Fraud Events (15 events covering past 24h)
INSERT INTO PULSECART.fraud_event (fraud_id, attempted_at, burner_email, attempted_promo_code, matched_golden_id, match_method, match_score, block_reason, "BLOCKED") VALUES
  ('FR-001', ADD_HOURS(CURRENT_TIMESTAMP, -1),  'sarah.connor+spam@gmail.com', '$15OFF', 'GID-1001', 'address_similarity', 0.92, 'Email alias matches existing customer GID-1001', TRUE),
  ('FR-002', ADD_HOURS(CURRENT_TIMESTAMP, -2),  'alex.mercer1@example.com',   '$15OFF', 'GID-1002', 'levenshtein_email',  0.94, 'Email Levenshtein distance 1 from existing customer', TRUE),
  ('FR-003', ADD_HOURS(CURRENT_TIMESTAMP, -3),  'sarah.c0nor@example.com',    '$10SAVE','GID-1001', 'levenshtein_email',  0.87, 'Near-miss email match', TRUE),
  ('FR-004', ADD_HOURS(CURRENT_TIMESTAMP, -4),  'fake.user1@example.com',     '$15OFF', NULL,       'suspected_burner',   0.45, 'Multiple suspicious burner signals', TRUE),
  ('FR-005', ADD_HOURS(CURRENT_TIMESTAMP, -5),  'j.doe+promo@example.com',    '$15OFF', 'GID-1005', 'address_similarity', 0.91, 'Address matches existing customer GID-1005', TRUE),
  ('FR-006', ADD_HOURS(CURRENT_TIMESTAMP, -6),  'sarah.connor2@gmail.com',    '$15OFF', 'GID-1001', 'levenshtein_email',  0.90, 'Repetitive promo abuse on linked golden ID', TRUE),
  ('FR-007', ADD_HOURS(CURRENT_TIMESTAMP, -8),  'alex.mercer+vip@gmail.com',  'VIP25',  'GID-1002', 'address_similarity', 0.93, 'Address linked to VIP order already claimed', TRUE),
  ('FR-008', ADD_HOURS(CURRENT_TIMESTAMP, -10), 'noah.patel1@example.com',    '$10SAVE','GID-1008', 'levenshtein_email',  0.89, 'Near-miss email with active return dispute', TRUE),
  ('FR-009', ADD_HOURS(CURRENT_TIMESTAMP, -12), 'burner.phone@temp.com',      'WELCOME5',NULL,     'suspected_burner',   0.50, 'Burner domain detected', TRUE),
  ('FR-010', ADD_HOURS(CURRENT_TIMESTAMP, -14), 'maya.sharma+1@example.com',  '$15OFF', 'GID-1006', 'address_similarity', 0.95, 'Same physical apartment detected', TRUE),
  ('FR-011', ADD_HOURS(CURRENT_TIMESTAMP, -16), 'liam.chen.promo@gmail.com',  '$15OFF', 'GID-1007', 'levenshtein_email',  0.88, 'Duplicate new-user promotion attempted', TRUE),
  ('FR-012', ADD_HOURS(CURRENT_TIMESTAMP, -18), 'lucas.silva99@example.com',  '$10SAVE','GID-1010', 'levenshtein_email',  0.91, 'Pattern match against existing customer', TRUE),
  ('FR-013', ADD_HOURS(CURRENT_TIMESTAMP, -20), 'throwaway123@dispostable.com','$15OFF',NULL,       'suspected_burner',   0.60, 'Disposable inbox provider', TRUE),
  ('FR-014', ADD_HOURS(CURRENT_TIMESTAMP, -22), 'sarah.connor+extra@gmail.com','$15OFF','GID-1001', 'address_similarity', 0.96, 'Address similarity threshold exceeded (>0.85)', TRUE),
  ('FR-015', ADD_HOURS(CURRENT_TIMESTAMP, -23), 'john.doe.fake@mail.com',     '$10SAVE','GID-1005', 'address_similarity', 0.89, 'Address matched GID-1005 history', TRUE);

-- Pipeline Events (120 rows across 5 sources for the last 24h)
INSERT INTO PULSECART.pipeline_event (event_id, source_system, event_type, rows_ingested, processed_at, latency_ms)
SELECT 
    'PE-' || CAST(r.h AS VARCHAR(3)) || '-' || s.src,
    s.src,
    'insert',
    CAST(120 + MOD(r.h * 11, 280) AS INTEGER),
    ADD_HOURS(CURRENT_TIMESTAMP, -r.h),
    CAST(75 + MOD(r.h * 23, 450) AS INTEGER)
FROM (
    SELECT 0 AS h UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
    SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
    SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL
    SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL
    SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
) r
CROSS JOIN (
    SELECT 'order_app' AS src UNION ALL 
    SELECT 'loyalty' UNION ALL 
    SELECT 'support' UNION ALL 
    SELECT 'returns_portal' UNION ALL 
    SELECT 'web_guest'
) s;

COMMIT;
