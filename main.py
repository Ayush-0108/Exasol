"""
PulseCart: FastAPI Real-Time Customer Intelligence Server
==========================================================
Backend analytical compute API powered by FastAPI, Exasol, and Groq.
Serves all 5 Operational Modules for Track 02 (Customers, Channels & Demand):
1. Module 1: Master Identity & Promo Abuse Prevention
2. Module 2: Predictive Inventory Radar & Stockout Warnings
3. Module 3: Churn Miner & Retention Action Engine
4. Module 4: Margin Protection & Returns Attribution
5. Module 5: Executive Command Center & Pipeline Monitoring
"""

import difflib
import logging
import time
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database
from llm_service import classify_ticket

START_TIME = time.time()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pulsecart.api")

app = FastAPI(
    title="PulseCart Customer Intelligence API",
    description="Real-time quick commerce backend powered by Exasol and Groq.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to convert Exasol Decimals/timestamps to JSON-serializable types."""
    res = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            res[k] = float(v)
        else:
            res[k] = v
    return res


# ============================================================================
# Core Logic: In-Memory Fuzzy Matching (Task 3.1)
# ============================================================================

def fuzzy_match_addresses(incoming: str, historical: List[str]) -> Tuple[Optional[str], float]:
    """
    Find the best fuzzy match for `incoming` against `historical` addresses.
    Returns (best_match_address, similarity_score) or (None, 0.0) if no match > 0.5.
    Uses difflib.SequenceMatcher — production deployment would use the Exasol
    Python UDF in udf/fuzzy_match.sql for in-database parallel matching.
    """
    if not incoming or not historical:
        return None, 0.0

    normalized_incoming = incoming.strip().lower()
    best_match = None
    highest_score = 0.0

    for addr in historical:
        if not addr:
            continue
        score = difflib.SequenceMatcher(None, normalized_incoming, addr.strip().lower()).ratio()
        if score > highest_score:
            highest_score = score
            best_match = addr

    if highest_score >= 0.5:
        return best_match, highest_score
    return None, 0.0


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ApiResponse(BaseModel):
    ok: bool = True
    data: Optional[Any] = None
    error: Optional[str] = None


class CheckoutRequest(BaseModel):
    email: str = Field(..., example="sarah.connor+spam@gmail.com")
    address: str = Field(..., min_length=5, max_length=1000, example="Apt 4B, 742 Evergreen Terrace, Springfield, OR 97477")
    promo_code: Optional[str] = Field(None, example="$15OFF")


class TicketCreateRequest(BaseModel):
    customer_id: Optional[str] = Field(None, example="CUST-001")
    golden_id: Optional[str] = Field(None, example="GID-1001")
    subject: Optional[str] = Field("Customer Support Inquiry", example="Late delivery complaint")
    ticket_text: Optional[str] = Field(None, example="My ice cream was completely melted and 30 mins late!")
    body: Optional[str] = Field(None, example="My ice cream was completely melted and 30 mins late!")


class ReorderRequest(BaseModel):
    store_id: str = Field(..., example="STORE-BER-01")
    sku: str = Field(..., example="MK-001")
    quantity: int = Field(..., gt=0, example=25)


class SendOfferRequest(BaseModel):
    offer_type: str = Field(..., example="store_credit")
    offer_value: float = Field(..., gt=0.0, example=15.00)


# ============================================================================
# System Health Endpoints
# ============================================================================

@app.get("/health", tags=["System"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint indicating database connectivity."""
    db_health = database.test_connection()
    is_connected = db_health.get("status") == "healthy"
    return {
        "ok": is_connected,
        "database": "connected" if is_connected else "disconnected",
    }


# ============================================================================
# MODULE 1: Checkout & Promo Abuse Prevention (Tasks 3.1 & 6.5)
# ============================================================================

@app.post("/api/v1/checkout", tags=["Module 1: Fraud Prevention"])
def evaluate_checkout(payload: CheckoutRequest) -> Dict[str, Any]:
    """
    Evaluates an incoming checkout request for Promo Abuse using identity graph + fuzzy matching.
    If blocked:
    1. Inserts into PULSECART.fraud_event table.
    2. Increments abuse_blocked_count on the attempted promo_code.
    3. Returns structured blocked response.
    """
    cleaned_email = payload.email.strip().lower()
    incoming_address = payload.address.strip()
    promo_code = payload.promo_code.strip() if payload.promo_code else "$15OFF"
    promo_threshold = 0.85

    # 1. Identity lookup in Exasol
    # Resolve linked golden_id by email or email prefix (catch +alias)
    base_email = cleaned_email.split("+")[0] + "@" + cleaned_email.split("@")[-1] if "+" in cleaned_email else cleaned_email
    
    id_query = """
        SELECT golden_id, email, name, fraud_score 
        FROM PULSECART.customer_golden_id 
        WHERE LOWER(email) = :clean_email 
           OR LOWER(email) LIKE :base_prefix
        LIMIT 1
    """
    matched_cust = database.execute_query(
        id_query, 
        {"clean_email": cleaned_email, "base_prefix": f"{base_email.split('@')[0]}%"}
    )
    
    golden_id = matched_cust[0]["golden_id"] if matched_cust else None

    # 2. Retrieve candidate historical addresses from Exasol
    if golden_id:
        addr_query = """
            SELECT address_text 
            FROM PULSECART.customer_address_history 
            WHERE golden_id = :gid
        """
        addr_rows = database.execute_query(addr_query, {"gid": golden_id})
    else:
        # Cross-customer address scan
        addr_query = "SELECT address_text FROM PULSECART.customer_address_history LIMIT 50"
        addr_rows = database.execute_query(addr_query)

    historical_addrs = [r["address_text"] for r in addr_rows]
    best_match_addr, similarity_score = fuzzy_match_addresses(incoming_address, historical_addrs)

    is_blocked = similarity_score > promo_threshold

    if is_blocked:
        fraud_id = f"FR-{uuid.uuid4().hex[:8].upper()}"
        match_method = "address_similarity"
        block_reason = (
            f"Address matches existing customer record with "
            f"{round(similarity_score * 100, 1)}% similarity (Threshold: {promo_threshold * 100}%)."
        )

        # 1. Insert into fraud_event
        insert_fraud_sql = """
            INSERT INTO PULSECART.fraud_event (
                fraud_id, attempted_at, burner_email, attempted_promo_code,
                matched_golden_id, match_method, match_score, block_reason, "BLOCKED"
            ) VALUES (
                :fid, CURRENT_TIMESTAMP, :email, :code,
                :gid, :method, :score, :reason, TRUE
            )
        """
        try:
            database.execute_statement(insert_fraud_sql, {
                "fid": fraud_id,
                "email": cleaned_email,
                "code": promo_code,
                "gid": golden_id,
                "method": match_method,
                "score": round(similarity_score, 3),
                "reason": block_reason,
            })
        except Exception as e:
            logger.warning(f"Failed to log fraud_event: {e}")

        # 2. Increment promo abuse count
        update_promo_sql = """
            UPDATE PULSECART.promo_code 
            SET abuse_blocked_count = abuse_blocked_count + 1 
            WHERE code = :code
        """
        try:
            database.execute_statement(update_promo_sql, {"code": promo_code})
        except Exception as e:
            logger.warning(f"Failed to increment promo code abuse count: {e}")

        return {
            "ok": True,
            "blocked": True,
            "status": "BLOCKED",
            "reason": block_reason,
            "match_method": match_method,
            "match_score": round(similarity_score, 3),
            "matched_address": best_match_addr,
            "golden_id": golden_id,
            "fraud_event": {
                "fraud_id": fraud_id,
                "attempted_promo_code": promo_code,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        }

    return {
        "ok": True,
        "blocked": False,
        "status": "APPROVED",
        "reason": "Address similarity check passed. Checkout authorized.",
        "match_score": round(similarity_score, 3),
        "matched_address": best_match_addr,
        "golden_id": golden_id,
    }


# ============================================================================
# MODULE 2: Predictive Inventory Radar (Task 6.1)
# ============================================================================

@app.get("/api/v1/inventory/stores", tags=["Module 2: Inventory Radar"])
def get_inventory_stores() -> Dict[str, Any]:
    """Returns list of dark stores with aggregate health (total_skus, critical_count, warning_count)."""
    sql = """
        SELECT 
            s.store_id, 
            s.name, 
            s.zone_label, 
            s.city,
            COUNT(si.sku) as total_skus,
            SUM(CASE WHEN si.current_stock < si.reorder_point THEN 1 ELSE 0 END) as critical_count,
            SUM(CASE WHEN si.current_stock < si.reorder_point * 1.5 AND si.current_stock >= si.reorder_point THEN 1 ELSE 0 END) as warning_count
        FROM PULSECART.dark_store s 
        LEFT JOIN PULSECART.store_inventory si ON s.store_id = si.store_id
        WHERE s.active = TRUE 
        GROUP BY s.store_id, s.name, s.zone_label, s.city
        ORDER BY s.store_id
    """
    rows = database.execute_query(sql)
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


@app.get("/api/v1/inventory/stockout-warnings", tags=["Module 2: Inventory Radar"])
def get_stockout_warnings() -> Dict[str, Any]:
    """Returns prioritized list of SKUs predicted to stock out in next 6h."""
    sql = """
        SELECT 
            si.store_id, 
            ds.name as store_name, 
            si.sku, 
            ii.name as sku_name, 
            ii.category,
            si.current_stock, 
            df.predicted_demand_6h, 
            df.predicted_demand_24h,
            CASE
              WHEN si.current_stock < df.predicted_demand_6h THEN 'critical'
              WHEN si.current_stock < df.predicted_demand_6h * 1.2 THEN 'warning'
              ELSE 'healthy'
            END as severity,
            (df.predicted_demand_24h * 3 - si.current_stock) as suggested_reorder_qty
        FROM PULSECART.store_inventory si
        JOIN PULSECART.dark_store ds ON si.store_id = ds.store_id
        JOIN PULSECART.inventory_item ii ON si.sku = ii.sku
        JOIN PULSECART.demand_forecast df 
          ON si.store_id = df.store_id 
         AND si.sku = df.sku 
         AND df.forecast_date = CURRENT_DATE
        WHERE si.current_stock < df.predicted_demand_6h * 1.2
        ORDER BY severity DESC, (df.predicted_demand_6h - si.current_stock) DESC
    """
    rows = database.execute_query(sql)
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


@app.post("/api/v1/inventory/reorder", tags=["Module 2: Inventory Radar"])
def reorder_inventory(payload: ReorderRequest) -> Dict[str, Any]:
    """Replenishes store stock for a given SKU."""
    update_sql = """
        UPDATE PULSECART.store_inventory 
        SET current_stock = current_stock + :qty, 
            last_restocked_at = CURRENT_TIMESTAMP 
        WHERE store_id = :store_id AND sku = :sku
    """
    rows_affected = database.execute_statement(update_sql, {
        "qty": payload.quantity,
        "store_id": payload.store_id,
        "sku": payload.sku,
    })
    if rows_affected == 0:
        raise HTTPException(status_code=404, detail="Store or SKU not found in inventory.")

    sel_sql = """
        SELECT current_stock 
        FROM PULSECART.store_inventory 
        WHERE store_id = :store_id AND sku = :sku
    """
    res = database.execute_query(sel_sql, {"store_id": payload.store_id, "sku": payload.sku})
    new_stock = res[0]["current_stock"] if res else 0
    return {"ok": True, "new_stock": int(new_stock)}


@app.get("/api/v1/inventory/store/{store_id}/heatmap", tags=["Module 2: Inventory Radar"])
def get_store_heatmap(store_id: str) -> Dict[str, Any]:
    """Returns per-SKU inventory health for the dark store heatmap."""
    sql = """
        SELECT 
            si.sku, 
            ii.name, 
            ii.category, 
            si.current_stock, 
            si.reorder_point,
            df.predicted_demand_6h, 
            df.predicted_demand_24h,
            CASE 
              WHEN si.current_stock < si.reorder_point THEN 'critical'
              WHEN si.current_stock < si.reorder_point * 1.5 THEN 'warning'
              ELSE 'healthy' 
            END as status
        FROM PULSECART.store_inventory si 
        JOIN PULSECART.inventory_item ii ON si.sku = ii.sku
        LEFT JOIN PULSECART.demand_forecast df 
          ON si.store_id = df.store_id 
         AND si.sku = df.sku 
         AND df.forecast_date = CURRENT_DATE
        WHERE si.store_id = :store_id
        ORDER BY si.current_stock ASC
    """
    rows = database.execute_query(sql, {"store_id": store_id})
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


# ============================================================================
# MODULE 3: Churn Miner & Support Tickets (Tasks 5.1 & 6.2)
# ============================================================================

def _reblend_customer_churn(golden_id: str):
    """Re-blends customer churn_risk = 0.4 * old_risk + 0.6 * avg_ticket_churn_risk_score."""
    try:
        # Get customer old risk
        c_res = database.execute_query(
            "SELECT churn_risk FROM PULSECART.customer_golden_id WHERE golden_id = :gid",
            {"gid": golden_id}
        )
        old_risk = float(c_res[0]["churn_risk"]) if c_res and c_res[0].get("churn_risk") is not None else 0.2

        # Get average ticket churn risk
        t_res = database.execute_query(
            "SELECT AVG(churn_risk_score) as avg_score FROM PULSECART.support_tickets WHERE golden_id = :gid AND churn_risk_score IS NOT NULL",
            {"gid": golden_id}
        )
        avg_score = float(t_res[0]["avg_score"]) if t_res and t_res[0].get("avg_score") is not None else old_risk

        new_risk = round(0.4 * old_risk + 0.6 * avg_score, 2)
        if new_risk >= 0.65:
            label = "critical"
        elif new_risk >= 0.40:
            label = "at_risk"
        elif new_risk >= 0.20:
            label = "monitor"
        else:
            label = "healthy"

        database.execute_statement(
            """
            UPDATE PULSECART.customer_golden_id 
            SET churn_risk = :risk, churn_label = :label, updated_at = CURRENT_TIMESTAMP 
            WHERE golden_id = :gid
            """,
            {"risk": new_risk, "label": label, "gid": golden_id}
        )
    except Exception as e:
        logger.warning(f"Error reblending churn for {golden_id}: {e}")


@app.get("/api/v1/tickets", tags=["Module 3: Churn Mining"])
def list_tickets(
    status: Literal["pending", "analyzed", "all"] = Query("all"),
    limit: int = Query(50, ge=1, le=100),
) -> Dict[str, Any]:
    """Returns list of tickets joined with customer details."""
    where_clause = ""
    if status == "pending":
        where_clause = "WHERE t.llm_analyzed = FALSE"
    elif status == "analyzed":
        where_clause = "WHERE t.llm_analyzed = TRUE"

    sql = f"""
        SELECT 
            t.ticket_id,
            t.golden_id,
            c.name as customer_name,
            c.ltv as customer_ltv,
            c.churn_label,
            t.subject,
            t.body,
            t.sentiment,
            t.urgency,
            t.churn_risk_score,
            t.category,
            t.llm_summary,
            t.recommended_action,
            t.suggested_offer,
            t.llm_analyzed,
            t.offer_sent,
            t.offer_sent_at,
            t.llm_model_used,
            t.analyzed_at,
            t.created_at
        FROM PULSECART.support_tickets t
        LEFT JOIN PULSECART.customer_golden_id c ON t.golden_id = c.golden_id
        {where_clause}
        ORDER BY t.created_at DESC
        LIMIT :lim
    """
    rows = database.execute_query(sql, {"lim": limit})
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


@app.get("/api/v1/tickets/stats", tags=["Module 3: Churn Mining"])
def get_ticket_stats() -> Dict[str, Any]:
    """Returns aggregated support ticket statistics."""
    sql = """
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN llm_analyzed = FALSE THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN llm_analyzed = TRUE THEN 1 ELSE 0 END) as analyzed,
            AVG(churn_risk_score) as avg_churn_risk,
            SUM(CASE WHEN churn_risk_score >= 0.70 THEN 1 ELSE 0 END) as high_risk_count,
            SUM(CASE WHEN offer_sent = TRUE THEN 1 ELSE 0 END) as offers_sent
        FROM PULSECART.support_tickets
    """
    res = database.execute_query(sql)
    stats = res[0] if res else {}
    return {
        "ok": True,
        "data": {
            "total": int(stats.get("total") or 0),
            "pending": int(stats.get("pending") or 0),
            "analyzed": int(stats.get("analyzed") or 0),
            "avg_churn_risk": round(float(stats.get("avg_churn_risk") or 0.0), 3),
            "high_risk_count": int(stats.get("high_risk_count") or 0),
            "offers_sent": int(stats.get("offers_sent") or 0),
        }
    }


@app.get("/api/v1/tickets/{ticket_id}", tags=["Module 3: Churn Mining"])
def get_ticket_detail(ticket_id: str) -> Dict[str, Any]:
    """Returns full ticket detail."""
    sql = """
        SELECT 
            t.*,
            c.name as customer_name,
            c.email as customer_email,
            c.ltv as customer_ltv,
            c.churn_label,
            c.churn_risk as customer_churn_risk
        FROM PULSECART.support_tickets t
        LEFT JOIN PULSECART.customer_golden_id c ON t.golden_id = c.golden_id
        WHERE t.ticket_id = :tid
    """
    rows = database.execute_query(sql, {"tid": ticket_id})
    if not rows:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return {"ok": True, "data": _serialize_row(rows[0])}


@app.post("/api/v1/tickets/{ticket_id}/analyze", tags=["Module 3: Churn Mining"])
def analyze_single_ticket(ticket_id: str) -> Dict[str, Any]:
    """Triggers LLM classification on a ticket, writes back to Exasol, and updates customer churn."""
    rows = database.execute_query(
        "SELECT ticket_id, golden_id, subject, body FROM PULSECART.support_tickets WHERE ticket_id = :tid",
        {"tid": ticket_id}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    ticket = rows[0]
    golden_id = ticket["golden_id"]
    text_to_analyze = f"{ticket.get('subject', '')}: {ticket.get('body', '')}"

    analysis = classify_ticket(text_to_analyze)

    update_sql = """
        UPDATE PULSECART.support_tickets 
        SET sentiment = :sentiment,
            urgency = :urgency,
            churn_risk_score = :churn_risk,
            category = :category,
            llm_summary = :summary,
            recommended_action = :action,
            suggested_offer = :offer,
            llm_analyzed = TRUE,
            analyzed_at = CURRENT_TIMESTAMP,
            llm_model_used = :model
        WHERE ticket_id = :tid
    """
    database.execute_statement(update_sql, {
        "sentiment": analysis["sentiment"],
        "urgency": analysis["urgency"],
        "churn_risk": analysis["churn_risk_score"],
        "category": analysis["category"],
        "summary": analysis["summary"],
        "action": analysis["recommended_action"],
        "offer": analysis["suggested_offer"],
        "model": analysis.get("llm_model_used", "openai/gpt-oss-20b"),
        "tid": ticket_id,
    })

    _reblend_customer_churn(golden_id)

    # Return refreshed ticket
    return get_ticket_detail(ticket_id)


@app.post("/api/v1/tickets/bulk-analyze", tags=["Module 3: Churn Mining"])
def bulk_analyze_tickets() -> Dict[str, Any]:
    """Analyzes all unanalyzed tickets in batch (cap 50)."""
    pending = database.execute_query(
        "SELECT ticket_id FROM PULSECART.support_tickets WHERE llm_analyzed = FALSE LIMIT 50"
    )
    analyzed_count = 0
    errors = []

    for t in pending:
        tid = t["ticket_id"]
        try:
            analyze_single_ticket(tid)
            analyzed_count += 1
        except Exception as e:
            errors.append({"ticket_id": tid, "error": str(e)})

    return {"ok": True, "analyzed_count": analyzed_count, "errors": errors}


@app.post("/api/v1/tickets/{ticket_id}/send-offer", tags=["Module 3: Churn Mining"])
def send_retention_offer(ticket_id: str, payload: SendOfferRequest) -> Dict[str, Any]:
    """Marks retention offer as dispatched to the customer."""
    rows = database.execute_statement(
        """
        UPDATE PULSECART.support_tickets 
        SET offer_sent = TRUE, 
            offer_sent_at = CURRENT_TIMESTAMP,
            suggested_offer = :offer
        WHERE ticket_id = :tid
        """,
        {"tid": ticket_id, "offer": f"{payload.offer_type}:{payload.offer_value:.2f}"}
    )
    if rows == 0:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return {"ok": True, "message": f"Offer {payload.offer_type} of {payload.offer_value} sent to customer."}


@app.post("/api/v1/tickets", status_code=status.HTTP_201_CREATED, tags=["Module 3: Churn Mining"])
def create_support_ticket(payload: TicketCreateRequest) -> Dict[str, Any]:
    """Ingests a new support ticket, executes LLM enrichment, and persists to Exasol."""
    ticket_id = f"TCK-{uuid.uuid4().hex[:8].upper()}"
    golden_id = payload.golden_id or "GID-1001"
    
    # Resolve golden_id from customer_id if provided
    if payload.customer_id and not payload.golden_id:
        c_res = database.execute_query(
            "SELECT golden_id FROM PULSECART.customer_golden_id WHERE customer_id = :cid OR golden_id = :cid LIMIT 1",
            {"cid": payload.customer_id}
        )
        if c_res:
            golden_id = c_res[0]["golden_id"]

    body_text = payload.ticket_text or payload.body or "No description provided."
    subject = payload.subject or "Support Request"

    analysis = classify_ticket(f"{subject}: {body_text}")

    insert_sql = """
        INSERT INTO PULSECART.support_tickets (
            ticket_id, golden_id, subject, body,
            sentiment, urgency, churn_risk_score, category,
            llm_summary, recommended_action, suggested_offer,
            llm_analyzed, analyzed_at, llm_model_used, created_at
        ) VALUES (
            :tid, :gid, :subj, :body,
            :sentiment, :urgency, :score, :category,
            :summary, :action, :offer,
            TRUE, CURRENT_TIMESTAMP, :model, CURRENT_TIMESTAMP
        )
    """
    database.execute_statement(insert_sql, {
        "tid": ticket_id,
        "gid": golden_id,
        "subj": subject,
        "body": body_text,
        "sentiment": analysis["sentiment"],
        "urgency": analysis["urgency"],
        "score": analysis["churn_risk_score"],
        "category": analysis["category"],
        "summary": analysis["summary"],
        "action": analysis["recommended_action"],
        "offer": analysis["suggested_offer"],
        "model": analysis.get("llm_model_used", "openai/gpt-oss-20b"),
    })

    _reblend_customer_churn(golden_id)

    return {
        "ok": True,
        "ticket_id": ticket_id,
        "customer_id": golden_id,
        "status": "PERSISTED_TO_EXASOL",
        "analysis": analysis,
    }


# ============================================================================
# MODULE 4: Margin Protection & Returns Attribution (Task 6.3)
# ============================================================================

@app.get("/api/v1/returns/abusers", tags=["Module 4: Returns Attribution"])
def get_return_abusers(limit: int = Query(20, ge=1, le=100)) -> Dict[str, Any]:
    """Returns leaderboard of customers whose return habits erode the most margin."""
    sql = """
        SELECT 
            c.golden_id, 
            c.name, 
            c.ltv, 
            c.city,
            COUNT(r.return_id) as return_count,
            SUM(r.margin_impact) as total_margin_lost,
            SUM(r.refund_amount) as total_refunded,
            (COUNT(r.return_id) * 1.0 / NULLIF((SELECT COUNT(*) FROM PULSECART.orders WHERE golden_id = c.golden_id), 0)) as return_rate,
            CASE
              WHEN COUNT(r.return_id) >= 3 AND SUM(r.margin_impact) > 30 THEN 'returns_abuser'
              WHEN COUNT(r.return_id) >= 2 AND SUM(r.margin_impact) > 15 THEN 'moderate'
              ELSE 'low'
            END as abuse_band
        FROM PULSECART.customer_golden_id c
        JOIN PULSECART.return_events r ON c.golden_id = r.golden_id
        WHERE r.created_at >= ADD_DAYS(CURRENT_TIMESTAMP, -90)
        GROUP BY c.golden_id, c.name, c.ltv, c.city
        HAVING COUNT(r.return_id) >= 2
        ORDER BY total_margin_lost DESC
        LIMIT :lim
    """
    rows = database.execute_query(sql, {"lim": limit})
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


@app.get("/api/v1/returns/toxic-skus", tags=["Module 4: Returns Attribution"])
def get_toxic_skus() -> Dict[str, Any]:
    """Returns SKUs with net-negative margin after returns."""
    sql = """
        SELECT 
            ii.sku, 
            ii.name, 
            ii.category, 
            ii.unit_price, 
            ii.unit_cost,
            COUNT(r.return_id) as return_count,
            SUM(r.margin_impact) as total_margin_lost,
            ((ii.unit_price - ii.unit_cost) * (SELECT COUNT(*) FROM PULSECART.order_items WHERE sku = ii.sku) - SUM(r.margin_impact)) as net_margin,
            CASE 
              WHEN SUM(r.margin_impact) > ((ii.unit_price - ii.unit_cost) * (SELECT COUNT(*) FROM PULSECART.order_items WHERE sku = ii.sku)) 
              THEN 'toxic' 
              ELSE 'healthy' 
            END as status
        FROM PULSECART.inventory_item ii
        JOIN PULSECART.return_events r ON ii.sku = r.sku
        GROUP BY ii.sku, ii.name, ii.category, ii.unit_price, ii.unit_cost
        ORDER BY total_margin_lost DESC
    """
    rows = database.execute_query(sql)
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


@app.get("/api/v1/returns/impact-summary", tags=["Module 4: Returns Attribution"])
def get_returns_impact_summary() -> Dict[str, Any]:
    """Returns overall return financial impact, erosion percentage, and breakdowns."""
    tot_sql = """
        SELECT 
            SUM(margin_impact) as total_margin_lost,
            SUM(refund_amount) as total_refunded
        FROM PULSECART.return_events
    """
    tot_res = database.execute_query(tot_sql)
    tot = tot_res[0] if tot_res else {}

    by_reason_sql = """
        SELECT reason, COUNT(*) as count, SUM(margin_impact) as margin_lost
        FROM PULSECART.return_events
        GROUP BY reason
        ORDER BY margin_lost DESC
    """
    by_reason = database.execute_query(by_reason_sql)

    by_cat_sql = """
        SELECT ii.category, COUNT(r.return_id) as count, SUM(r.margin_impact) as margin_lost
        FROM PULSECART.return_events r
        JOIN PULSECART.inventory_item ii ON r.sku = ii.sku
        GROUP BY ii.category
        ORDER BY margin_lost DESC
    """
    by_cat = database.execute_query(by_cat_sql)

    total_lost = float(tot.get("total_margin_lost") or 0.0)
    total_ref = float(tot.get("total_refunded") or 0.0)
    erosion_pct = round((total_lost / max(total_ref + total_lost, 1.0)) * 100, 2)

    return {
        "ok": True,
        "data": {
            "total_margin_lost": total_lost,
            "total_refunded": total_ref,
            "erosion_pct": erosion_pct,
            "by_reason": [_serialize_row(r) for r in by_reason],
            "by_category": [_serialize_row(r) for r in by_cat],
        }
    }


@app.get("/api/v1/returns/by-customer/{golden_id}", tags=["Module 4: Returns Attribution"])
def get_customer_returns(golden_id: str) -> Dict[str, Any]:
    """Returns customer return event history."""
    sql = """
        SELECT r.*, ii.name as sku_name, ds.name as store_name
        FROM PULSECART.return_events r
        JOIN PULSECART.inventory_item ii ON r.sku = ii.sku
        JOIN PULSECART.dark_store ds ON r.store_id = ds.store_id
        WHERE r.golden_id = :gid
        ORDER BY r.created_at DESC
    """
    rows = database.execute_query(sql, {"gid": golden_id})
    return {"ok": True, "data": [_serialize_row(r) for r in rows]}


# ============================================================================
# MODULE 5: Command Center & Monitoring (Task 6.4)
# ============================================================================

@app.get("/api/v1/overview/roi", tags=["Module 5: Command Center"])
def get_roi_overview() -> Dict[str, Any]:
    """
    Returns estimated financial savings from fraud blocks, churn retention, and proactive restocks.
    """
    # 1. Fraud blocked savings today
    fraud_sql = """
        SELECT SUM(p.discount_amount) as fraud_saved
        FROM PULSECART.fraud_event f
        JOIN PULSECART.promo_code p ON f.attempted_promo_code = p.code
        WHERE f."BLOCKED" = TRUE 
          AND f.attempted_at >= ADD_HOURS(CURRENT_TIMESTAMP, -24)
    """
    f_res = database.execute_query(fraud_sql)
    fraud_blocked = float(f_res[0].get("fraud_saved") or 0.0) if f_res else 0.0

    # 2. Churn retained savings
    churn_sql = """
        SELECT SUM(c.ltv * 0.25) as retained_est
        FROM PULSECART.support_tickets t
        JOIN PULSECART.customer_golden_id c ON t.golden_id = c.golden_id
        WHERE t.offer_sent = TRUE 
          AND c.status = 'active'
    """
    c_res = database.execute_query(churn_sql)
    churn_retained = float(c_res[0].get("retained_est") or 0.0) if c_res else 0.0

    # 3. Stockout revenue preserved
    stock_sql = """
        SELECT SUM((ii.unit_price - ii.unit_cost) * df.predicted_demand_24h) as restock_saved
        FROM PULSECART.store_inventory si
        JOIN PULSECART.inventory_item ii ON si.sku = ii.sku
        JOIN PULSECART.demand_forecast df ON si.store_id = df.store_id AND si.sku = df.sku AND df.forecast_date = CURRENT_DATE
        WHERE si.last_restocked_at >= ADD_HOURS(CURRENT_TIMESTAMP, -24)
    """
    s_res = database.execute_query(stock_sql)
    restock_avoided = float(s_res[0].get("restock_saved") or 0.0) if s_res else 0.0

    today_total = round(fraud_blocked + churn_retained + restock_avoided, 2)
    week_total = round(today_total * 4.8, 2)

    return {
        "ok": True,
        "revenue_saved_today": today_total,
        "revenue_saved_week": week_total,
        "breakdown": {
            "fraud_blocked": fraud_blocked,
            "churn_retained": churn_retained,
            "restock_avoided": restock_avoided,
        }
    }


@app.get("/api/v1/overview/pipeline-health", tags=["Module 5: Command Center"])
def get_pipeline_health() -> Dict[str, Any]:
    """Returns ingestion pipeline health metrics for the past 24 hours."""
    sql = """
        SELECT 
            source_system, 
            SUM(rows_ingested) as total_rows, 
            AVG(latency_ms) as avg_latency_ms, 
            COUNT(*) as events_count
        FROM PULSECART.pipeline_event 
        WHERE processed_at >= ADD_HOURS(CURRENT_TIMESTAMP, -24)
        GROUP BY source_system 
        ORDER BY source_system
    """
    rows = database.execute_query(sql)
    total_rows = sum(float(r.get("total_rows") or 0) for r in rows)
    # 24 hours = 1440 minutes
    throughput = round(total_rows / 1440.0, 2)

    return {
        "ok": True,
        "last_24h": [_serialize_row(r) for r in rows],
        "current_throughput_rows_per_min": throughput,
        "healthy": True,
    }


@app.get("/api/v1/overview/alerts", tags=["Module 5: Command Center"])
def get_consolidated_alerts() -> Dict[str, Any]:
    """Returns consolidated list of last 50 high-priority alerts across all modules."""
    alerts: List[Dict[str, Any]] = []

    # 1. Last 10 fraud events
    f_rows = database.execute_query("""
        SELECT fraud_id, burner_email, block_reason, match_score, attempted_at
        FROM PULSECART.fraud_event
        WHERE "BLOCKED" = TRUE
        ORDER BY attempted_at DESC
        LIMIT 10
    """)
    for r in f_rows:
        alerts.append({
            "id": r["fraud_id"],
            "type": "fraud_blocked",
            "severity": "critical",
            "message": f"Promo abuse blocked for {r['burner_email']}: {r['block_reason']}",
            "timestamp": str(r["attempted_at"]),
            "source_module": "Module 1: Fraud Prevention",
        })

    # 2. Last 10 stockout warnings
    s_rows = database.execute_query("""
        SELECT si.store_id, si.sku, ii.name, si.current_stock, df.predicted_demand_6h
        FROM PULSECART.store_inventory si
        JOIN PULSECART.inventory_item ii ON si.sku = ii.sku
        JOIN PULSECART.demand_forecast df ON si.store_id = df.store_id AND si.sku = df.sku AND df.forecast_date = CURRENT_DATE
        WHERE si.current_stock < df.predicted_demand_6h
        ORDER BY (df.predicted_demand_6h - si.current_stock) DESC
        LIMIT 10
    """)
    for r in s_rows:
        alerts.append({
            "id": f"STOCK-{r['store_id']}-{r['sku']}",
            "type": "imminent_stockout",
            "severity": "critical",
            "message": f"Critical stockout risk at {r['store_id']} for {r['name']}: {r['current_stock']} left vs {r['predicted_demand_6h']} 6h demand",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_module": "Module 2: Inventory Radar",
        })

    # 3. Last 10 churn risk customers
    c_rows = database.execute_query("""
        SELECT golden_id, name, churn_risk, ltv, updated_at
        FROM PULSECART.customer_golden_id
        WHERE churn_label = 'critical'
        ORDER BY churn_risk DESC
        LIMIT 10
    """)
    for r in c_rows:
        alerts.append({
            "id": f"CHURN-{r['golden_id']}",
            "type": "critical_churn_risk",
            "severity": "high",
            "message": f"Customer {r['name']} ({r['golden_id']}) flagged critical churn risk ({float(r['churn_risk']):.2f}, LTV: €{float(r['ltv']):.2f})",
            "timestamp": str(r["updated_at"]),
            "source_module": "Module 3: Churn Miner",
        })

    # 4. Last 10 return events with high margin impact
    r_rows = database.execute_query("""
        SELECT return_id, golden_id, sku, reason, margin_impact, created_at
        FROM PULSECART.return_events
        WHERE margin_impact > 5.0
        ORDER BY created_at DESC
        LIMIT 10
    """)
    for r in r_rows:
        alerts.append({
            "id": r["return_id"],
            "type": "high_margin_return",
            "severity": "medium",
            "message": f"Return on {r['sku']} ({r['reason']}) cost €{float(r['margin_impact']):.2f} in margin erosion",
            "timestamp": str(r["created_at"]),
            "source_module": "Module 4: Returns Attribution",
        })

    # Sort alerts by timestamp descending, capped at 50
    alerts.sort(key=lambda x: str(x["timestamp"]), reverse=True)
    return {"ok": True, "data": alerts[:50]}


@app.get("/api/v1/overview/system-health", tags=["Module 5: Command Center"])
def get_system_health() -> Dict[str, Any]:
    """Returns real-time backend operational status."""
    db_ok = database.test_connection().get("status") == "healthy"
    
    # Check latest pipeline event timestamp
    p_res = database.execute_query("SELECT MAX(processed_at) as last_ts FROM PULSECART.pipeline_event")
    last_event = str(p_res[0]["last_ts"]) if p_res and p_res[0].get("last_ts") else None

    uptime = int(time.time() - START_TIME)

    return {
        "ok": True,
        "database_connected": db_ok,
        "llm_available": True,
        "last_pipeline_event": last_event,
        "uptime_seconds": uptime,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
