// ==========================================
// Email Notification Service
// Handles deviation alerts per Section 6
// ==========================================

import type { Invoice, Vendor } from './engine';

export interface EmailNotification {
  id: string;
  timestamp: Date;
  to: string;
  subject: string;
  body: string;
  deviation_type: string;
  deviation_details: string;
  recommended_action: string;
  sent: boolean;
}

export interface NotificationConfig {
  deviation_detected: boolean;
  deviation_type?: string;
  deviation_details?: string;
  deviation_percent?: number;
  recommended_action?: string;
  within_minutes?: number;
  escalation_level?: number;
}

const APPROVER_EMAILS: Record<string, string> = {
  'AP_CLERK': 'ap_clerk@cashflo.com',
  'DEPARTMENT_HEAD': 'dept_head@cashflo.com',
  'FINANCE_CONTROLLER': 'finance_controller@cashflo.com',
  'CFO': 'cfo@cashflo.com',
  'INTERNAL_AUDIT': 'internal_audit@cashflo.com',
  'PROCUREMENT': 'procurement@cashflo.com',
};

export class EmailService {
  private notifications: EmailNotification[] = [];

  sendDeviationEmail(
    invoice: Invoice,
    vendor: Vendor,
    deviationType: string,
    deviationDetails: string,
    deviationPercent: number,
    approver: string,
    recommendedAction: string
  ): EmailNotification {
    const notification: EmailNotification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      to: APPROVER_EMAILS[approver] || approver,
      subject: `[CASHFLO] Deviation Alert: Invoice ${invoice.invoice_number}`,
      body: this.buildEmailBody(invoice, vendor, deviationType, deviationDetails, deviationPercent, recommendedAction),
      deviation_type: deviationType,
      deviation_details: deviationDetails,
      recommended_action: recommendedAction,
      sent: false
    };

    this.notifications.push(notification);
    
    console.log('📧 EMAIL NOTIFICATION QUEUED');
    console.log('----------------------------------------');
    console.log(`To: ${notification.to}`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Deviation: ${deviationType} (${deviationPercent.toFixed(2)}%)`);
    console.log(`Action: ${recommendedAction}`);
    console.log('----------------------------------------');

    return notification;
  }

  private buildEmailBody(
    invoice: Invoice,
    vendor: Vendor,
    deviationType: string,
    deviationDetails: string,
    deviationPercent: number,
    recommendedAction: string
  ): string {
    return `
=========================================
CASHFLO DEVIATION ALERT
=========================================

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Invoice Date: ${invoice.invoice_date}
- Grand Total: INR ${invoice.grand_total.toLocaleString('en-IN')}

Vendor Details:
- Vendor Name: ${vendor.name}
- Vendor GSTIN: ${invoice.vendor_gstin}
- PO Reference: ${invoice.po_number}

Deviation Information:
- Deviation Type: ${deviationType}
- Deviation Details: ${deviationDetails}
- Deviation Percentage: ${deviationPercent.toFixed(2)}%

Recommended Action: ${recommendedAction}

This notification was sent automatically by the Cashflo Rule Engine.
Please take necessary action within 15 minutes.

=========================================
    `.trim();
  }

  sendCriticalAlert(
    invoice: Invoice,
    vendor: Vendor,
    deviationType: string,
    deviationPercent: number
  ): void {
    console.log('🚨 CRITICAL ALERT TRIGGERED');
    
    this.sendDeviationEmail(
      invoice,
      vendor,
      deviationType,
      `Critical deviation detected: ${deviationPercent.toFixed(2)}% variance`,
      deviationPercent,
      'FINANCE_CONTROLLER',
      'Immediate review required - variance exceeds 10%'
    );
    
    this.sendDeviationEmail(
      invoice,
      vendor,
      deviationType,
      `Critical deviation detected: ${deviationPercent.toFixed(2)}% variance`,
      deviationPercent,
      'INTERNAL_AUDIT',
      'Audit review required - compliance failure'
    );
  }

  sendEscalationEmail(
    invoice: Invoice,
    vendor: Vendor,
    currentApprover: string,
    nextApprover: string,
    unresolvedHours: number
  ): void {
    console.log(`⚡ ESCALATING from ${currentApprover} to ${nextApprover} (${unresolvedHours}h unresolved)`);
    
    this.sendDeviationEmail(
      invoice,
      vendor,
      'Escalation',
      `Invoice unresolved for ${unresolvedHours} hours`,
      0,
      nextApprover,
      `Escalated from ${currentApprover} - take immediate action`
    );
  }

  getPendingNotifications(): EmailNotification[] {
    return this.notifications.filter(n => !n.sent);
  }

  markAsSent(notificationId: string): void {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.sent = true;
    }
  }

  getNotificationHistory(): EmailNotification[] {
    return [...this.notifications];
  }
}

export const emailService = new EmailService();