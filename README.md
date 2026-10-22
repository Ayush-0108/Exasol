# PulseCart: Real-Time Customer Intelligence & Margin Protection Platform

> **Exasol Hackathon — Track 02: Customers, Channels & Demand**  
> High-performance analytical compute engine powered by Exasol Personal Edition, FastAPI, and Groq LLM inference.

---

## 1. Project Overview

PulseCart is an operational customer intelligence platform purpose-built for quick commerce (10–30 min grocery delivery). In quick commerce, thin operating margins (2–5%) are heavily eroded by promotion abuse, repeat delivery failures, stockouts, and serial return abusers. 

PulseCart leverages **Exasol** as both the high-speed analytical database and real-time compute engine across 5 operational modules:

1. **Module 1: Master Identity & Promo Abuse Prevention** — Multi-address identity linkage and fuzzy address matching blocking fraudulent discount redemptions.
2. **Module 2: Predictive Inventory Radar** — Dark store stockout runout forecasting evaluating 6h/24h demand predictions to prevent stock depletion.
3. **Module 3: The Churn Miner & Retention Engine** — Sub-second ticket sentiment & urgency classification via Groq LLMs with automated customer retention offers.
4. **Module 4: Margin Protection & Returns Attribution** — Real-time identification of returns abusers and margin-negative "toxic SKUs".
5. **Module 5: Executive Command Center** — Live ROI tracking, ingestion pipeline monitoring, and consolidated cross-module operational alerts.

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QUICK COMMERCE SOURCE SYSTEMS                   │
│   Order App       Web Guests      Loyalty Portal     Returns Portal    │
└────────┬───────────────┬─────────────────┬───────────────────┬─────────┘
         │               │                 │                   │
         └───────────────┼─────────────────┼───────────────────┘
                         ▼                 ▼
          ┌──────────────────────────────────────────────┐
          │      EXASOL HIGH-PERFORMANCE ANALYTICS       │
          │             (In-Memory Columnar)             │
          │                                              │
          │  • customer_golden_id     • orders           │
          │  • address_history        • return_events    │
          │  • store_inventory        • support_tickets  │
          │  • demand_forecast        • fraud_events     │
          │                                              │
          │  Analytical Views (exasol-views.sql):        │
          │  VW_CUSTOMER_GOLDEN    VW_STOCKOUT_WARNINGS  │
          │  VW_CHURN_RISK         VW_RETURNS_ABUSERS    │
          │              MV_CUSTOMER_360                 │
          └──────────────────────┬───────────────────────┘
                                 │
                     pyexasol WebSocket (:8563)
                                 │
                                 ▼
          ┌──────────────────────────────────────────────┐
          │             FASTAPI BACKEND SERVER           │
          │                 (Port: 8000)                 │
          │                                              │
          │  • /api/v1/checkout     • /api/v1/inventory  │
          │  • /api/v1/tickets      • /api/v1/returns    │
          │  • /api/v1/overview/roi • /api/v1/alerts     │
          └───────────────┬──────────────────────────────┘
                          │                  ▲
               Structured │                  │ Groq Inference
               Prompts    ▼                  │ (LPU Engine)
                    ┌───────────────────────────┐
                    │       GROQ CLOUD API      │
                    │  Primary:  gpt-oss-20b    │
                    │  Fallback: qwen3.8-27b    │
                    └───────────────────────────┘
```

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- Python 3.10+
- Running Exasol instance (Local Personal Edition or Docker on `127.0.0.1:8563`)
- Groq API Key

### Installation

1. **Clone & Set Up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and paste your GROQ_API_KEY
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize the Exasol Database**:
   Run `init.sql` against your Exasol cluster. You can run it via Python:
   ```bash
   python -c "
   import database
   with open('init.sql', 'r', encoding='utf-8') as f:
       sql = f.read()
   cleaned = '\n'.join([l for l in sql.splitlines() if not l.strip().startswith('--')])
   for s in cleaned.split(';'):
       if s.strip(): database.execute_statement(s)
   print('Database initialized successfully!')
   "
   ```

4. **Launch the FastAPI Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   Interactive Swagger documentation will be available at: `http://localhost:8000/docs`

---

