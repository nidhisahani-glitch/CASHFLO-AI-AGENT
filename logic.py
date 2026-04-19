import sys

sys.stdout.reconfigure(encoding="utf-8")

import os
import json
import re
from datetime import date
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from email_service import send_deviation_email, send_critical_alert

# ================================
# ENV SETUP
# ================================
load_dotenv()
# ================================
# DATA MODELS
# ================================


class LineItem(BaseModel):
    item_name: str
    quantity: float
    unit_rate: float


class Invoice(BaseModel):
    invoice_number: str
    invoice_date: date
    vendor_gstin: str
    po_number: Optional[str]
    grand_total: float
    taxable_amount: float
    tax_amount: float
    cgst: float = 0
    sgst: float = 0
    igst: float = 0
    items: List[LineItem]
    place_of_supply: str
    is_handwritten: bool = False


class PO(BaseModel):
    number: str
    vendor_gstin: str
    total_amount: float
    items: List[LineItem]


class GRN(BaseModel):
    number: str
    grn_date: date
    po_number: str
    items: List[LineItem]


class Vendor(BaseModel):
    name: str
    gstin: str
    pan: str
    is_on_watchlist: bool = False


# ================================
# MOCK RULE EXTRACTOR (STAGE 1)
# ================================


def extract_rules() -> Dict[str, Any]:
    """
    Simulates AI extraction.
    Replace this with Gemini call if needed.
    """
    return {
        "rules": [
            {
                "rule_id": "R1",
                "condition": "invoice.invoice_date > today",
                "action": "REJECT",
                "reason": "Future-Dated Invoice Not Permitted",
            },
            {
                "rule_id": "R2",
                "condition": "po is None",
                "action": "REJECT",
                "reason": "Missing PO",
            },
            {
                "rule_id": "R3",
                "condition": "invoice.grand_total > po.total_amount * 1.10",
                "action": "ESCALATE",
                "route_to": "FINANCE_CONTROLLER",
            },
            {
                "rule_id": "R4",
                "condition": "invoice.grand_total <= po.total_amount * 1.01",
                "action": "AUTO_APPROVE",
            },
            {
                "rule_id": "R5",
                "condition": "vendor.is_on_watchlist == True",
                "action": "ESCALATE",
                "route_to": "DEPARTMENT_HEAD",
            },
            {
                "rule_id": "R6",
                "condition": "invoice.cgst != invoice.sgst",
                "action": "FLAG",
                "reason": "CGST and SGST mismatch",
            },
        ]
    }


# ================================
# RULE ENGINE (STAGE 2)
# ================================


def evaluate_condition(condition: str, context: dict) -> bool:
    try:
        return eval(condition, {}, context)
    except Exception as e:
        print(f"Eval error: {e}")
        return False


def build_context(invoice, po, grn, vendor):
    return {
        "invoice": invoice,
        "po": po,
        "grn": grn,
        "vendor": vendor,
        "today": date.today(),
    }


class RuleEngine:
    def __init__(self, rules: Dict[str, Any]):
        self.rules = rules.get("rules", [])

    def validate(self, invoice, po, grn, vendor):
        context = build_context(invoice, po, grn, vendor)

        flags = []
        rejections = []
        logs = []
        approver = "AUTO"

        for rule in self.rules:
            if evaluate_condition(rule["condition"], context):
                logs.append(f"Triggered: {rule['rule_id']}")

                action = rule["action"]

                if action == "REJECT":
                    rejections.append(rule.get("reason", "Rejected"))

                elif action == "FLAG":
                    flags.append(rule.get("reason", "Flagged"))

                elif action == "ESCALATE":
                    approver = rule.get("route_to", "UNKNOWN")
                    flags.append(f"Escalated to {approver}")

                elif action == "AUTO_APPROVE":
                    approver = "AUTO"

        # Final decision
        if rejections:
            status = "REJECTED"
        elif flags:
            status = "FLAGGED"
        else:
            status = "APPROVED"

        # Send email notifications for deviations
        if invoice and po and status in ["FLAGGED", "REJECTED"]:
            variance = ((invoice.grand_total - po.total_amount) / po.total_amount) * 100
            if variance > 10:
                send_critical_alert(
                    to_email="nidhisahani3190@gmail.com",
                    invoice_number=invoice.invoice_number,
                    vendor_name=vendor.name if hasattr(vendor, "name") else "Unknown",
                    deviation_percent=variance,
                )
            elif variance > 1:
                send_deviation_email(
                    to_email="nidhisahani3190@gmail.com",
                    invoice_number=invoice.invoice_number,
                    vendor_name=vendor.name if hasattr(vendor, "name") else "Unknown",
                    deviation_type="Amount Variance",
                    deviation_details=f"Invoice {invoice.grand_total} vs PO {po.total_amount}",
                    deviation_percent=variance,
                    recommended_action="Review and approve",
                )

        return {
            "status": status,
            "approver": approver,
            "flags": flags,
            "rejections": rejections,
            "logs": logs,
        }


# ================================
# MAIN PIPELINE
# ================================


def main():
    print("🚀 Running End-to-End Pipeline\n")

    # STEP 1: Extract rules (AI simulation)
    rules = extract_rules()
    print("✅ Rules Extracted\n")

    # STEP 2: Create sample data
    vendor = Vendor(
        name="ABC Pvt Ltd",
        gstin="27ABCDE1234F1Z5",
        pan="ABCDE1234F",
        is_on_watchlist=True,
    )

    po = PO(number="PO-001", vendor_gstin=vendor.gstin, total_amount=100000, items=[])

    invoice = Invoice(
        invoice_number="INV-001",
        invoice_date=date(2026, 4, 20),
        vendor_gstin=vendor.gstin,
        po_number="PO-001",
        grand_total=120000,
        taxable_amount=120000,
        tax_amount=0,
        items=[],
        place_of_supply="27",
        cgst=5000,
        sgst=4000,
    )

    # STEP 3: Run engine
    engine = RuleEngine(rules)
    result = engine.validate(invoice, po, None, vendor)

    # STEP 4: Output
    print("📊 FINAL RESULT")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
