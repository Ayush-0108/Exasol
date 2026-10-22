"""
PulseCart Live Activity Simulator
=================================
Generates continuous live quick-commerce operational activity so the dashboard
remains dynamic and realistic during hackathon presentations.

Activity generated:
- New customer orders across dark stores
- Support tickets entering the unanalyzed queue
- Promo code authorization & fraud abuse blocks
- Real-time pipeline ingestion telemetry events

Usage:
    python scripts/simulate.py
    Press Ctrl+C to stop.
"""

import os
import random
import sys
import time
import uuid
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import execute_query, execute_statement

CUSTOMERS = ['GID-1001', 'GID-1002', 'GID-1005', 'GID-1006', 'GID-1007', 'GID-1008', 'GID-1009', 'GID-1010']
STORES = ['STORE-BLR-01', 'STORE-BLR-02', 'STORE-BLR-03', 'STORE-BLR-04']
SKUS = [
    ('MK-001', 1.49), ('BR-002', 2.29), ('EG-003', 2.49), ('BV-004', 3.99),
    ('BG-005', 1.79), ('AV-006', 1.19), ('CH-007', 3.49), ('CP-008', 5.99),
]
PROMOS = ['$15OFF', '$10SAVE', 'WELCOME5', 'VIP25']

TICKET_TEMPLATES = [
    {'subject': 'Late delivery complaint', 'body': 'My order was 35 minutes late and my ice cream melted completely. Cancel my subscription!'},
    {'subject': 'Missing grocery items', 'body': 'The bread and milk were missing from my bag, driver gave no explanation.'},
    {'subject': 'Damaged egg carton', 'body': 'Four out of six eggs arrived cracked. Need a refund.'},
    {'subject': 'Outstanding service today', 'body': 'Arrived in 9 minutes, courteous driver, everything fresh. Thank you!'},
    {'subject': 'Payment charged twice', 'body': 'I see two authorizations on my credit card statement for one order.'},
    {'subject': 'Checkout app crash', 'body': 'When entering delivery notes the app crashed. iOS 17.5 iPhone 14 Pro.'},
]

BURNER_EMAILS = [
    ('aarav.sharma+spam@gmail.com', 'GID-1001', 'Flat 402, Sunshine Apartments, 5th Block, Koramangala, Bengaluru 560095'),
    ('priya.verma1@example.in', 'GID-1002', 'No 12, 2nd Cross, 1st Stage, Indiranagar, Bengaluru 560038'),
    ('aarav.sh0rma@example.in', 'GID-1001', 'Flat 402, Sunshine Apt, 5th Block, Koramangala, Bengaluru 560095'),
    ('fake.user99@disposable.com', None, 'Villa 8, Sobha Dream Acres, Whitefield, Bengaluru 560066'),
    ('j.doe+promo@example.in', 'GID-1005', 'Flat 402, Sunshine Apt, 5th Block, Koramangala, Bengaluru 560095'),
]


def insert_order():
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    customer = random.choice(CUSTOMERS)
    store = random.choice(STORES)
    item_choice, price = random.choice(SKUS)
    qty = random.randint(1, 3)
    subtotal = round(price * qty, 2)
    discount = 5.00 if random.random() < 0.25 else 0.00
    total = max(round(subtotal - discount, 2), 0.99)

    order_sql = """
        INSERT INTO PULSECART.orders (order_id, golden_id, store_id, channel, status, subtotal, discount_applied, total, created_at, fulfilled_at)
        VALUES (:oid, :gid, :sid, 'app', 'fulfilled', :sub, :disc, :tot, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """
    execute_statement(order_sql, {
        "oid": order_id, "gid": customer, "sid": store,
        "sub": subtotal, "disc": discount, "tot": total,
    })

    item_id = f"OI-{uuid.uuid4().hex[:8].upper()}"
    item_sql = """
        INSERT INTO PULSECART.order_items (item_id, order_id, sku, quantity, unit_price)
        VALUES (:iid, :oid, :sku, :qty, :price)
    """
    execute_statement(item_sql, {
        "iid": item_id, "oid": order_id, "sku": item_choice, "qty": qty, "price": price
    })

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Order created: {order_id} ({customer} at {store}, ₹{total})")


def insert_ticket():
    ticket_id = f"TCK-{uuid.uuid4().hex[:8].upper()}"
    customer = random.choice(CUSTOMERS)
    template = random.choice(TICKET_TEMPLATES)

    sql = """
        INSERT INTO PULSECART.support_tickets (ticket_id, golden_id, subject, body, llm_analyzed, created_at)
        VALUES (:tid, :gid, :subj, :body, FALSE, CURRENT_TIMESTAMP)
    """
    execute_statement(sql, {
        "tid": ticket_id, "gid": customer,
        "subj": template["subject"], "body": template["body"]
    })
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Support ticket created: {ticket_id} for {customer} - '{template['subject']}'")


def attempt_promo():
    is_fraud = random.random() < 0.6
    if is_fraud:
        email, matched_gid, addr = random.choice(BURNER_EMAILS)
        promo = random.choice(PROMOS)
        fraud_id = f"FR-{uuid.uuid4().hex[:8].upper()}"
        score = round(random.uniform(0.88, 0.96), 3)

        sql = """
            INSERT INTO PULSECART.fraud_event (
                fraud_id, attempted_at, burner_email, attempted_promo_code,
                matched_golden_id, match_method, match_score, block_reason, "BLOCKED"
            ) VALUES (
                :fid, CURRENT_TIMESTAMP, :email, :code,
                :gid, 'address_similarity', :score, 'Address matches existing account on file', TRUE
            )
        """
        execute_statement(sql, {
            "fid": fraud_id, "email": email, "code": promo,
            "gid": matched_gid, "score": score
        })
        execute_statement("UPDATE PULSECART.promo_code SET abuse_blocked_count = abuse_blocked_count + 1 WHERE code = :c", {"c": promo})
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Promo abuse blocked: {email} attempted {promo} (Fraud ID: {fraud_id})")
    else:
        legit_num = random.randint(100, 999)
        email = f"shopper{legit_num}@gmail.com"
        promo = random.choice(PROMOS)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Promo approved: {email} redeemed {promo}")


def insert_pipeline_event():
    source = random.choice(['order_app', 'loyalty', 'support', 'returns_portal', 'web_guest'])
    rows = random.randint(50, 450)
    latency = random.randint(60, 650)
    event_id = f"PE-{uuid.uuid4().hex[:8].upper()}"

    sql = """
        INSERT INTO PULSECART.pipeline_event (event_id, source_system, event_type, rows_ingested, processed_at, latency_ms)
        VALUES (:eid, :src, 'insert', :rows, CURRENT_TIMESTAMP, :lat)
    """
    execute_statement(sql, {
        "eid": event_id, "src": source, "rows": rows, "lat": latency
    })
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Pipeline event: {source} ingested {rows} rows ({latency}ms)")


def run_simulator(once: bool = False):
    print("==================================================")
    print("PulseCart Live Activity Simulator Running")
    print("Target: Exasol (Schema: PULSECART)")
    print("Press Ctrl+C to stop.")
    print("==================================================")
    try:
        while True:
            insert_order()
            time.sleep(random.uniform(2, 5))
            if random.random() < 0.6:
                insert_ticket()
                time.sleep(random.uniform(1, 3))
            if random.random() < 0.7:
                attempt_promo()
                time.sleep(random.uniform(1, 3))
            insert_pipeline_event()
            
            if once:
                print("Single simulation iteration complete.")
                break
            time.sleep(random.uniform(3, 7))
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")


if __name__ == "__main__":
    run_simulator()
