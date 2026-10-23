"""
PulseCart: Acceptance Test Runner (13 End-to-End Verifications)
"""
import glob
import os
import subprocess
import sys

# Ensure root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app
from app import database
from app.llm_service import classify_ticket

print("=======================================================")
print("PULSECART END-TO-END ACCEPTANCE SUITE")
print("=======================================================")

results = {}

# Test 1: grep -r 'gsk_' *.py returns ZERO matches
py_files = [p for p in glob.glob("*.py") + glob.glob("*/*.py") + glob.glob("*/*/*.py")]
gsk_matches = []
needle = "gsk" + "_"
for p in py_files:
    if ".venv" in p or "venv" in p or "run_acceptance.py" in p:
        continue
    with open(p, "r", encoding="utf-8", errors="ignore") as f:
        if needle in f.read():
            gsk_matches.append(p)
results["1. No gsk_ keys in .py files"] = (len(gsk_matches) == 0, f"Matches: {gsk_matches}")

# Test 2: git check-ignore .env returns .env
try:
    p2 = subprocess.run(["git", "check-ignore", ".env"], capture_output=True, text=True)
    is_ignored = ".env" in p2.stdout
    results["2. .env is gitignored"] = (is_ignored, p2.stdout.strip())
except Exception as e:
    results["2. .env is gitignored"] = (False, str(e))

# Test 3: classify_ticket prints model used and returns dict with required keys
try:
    res3 = classify_ticket("My order was late and I want a refund")
    has_keys = all(k in res3 for k in ["sentiment", "urgency", "churn_risk_score", "llm_model_used"])
    results["3. LLM classify_ticket"] = (has_keys, f"Model: {res3.get('llm_model_used')}, Sentiment: {res3.get('sentiment')}")
except Exception as e:
    results["3. LLM classify_ticket"] = (False, str(e))

# Test 4: init.sql succeeds on Exasol without UDF errors
try:
    init_sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sql", "init.sql")
    with open(init_sql_path, "r", encoding="utf-8") as f:
        sql = f.read()
    cleaned = "\n".join([l for l in sql.splitlines() if not l.strip().startswith("--")])
    stmts = [s.strip() for s in cleaned.split(";") if s.strip()]
    with database.db_session(schema="") as con:
        for s in stmts:
            con.execute(s)
    results["4. init.sql execution (no UDF errors)"] = (True, f"{len(stmts)} statements executed successfully")
except Exception as e:
    results["4. init.sql execution (no UDF errors)"] = (False, str(e))

client = TestClient(app)

# Test 5: /health returns ok: True, database: connected
r5 = client.get("/health").json()
results["5. GET /health"] = (r5.get("ok") is True and r5.get("database") == "connected", str(r5))

# Test 6: /api/v1/overview/roi returns valid JSON with revenue_saved_today
r6 = client.get("/api/v1/overview/roi").json()
results["6. GET /api/v1/overview/roi"] = (r6.get("ok") is True and "revenue_saved_today" in r6, f"Saved today: ₹{r6.get('revenue_saved_today')}")

# Test 7: /api/v1/inventory/stockout-warnings returns >= 5 critical SKUs
r7 = client.get("/api/v1/inventory/stockout-warnings").json()
crit_count = sum(1 for item in r7.get("data", []) if item.get("severity") == "critical")
results["7. GET /api/v1/inventory/stockout-warnings"] = (crit_count >= 5, f"Critical SKUs: {crit_count}")

# Test 8: /api/v1/returns/abusers returns >= 2 customers flagged as abusers
r8 = client.get("/api/v1/returns/abusers").json()
abuser_count = len(r8.get("data", []))
results["8. GET /api/v1/returns/abusers"] = (abuser_count >= 2, f"Abusers returned: {abuser_count}")

# Test 9: /api/v1/returns/toxic-skus returns >= 1 toxic SKU
r9 = client.get("/api/v1/returns/toxic-skus").json()
toxic_count = sum(1 for item in r9.get("data", []) if item.get("status") == "toxic")
results["9. GET /api/v1/returns/toxic-skus"] = (toxic_count >= 1, f"Toxic SKUs: {toxic_count}")

# Test 10: POST /api/v1/checkout promo abuse block
r10 = client.post("/api/v1/checkout", json={
    "email": "aarav.sharma+spam@gmail.com",
    "address": "Flat 402, Sunshine Apartments, 5th Block, Koramangala, Bengaluru 560095",
    "promo_code": "$15OFF"
}).json()
results["10. POST /api/v1/checkout (Promo Abuse)"] = (
    r10.get("ok") is True and r10.get("blocked") is True,
    f"Method: {r10.get('match_method')}, Score: {r10.get('match_score')}"
)

# Test 11: POST /api/v1/tickets/{id}/analyze triggers LLM and writes back enriched scores
r11 = client.post("/api/v1/tickets/TCK-1001/analyze").json()
t11_data = r11.get("data", {})
results["11. POST /api/v1/tickets/{id}/analyze"] = (
    r11.get("ok") is True and t11_data.get("sentiment") is not None and t11_data.get("churn_risk_score") is not None,
    f"Score: {t11_data.get('churn_risk_score')}, Offer: {t11_data.get('suggested_offer')}"
)

# Test 12: GET /api/v1/overview/alerts returns consolidated alerts from all modules
r12 = client.get("/api/v1/overview/alerts").json()
alert_count = len(r12.get("data", []))
results["12. GET /api/v1/overview/alerts"] = (alert_count > 0, f"Alert count: {alert_count}")

# Test 13: scripts/simulate.py single execution cycle
try:
    import scripts.simulate as sim
    sim.run_simulator(once=True)
    results["13. scripts/simulate.py execution"] = (True, "Simulator executed single cycle without errors")
except Exception as e:
    results["13. scripts/simulate.py execution"] = (False, str(e))

print("\n================== FINAL ACCEPTANCE RESULTS ==================")
all_pass = True
for name, (status, detail) in results.items():
    tag = "[PASS]" if status else "[FAIL]"
    if not status:
        all_pass = False
    print(f"{tag} {name} -> {detail}")
print("==============================================================")
if all_pass:
    print("ALL 13 ACCEPTANCE TESTS PASSED!")
    sys.exit(0)
else:
    print("SOME TESTS FAILED - REVIEW ABOVE")
    sys.exit(1)