## 4. API Reference Table

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Connectivity check verifying Exasol database health |
| `POST`| `/api/v1/checkout` | Fuzzy matches address against identity graph; blocks Promo Abuse ($> 0.85$) |
| `GET` | `/api/v1/inventory/stores` | Aggregated dark store health (total SKUs, critical, warning counts) |
| `GET` | `/api/v1/inventory/stockout-warnings` | Prioritized SKUs predicted to run out in the next 6 hours |
| `POST`| `/api/v1/inventory/reorder` | Replenishes dark store inventory for a specific SKU |
| `GET` | `/api/v1/inventory/store/{store_id}/heatmap` | Heatmap matrix of inventory health per SKU for a dark store |
| `GET` | `/api/v1/tickets` | Support ticket queue joined with customer LTV & churn risk labels |
| `GET` | `/api/v1/tickets/{ticket_id}` | Detailed support ticket with LLM classification & recommended actions |
| `POST`| `/api/v1/tickets/{ticket_id}/analyze` | Triggers Groq LLM ticket enrichment and re-blends customer churn risk |
| `POST`| `/api/v1/tickets/bulk-analyze` | Batch processes up to 50 unanalyzed tickets via LLM |
| `POST`| `/api/v1/tickets/{ticket_id}/send-offer` | Dispatches retention offer (store credit, free delivery) |
| `GET` | `/api/v1/tickets/stats` | Aggregated ticket metrics (total, pending, avg churn risk, offers sent) |
| `GET` | `/api/v1/returns/abusers` | Leaderboard of customers whose return habits cost the most margin |
| `GET` | `/api/v1/returns/toxic-skus` | Identifies SKUs with net-negative margins due to high return volumes |
| `GET` | `/api/v1/returns/impact-summary` | High-level margin erosion and refund totals grouped by reason/category |
| `GET` | `/api/v1/returns/by-customer/{golden_id}` | Detailed return history for an individual customer |
| `GET` | `/api/v1/overview/roi` | Total revenue saved today/week across fraud blocks, churn, and restocks |
| `GET` | `/api/v1/overview/pipeline-health` | 24-hour ingestion throughput and latency telemetry across 5 sources |
| `GET` | `/api/v1/overview/alerts` | Consolidated feed of the 50 highest priority operational alerts |
| `GET` | `/api/v1/overview/system-health` | Real-time system status, database link, and service uptime |

---

## 5. Exasol SQL Reference

Production analytical views are defined in [`exasol-views.sql`](file:///d:/Ayush_Files/Users/kumar/exasol/exasol-views.sql):

- **`VW_CUSTOMER_GOLDEN`**: Real-time identity graph synthesis calculating multi-address linkages and identity confidence.
- **`VW_STOCKOUT_WARNINGS`**: Evaluates `store_inventory` against machine learning `demand_forecast` predictions.
- **`VW_CHURN_RISK`**: Aggregates ticket urgency, sentiment, and churn scores per customer golden identity.
- **`VW_RETURNS_ABUSERS`**: Ranks customers into abuse bands (`RETURNS_ABUSER`, `MODERATE_RISK`, `LOW_RISK`).
- **`MV_CUSTOMER_360`**: Complete customer synthesis joining identity, transactions, churn tickets, and return margins.

---

## 6. Exasol Python UDF Setup

The project includes an Exasol Python 3 scalar UDF in [`udf/fuzzy_match.sql`](file:///d:/Ayush_Files/Users/kumar/exasol/udf/fuzzy_match.sql).

- **Production Scale**: In an enterprise Exasol deployment with the Python 3 language container installed in BucketFS, running this UDF pushes string similarity computations into Exasol's MPP cluster, enabling parallel matching of millions of address combinations.
- **Local Hackathon Deployment**: Exasol Personal Edition / containerized setups typically omit the script language container package. To ensure 100% portability and eliminate setup friction, `main.py` performs fuzzy matching in Python (`fuzzy_match_addresses`) using `difflib.SequenceMatcher`, while reading and persisting all transactional records directly to Exasol.

---

## 7. LLM Integration & Resilient Fallback Chain

Ticket analysis in [`llm_service.py`](file:///d:/Ayush_Files/Users/kumar/exasol/llm_service.py) utilizes Groq for high-speed structured inference:
1. **Tier 1 (Primary)**: `openai/gpt-oss-20b` (low latency, high precision classification).
2. **Tier 2 (Fallback)**: `qwen/qwen3.8-27b` (automatic fallback if Tier 1 is congested).
3. **Tier 3 (Heuristic)**: Rule-based keyword classifier that fires only if network access to Groq is unavailable.

---

## 8. Live Activity Simulation

To simulate dynamic store activity during a live operator demo:
```bash
python scripts/simulate.py
```
This script runs continuously in the background, inserting orders, generating support inquiries, triggering promo authorizations/blocks, and emitting pipeline metrics.

---

## 9. License

MIT License — see [LICENSE](file:///d:/Ayush_Files/Users/kumar/exasol/LICENSE) for details.
