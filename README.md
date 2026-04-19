# Cashflo AI Policy Agent

### Automated Invoice Validation & Policy Compliance Engine

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.14-blue" alt="Python">
  <img src="https://img.shields.io/badge/React-19-purple" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-00C853-green" alt="FastAPI">
  <img src="https://img.shields.io/badge/Mailtrap-FF6C2F-orange" alt="Mailtrap">
</p>

---

## What is Cashflo?

Cashflo is an **AI-powered invoice validation system** that automatically checks invoices against your company's Accounts Payable (AP) policy. It validates invoices, detects deviations, and sends email alerts to stakeholders when issues are found.

### Non-Technical Explanation

Think of Cashflo as an **smart office assistant** that:
- Checks every invoice before payment
- Makes sure the invoice matches the Purchase Order (PO)
- Flags any problems like wrong amounts or missing documents
- **SENDS EMAIL to the right person** when something is wrong

### Technical Explanation

Cashflo is a **full-stack rule execution engine** that:
- Parses policy documents and extracts executable rules
- Validates invoices against PO, GRN, and vendor records
- Calculates confidence scores for each rule
- Supports multiple policy types (Accounts Payable, Procurement)
- Sends real-time email notifications via Mailtrap

---

## Features

| Feature | Description |
|---------|-------------|
| ✅ **Rule Extraction** | Automatically extracts rules from policy documents |
| ✅ **Three-Way Matching** | Validates Invoice vs PO vs GRN |
| ✅ **Email Notifications** | Sends alerts when deviation > 10% |
| ✅ **Confidence Scoring** | Shows confidence % for each rule |
| ✅ **Visual Rule Flow** | Displays rules as flowchart |
| ✅ **Multi-Document** | Supports AP & Procurement policies |
| ✅ **Real-time Dashboard** | Interactive web UI |

---

## Quick Start

### Option 1: Web Dashboard (Recommended)

**Terminal 1 - Start API:**
```bash
python api_server.py
```

**Terminal 2 - Start Web:**
```bash
cd web
npm install
npm run dev
```

Then open: **http://localhost:5173**

---

### Option 2: Python Backend Only

```bash
python logic.py
```

This runs validation and sends emails automatically.

---

## How to Use the Dashboard

### Step 1: Open Dashboard
Go to http://localhost:5173

### Step 2: Choose Mode
- **Basic Dashboard** - Simple invoice validation
- **Advanced Features** - Full features with graph, emails, multi-policy

### Step 3: Test Scenarios

| Scenario | Invoice Amount | Expected Result |
|----------|----------------|----------------|
| Perfect Match | 75,000 | Auto-Approved |
| Future Date | (future date) | Rejected |
| Variance (5%) | 80,000 | Flagged |
| **Critical (>10%)** | **120,000** | **Email Sent!** |

### Step 4: Run Validation
1. Set invoice amount
2. Click **Execute Rules**
3. View results

When variance > 10%, an email is automatically sent to the configured recipient!

---

## Project Structure

```
Cashflo/
├── api_server.py       # FastAPI backend for emails
├── email_service.py    # Mailtrap email integration
├── logic.py          # Rule engine & validation
├── policy_rules.json # Policy rules (AP)
├── data/
│   └── result.json   # Validation results
├── web/              # React Frontend
│   ├── src/
│   │   ├── App.tsx           # Main dashboard
│   │   └── lib/
│   │       ├── engine.ts          # Basic rule engine
│   │       ├── advancedEngine.ts   # Advanced engine
│   │       ├── emailApi.ts        # Email API client
│   │       ├── procurementPolicy.json
│   │       └── policy.json
│   └── package.json
└── README.md
```

---

## Email Configuration

### Current Setup (Mailtrap - Testing)
- **Token**: Provided in email_service.py
- **Sender**: hello@demomailtrap.co
- **Recipient**: Configured in dashboard

### To Use Real Email (Production)

Replace Mailtrap with SendGrid or Gmail in `email_service.py`:

**SendGrid:**
```python
import sendgrid
from sendgrid import SendGridAPIClient
sg = SendGridAPIClient("YOUR_SENDGRID_API_KEY")
```

**Gmail (App Password):**
```python
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login("your_email@gmail.com", "your_app_password")
```

---

## Policy Rules

The system follows Accounts Payable policy with these sections:

| Section | Description |
|---------|-------------|
| Section 1 | Invoice Receipt & Basic Validation |
| Section 2 | Purchase Order (PO) Matching |
| Section 3 | GRN Matching |
| Section 4 | Tax & Compliance |
| Section 5 | Approval Matrix |
| Section 6 | Email Notifications |
| Section 7 | QR Code Validation |

---

## Demo Scenarios

### Test 1: Perfect Match
```
Invoice: 75,000 | PO: 75,000 → Auto-Approved
```

### Test 2: Amount Variance
```
Invoice: 85,000 | PO: 75,000 (13% variance) → Email Alert
```

### Test 3: Critical Deviation
```
Invoice: 120,000 | PO: 100,000 (20% variance) → Critical Email
```

### Test 4: Future Date
```
Invoice Date: 2027-01-01 → Rejected (future date not allowed)
```

---

## API Endpoints

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/` | GET | Health check |
| `/send-deviation-email` | POST | Send deviation alert |
| `/send-critical-alert` | POST | Send critical alert (>10%) |
| `/health` | GET | API status |

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| **Python 3.14** | Backend logic, rule engine |
| **FastAPI** | REST API server |
| **React 19** | Frontend UI |
| **TypeScript** | Type safety |
| **Mailtrap** | Email testing |
| **Pydantic** | Data validation |
| **React Flow** | Visual graph |

---

## For Developers

### Install Dependencies

**Python:**
```bash
pip install pydantic python-dotenv mailtrap fastapi uvicorn
```

**Frontend:**
```bash
cd web
npm install
```

### Run Tests

```bash
# Test email
python email_service.py

# Test backend
python api_server.py

# Test frontend
cd web && npm run dev
```

### Build for Production

```bash
# Frontend
cd web
npm run build

# Backend - use gunicorn or similar
gunicorn api_server:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## Troubleshooting

### Email Not Sending?
1. Check API is running: `python api_server.py`
2. Check dashboard shows "API Connected"
3. Verify variance > 10%

### Build Errors?
```bash
cd web
npm install
npm run build
```

### Port Already in Use?
```bash
# Find and kill process
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## License

MIT License - Feel free to use and modify!

---

## Support

For questions or issues, please create an issue on GitHub.

---

**Built with ❤️ for Finance Teams**