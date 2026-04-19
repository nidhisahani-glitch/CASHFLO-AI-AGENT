from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from email_service import send_deviation_email, send_critical_alert
import uvicorn
import os

app = FastAPI(title="Cashflo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DeviationAlert(BaseModel):
    to_email: str
    invoice_number: str
    vendor_name: str
    deviation_type: str
    deviation_details: str
    deviation_percent: float
    recommended_action: str


class CriticalAlert(BaseModel):
    to_email: str
    invoice_number: str
    vendor_name: str
    deviation_percent: float


@app.get("/")
def root():
    # Check if frontend dist exists
    if os.path.exists("web/dist/index.html"):
        return FileResponse("web/dist/index.html")
    return {"message": "Cashflo API Running", "status": "ok"}


@app.get("/assets/{file}")
def static_assets(file: str):
    asset_path = f"web/dist/assets/{file}"
    if os.path.exists(asset_path):
        return FileResponse(asset_path)
    return {"error": "Not found"}


@app.post("/send-deviation-email")
def send_deviation(alert: DeviationAlert):
    try:
        response = send_deviation_email(
            to_email=alert.to_email,
            invoice_number=alert.invoice_number,
            vendor_name=alert.vendor_name,
            deviation_type=alert.deviation_type,
            deviation_details=alert.deviation_details,
            deviation_percent=alert.deviation_percent,
            recommended_action=alert.recommended_action,
        )
        return {"success": True, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-critical-alert")
def send_critical(alert: CriticalAlert):
    try:
        response = send_critical_alert(
            to_email=alert.to_email,
            invoice_number=alert.invoice_number,
            vendor_name=alert.vendor_name,
            deviation_percent=alert.deviation_percent,
        )
        return {"success": True, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
