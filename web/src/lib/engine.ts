// ===============================
// TYPES
// ===============================

export interface LineItem {
  item_name: string;
  quantity: number;
  unit_rate: number;
}

export interface Vendor {
  name: string;
  gstin: string;
  pan: string;
  is_on_watchlist: boolean;
}

export interface PO {
  number: string;
  vendor_gstin: string;
  total_amount: number;
  items: LineItem[];
  is_active: boolean;
  is_goods_based: boolean;
}

export interface GRN {
  number: string;
  grn_date: string;
  po_number: string;
  items: LineItem[];
}

export interface Invoice {
  invoice_number: string;
  invoice_date: string;
  vendor_gstin: string;
  po_number: string;
  grand_total: number;
  taxable_amount: number;
  tax_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  items: LineItem[];
  qr_code_data?: Record<string, any>;
  signature_valid?: boolean;
  place_of_supply: string;
  is_handwritten: boolean;
}

export interface ValidationResult {
  status: 'Success' | 'Flagged' | 'Rejected';
  flags: string[];
  rejections: string[];
  approver: 'auto' | 'department_head' | 'finance_controller' | 'cfo';
  logs: string[];

  // 🔥 BONUS
  triggered_rules: {
    rule_id: string;
    confidence: number;
  }[];
}

import policyRaw from './policy.json';
const rules = policyRaw;

// ===============================
// ENGINE
// ===============================

export class RuleEngine {
  validate(
    invoice: Invoice,
    po: PO | null,
    grn: GRN | null,
    vendor: Vendor,
    buyer_gstin: string
  ): ValidationResult {
    const results: ValidationResult = {
      status: 'Success',
      flags: [],
      rejections: [],
      approver: 'auto',
      logs: [],
      triggered_rules: [],
    };

    this.validateSection1(invoice, results);
    if (results.rejections.length > 0) return this.finalize(results);

    this.validateSection2(invoice, po, vendor, results);
    if (results.rejections.length > 0) return this.finalize(results);

    this.validateSection3(invoice, po, grn, results);
    if (results.rejections.length > 0) return this.finalize(results);

    this.validateSection4(invoice, vendor, buyer_gstin, results);
    if (results.rejections.length > 0) return this.finalize(results);

    this.validateSection5(invoice, vendor, results);
    this.validateSection7(invoice, results);

    // Final decision
    if (results.rejections.length > 0) {
      results.status = 'Rejected';
    } else if (results.flags.length > 0) {
      results.status = 'Flagged';
      this.handleSection6(invoice, vendor, results);
    }

    return results;
  }

  private finalize(results: ValidationResult): ValidationResult {
    results.status = 'Rejected';
    return results;
  }

  // ===============================
  // HELPER
  // ===============================

  private addRule(results: ValidationResult, rule_id: string, confidence: number) {
    results.triggered_rules.push({ rule_id, confidence });
  }

  private sendEmail(
    invoice: Invoice,
    vendor: Vendor,
    deviation: number,
    approver: string
  ) {
    console.log("📧 EMAIL NOTIFICATION");
    console.log(`
    ----------------------------------------
    Invoice: ${invoice.invoice_number}
    Vendor: ${vendor.name}
    Deviation: ${deviation.toFixed(2)}%
    Action: Escalate to ${approver}
    ----------------------------------------
    `);
  }

  // ===============================
  // SECTION 1
  // ===============================

  private validateSection1(invoice: Invoice, results: ValidationResult) {
    results.logs.push('Section 1: Basic Validation');

    if (!rules.section_1_basic_validation.future_date_allowed) {
      if (new Date(invoice.invoice_date) > new Date()) {
        results.rejections.push('Future-Dated Invoice Not Permitted.');
        this.addRule(results, "S1-FUTURE-DATE", 0.99);
      }
    }

    if (
      invoice.is_handwritten &&
      invoice.grand_total > rules.section_1_basic_validation.handwritten_approval_threshold
    ) {
      results.flags.push('Handwritten Invoice requires approval.');
      this.addRule(results, "S1-HANDWRITTEN", 0.9);
    }
  }

