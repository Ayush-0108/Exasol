"""
PulseCart: The Churn Miner (Groq LLM Support Ticket Classifier)
===============================================================
Module 3 Intelligence Engine:
- Uses Groq for ultra-fast structured classification of support tickets.
- Fallback chain: Primary (openai/gpt-oss-20b) -> Fallback (qwen/qwen3.8-27b) -> Heuristic.
- Enforces strict Pydantic output validation including sentiment, urgency, churn_risk_score,
  category, summary, recommended_action, and suggested_offer.
"""

import json
import logging
import os
import re
import sys
from typing import Any, Dict, Literal, Optional

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field, ValidationError

# Load environment variables from .env
load_dotenv()

# Key-loading logic (Task 1.1)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY env var not set. Copy .env.example to .env and fill in your key.", file=sys.stderr)
    sys.exit(1)

# Model configuration (Task 2.1)
PRIMARY_MODEL = os.getenv("GROQ_PRIMARY_MODEL", "openai/gpt-oss-20b")
FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "qwen/qwen3.8-27b")

logger = logging.getLogger("pulsecart.llm_service")


class TicketAnalysisResult(BaseModel):
    """Pydantic schema enforcing the full contract required by PulseCart Module 3."""
    sentiment: Literal["very_negative", "negative", "slightly_negative", "neutral", "positive"]
    urgency: Literal["low", "medium", "high", "critical"]
    churn_risk_score: float = Field(..., ge=0.0, le=1.0)
    category: Literal[
        "delivery_reliability",
        "order_accuracy",
        "product_quality",
        "billing_issue",
        "app_issue",
        "customer_service",
        "positive_feedback",
        "general",
    ]
    summary: str
    recommended_action: str
    suggested_offer: Optional[
        Literal[
            "store_credit:15.00",
            "store_credit:25.00",
            "free_delivery:3",
            "discount_percent:10",
            "discount_percent:15",
        ]
    ] = None


SYSTEM_PROMPT = """You are a customer success AI for a quick-commerce (10-30 min grocery delivery) company. Analyze the support ticket and return STRICT JSON only — no markdown, no prose.

Schema:
{
  "sentiment": "very_negative" | "negative" | "slightly_negative" | "neutral" | "positive",
  "urgency": "low" | "medium" | "high" | "critical",
  "churn_risk_score": <float 0.0-1.0>,
  "category": "delivery_reliability" | "order_accuracy" | "product_quality" | "billing_issue" | "app_issue" | "customer_service" | "positive_feedback" | "general",
  "summary": "<one sentence summary>",
  "recommended_action": "<concrete next step for retention team>",
  "suggested_offer": null | "store_credit:15.00" | "store_credit:25.00" | "free_delivery:3" | "discount_percent:10" | "discount_percent:15"
}

Suggested offer rules (apply based on churn_risk_score):
- churn_risk_score >= 0.8 → "store_credit:25.00"
- churn_risk_score >= 0.6 → "store_credit:15.00"
- churn_risk_score >= 0.4 → "free_delivery:3"
- churn_risk_score >= 0.2 → "discount_percent:10"
- churn_risk_score < 0.2 → null (customer is happy)

Return ONLY the JSON object."""


def _heuristic_classify(ticket_text: str) -> Dict[str, Any]:
    """
    Final tier heuristic fallback if all Groq models are unreachable.
    Returns complete schema for operational resilience.
    """
    lower = ticket_text.lower()
    
    # Critical churn signals
    if any(k in lower for k in ["cancel", "refund", "never again", "worst", "unacceptable", "scam", "lawyer", "twice"]):
        score = 0.88
        urgency = "critical"
        sentiment = "very_negative"
        offer = "store_credit:25.00"
        cat = "billing_issue" if "charged" in lower or "twice" in lower or "refund" in lower else "delivery_reliability"
        rec = "Issue immediate credit and dispatch priority retention apology."
    elif any(k in lower for k in ["late", "delayed", "missing", "crushed", "broken", "melted", "cold"]):
        score = 0.65
        urgency = "high"
        sentiment = "negative"
        offer = "store_credit:15.00"
        cat = "order_accuracy" if "missing" in lower else "delivery_reliability"
        rec = "Process item credit and notify store operations supervisor."
    elif any(k in lower for k in ["crash", "bug", "glitch", "pending", "points"]):
        score = 0.45
        urgency = "medium"
        sentiment = "slightly_negative"
        offer = "free_delivery:3"
        cat = "app_issue"
        rec = "Log technical bug report and issue loyalty goodwill voucher."
    elif any(k in lower for k in ["thank", "great", "love", "awesome", "fast", "polite", "perfect"]):
        score = 0.05
        urgency = "low"
        sentiment = "positive"
        offer = None
        cat = "positive_feedback"
        rec = "Send thank you note and route feedback to store courier."
    else:
        score = 0.25
        urgency = "low"
        sentiment = "neutral"
        offer = "discount_percent:10"
        cat = "general"
        rec = "Review customer ticket and reply within standard SLA."

    return {
        "sentiment": sentiment,
        "urgency": urgency,
        "churn_risk_score": score,
        "category": cat,
        "summary": ticket_text[:120].strip() + ("..." if len(ticket_text) > 120 else ""),
        "recommended_action": rec,
        "suggested_offer": offer,
        "llm_model_used": "heuristic",
    }


def _call_groq(model_name: str, ticket_text: str) -> Dict[str, Any]:
    """Invokes a specific Groq model with structured output."""
    model = ChatGroq(
        model=model_name,
        groq_api_key=GROQ_API_KEY,
        temperature=0.1,
    )
    
    # Try structured output first
    try:
        structured_llm = model.with_structured_output(TicketAnalysisResult)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Customer Ticket:\n{ticket_text.strip()}"),
        ]
        result = structured_llm.invoke(messages)
        if isinstance(result, TicketAnalysisResult):
            data = result.model_dump()
            data["llm_model_used"] = model_name
            return data
        elif isinstance(result, dict):
            validated = TicketAnalysisResult(**result)
            data = validated.model_dump()
            data["llm_model_used"] = model_name
            return data
    except Exception as struct_err:
        logger.debug(f"Structured output attempt with {model_name} failed: {struct_err}. Trying direct JSON parsing.")

    # Fallback to direct prompt + JSON parse
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Customer Ticket:\n{ticket_text.strip()}"),
    ]
    raw_res = model.invoke(messages)
    content = str(raw_res.content).strip()
    
    # Strip potential markdown fences
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    
    parsed = json.loads(content)
    validated = TicketAnalysisResult(**parsed)
    data = validated.model_dump()
    data["llm_model_used"] = model_name
    return data


def classify_ticket(ticket_text: str) -> Dict[str, Any]:
    """
    Classifies a support ticket using Groq LLMs with fallback chain:
    PRIMARY_MODEL -> FALLBACK_MODEL -> Heuristic Fallback.
    """
    if not ticket_text or not ticket_text.strip():
        raise ValueError("Ticket text cannot be empty.")

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        try:
            result = _call_groq(model, ticket_text)
            print(f"[LLM] Classified using {model}")
            return result
        except Exception as e:
            print(f"[LLM] {model} failed: {e}. Trying next model.")
            continue

    # Both Groq models failed -> heuristic fallback
    print("[LLM] All Groq models failed. Using heuristic fallback.")
    return _heuristic_classify(ticket_text)


# Backwards compatibility alias
analyze_ticket = classify_ticket


if __name__ == "__main__":
    test_ticket = "My order was late and I want a refund"
    print("Testing classify_ticket...")
    res = classify_ticket(test_ticket)
    print("Result:", json.dumps(res, indent=2))
