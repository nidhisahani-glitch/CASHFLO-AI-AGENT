import mailtrap as mt

MAILTRAP_TOKEN = "81c096def73b33799b648b501353ec93"
SENDER_EMAIL = "hello@demomailtrap.co"
SENDER_NAME = "Cashflo AI Agent"


def send_deviation_email(
    to_email: str,
    invoice_number: str,
    vendor_name: str,
    deviation_type: str,
    deviation_details: str,
    deviation_percent: float,
    recommended_action: str,
):
    """Send deviation alert email via Mailtrap"""

    mail = mt.Mail(
        sender=mt.Address(email=SENDER_EMAIL, name=SENDER_NAME),
        to=[mt.Address(email=to_email)],
        subject=f"[CASHFLO] Deviation Alert: Invoice {invoice_number}",
        text=f"""
Deviation Alert from Cashflo AI Policy Agent
=========================================

Invoice Details:
- Invoice Number: {invoice_number}
- Vendor Name: {vendor_name}

Deviation Information:
- Deviation Type: {deviation_type}
- Deviation Details: {deviation_details}
- Deviation Percentage: {deviation_percent:.2f}%

Recommended Action: {recommended_action}

This is an automated notification from the Cashflo Rule Engine.
Please take necessary action within 15 minutes.
        """,
        category="Deviation Alert",
    )

    client = mt.MailtrapClient(token=MAILTRAP_TOKEN)
    response = client.send(mail)
    print(f"[OK] Email sent successfully! Response: {response}")
    return response


def send_critical_alert(
    to_email: str, invoice_number: str, vendor_name: str, deviation_percent: float
):
    """Send critical alert (variance > 10%)"""

    mail = mt.Mail(
        sender=mt.Address(email=SENDER_EMAIL, name=SENDER_NAME),
        to=[mt.Address(email=to_email)],
        subject=f"[CRITICAL] Invoice {invoice_number} - {deviation_percent:.1f}% Variance",
        text=f"""
*** CRITICAL DEVIATION ALERT ***
==============================

Invoice: {invoice_number}
Vendor: {vendor_name}
Variance: {deviation_percent:.1f}% (exceeds 10% threshold)

This requires IMMEDIATE review by Finance Controller and Internal Audit.

Action Required: Review and approve or reject the invoice.
        """,
        category="Critical Alert",
    )

    client = mt.MailtrapClient(token=MAILTRAP_TOKEN)
    response = client.send(mail)
    print(f"[CRITICAL] Alert sent! Response: {response}")
    return response


def test_email():
    """Test email sending"""
    send_deviation_email(
        to_email="nidhisahani3190@gmail.com",
        invoice_number="INV-2024-001",
        vendor_name="TechFlow Systems",
        deviation_type="Amount Variance",
        deviation_details="Invoice 120000 vs PO 100000",
        deviation_percent=20.0,
        recommended_action="Review and approve",
    )


if __name__ == "__main__":
    test_email()