  // ===============================
  // SECTION 2
  // ===============================

  private validateSection2(invoice: Invoice, po: PO | null, vendor: Vendor, results: ValidationResult) {
    if (!po) {
      results.rejections.push('Invalid PO Reference.');
      this.addRule(results, "S2-NO-PO", 0.98);
      return;
    }

    const variance = ((invoice.grand_total - po.total_amount) / po.total_amount) * 100;

    if (Math.abs(variance) <= rules.section_2_po_matching.amount_tolerance_percent) {
      results.logs.push('Within tolerance');
    } else if (variance > 0) {
      if (variance < rules.section_2_po_matching.amount_escalation.finance_controller_threshold_percent) {
        results.flags.push(`Variance ${variance.toFixed(2)}% → Dept Head`);
        results.approver = 'department_head';
        this.addRule(results, "S2-DEPT", 0.95);
      } else {
        results.flags.push(`Variance ${variance.toFixed(2)}% → Finance Controller`);
        results.approver = 'finance_controller';
        this.addRule(results, "S2-FC", 0.97);

        this.sendEmail(invoice, vendor, variance, "Finance Controller");
      }
    }

    for (const item of invoice.items) {
      const poItem = po.items.find(p => p.item_name === item.item_name);

      if (!poItem) {
        results.flags.push(`Item missing in PO`);
        this.addRule(results, "S2-ITEM-MISSING", 0.9);
        continue;
      }

      if (item.quantity > poItem.quantity) {
        results.flags.push(`Quantity exceeds PO`);
        this.addRule(results, "S2-QTY", 0.96);
      }
    }
  }

  // ===============================
  // SECTION 3
  // ===============================

  private validateSection3(invoice: Invoice, po: PO | null, grn: GRN | null, results: ValidationResult) {
    if (po?.is_goods_based) {
      if (!grn) {
        results.flags.push('Missing GRN');
        return;
      }

      for (const item of invoice.items) {
        const g = grn.items.find(x => x.item_name === item.item_name);

        if (!g || item.quantity > g.quantity) {
          results.rejections.push('GRN mismatch');
          this.addRule(results, "S3-GRN", 0.96);
        }
      }
    }
  }

  // ===============================
  // SECTION 4
  // ===============================

  private validateSection4(invoice: Invoice, vendor: Vendor, _buyer: string, results: ValidationResult) {
    if (invoice.vendor_gstin !== vendor.gstin) {
      results.rejections.push('GSTIN mismatch');
      this.addRule(results, "S4-GST", 0.98);
      return;
    }

    if (Math.abs(invoice.taxable_amount + invoice.tax_amount - invoice.grand_total) > 1) {
      results.flags.push('Tax mismatch');
      this.addRule(results, "S4-TAX", 0.92);
    }
  }

  // ===============================
  // SECTION 5
  // ===============================

  private validateSection5(_invoice: Invoice, vendor: Vendor, results: ValidationResult) {
    if (vendor.is_on_watchlist && results.approver === 'auto') {
      results.approver = 'department_head';
      this.addRule(results, "S5-WATCHLIST", 0.95);
    }
  }

  // ===============================
  // SECTION 6 (EMAIL)
  // ===============================

  private handleSection6(invoice: Invoice, vendor: Vendor, results: ValidationResult) {
    if (results.flags.length > 0) {
      results.logs.push("Section 6: Email triggered");

      this.sendEmail(
        invoice,
        vendor,
        invoice.grand_total,
        results.approver
      );
    }
  }

  // ===============================
  // SECTION 7
  // ===============================

  private validateSection7(invoice: Invoice, results: ValidationResult) {
    if (invoice.grand_total > rules.section_7_digital_validation.qr_code_threshold_inr) {
      if (!invoice.qr_code_data) {
        results.flags.push('QR missing');
        this.addRule(results, "S7-QR", 0.9);
      }
    }
  }
}