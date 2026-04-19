const API_URL = "http://localhost:8000";

export interface DeviationAlert {
  to_email: string;
  invoice_number: string;
  vendor_name: string;
  deviation_type: string;
  deviation_details: string;
  deviation_percent: number;
  recommended_action: string;
}

export interface CriticalAlert {
  to_email: string;
  invoice_number: string;
  vendor_name: string;
  deviation_percent: number;
}

export async function sendDeviationEmail(alert: DeviationAlert): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/send-deviation-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert)
    });
    const data = await response.json();
    console.log("Email sent:", data);
    return data.success || false;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendCriticalAlert(alert: CriticalAlert): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/send-critical-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert)
    });
    const data = await response.json();
    console.log("Critical alert sent:", data);
    return data.success || false;
  } catch (error) {
    console.error("Failed to send critical alert:", error);
    return false;
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}