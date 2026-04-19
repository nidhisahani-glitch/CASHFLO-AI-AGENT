// ==========================================
// Advanced Rule Execution Engine
// Includes: confidence scoring, multi-document support,
// rule execution with pass/fail, and visual graph data
// ==========================================

import type { Invoice, PO, GRN, Vendor } from './engine';
import { emailService, type EmailNotification } from './emailService';
import apPolicyRaw from './policy.json';
import procurementPolicyRaw from './procurementPolicy.json';

export type PolicyType = 'accounts_payable' | 'procurement';

export interface ExtractedRule {
  rule_id: string;
  source_clause: string;
  condition: string;
  action: string;
  status?: string;
  reason?: string;
  route_to?: string;
  approver?: string;
  confidence: number;
  requires_justification?: boolean;
  passed: boolean;
  evaluation_details?: string;
}

export interface RuleExecutionResult {
  invoice_id: string;
  policy_type: PolicyType;
  overall_status: 'passed' | 'failed' | 'flagged';
  execution_time_ms: number;
  rules_extracted: ExtractedRule[];
  passed_rules: ExtractedRule[];
  failed_rules: ExtractedRule[];
  low_confidence_rules: ExtractedRule[];
  notifications_sent: EmailNotification[];
  decision: {
    approver: string;
    action_required: string;
    deviates: boolean;
    deviation_percentage?: number;
    deviation_type?: string;
  };
}

export interface RuleNode {
  id: string;
  label: string;
  type: 'decision' | 'action' | 'start' | 'end';
  rule_id?: string;
  status?: 'passed' | 'failed' | 'pending';
  children?: string[];
}

export interface RuleGraph {
  nodes: RuleNode[];
  edges: { from: string; to: string }[];
}

class AdvancedRuleEngine {
  private _policies: Record<PolicyType, any> = {
    'accounts_payable': apPolicyRaw,
    'procurement': procurementPolicyRaw
  };
  
  private currentPolicy: PolicyType = 'accounts_payable';

  getPolicies(): Record<PolicyType, any> {
    return this._policies;
  }

  setPolicy(policyType: PolicyType): void {
    this.currentPolicy = policyType;
    console.log(`📋 Policy switched to: ${policyType}`);
  }

  getAvailablePolicies(): PolicyType[] {
    return Object.keys(this._policies) as PolicyType[];
  }

  extractRulesFromPolicy(policyType: PolicyType = this.currentPolicy): ExtractedRule[] {
    const policy = this._policies[policyType];
    void policy;
    const rules: ExtractedRule[] = [];

    if (policyType === 'accounts_payable') {
      rules.push(
        this.createRule('AP-VAL-001', 'Section 1.1', 'mandatory_field_missing', 'FLAG', 0.95),
        this.createRule('AP-VAL-002', 'Section 1.2', 'invoice_date > current_date', 'REJECT', 0.99, 'Future-Dated Invoice'),
        this.createRule('AP-VAL-003', 'Section 1.3', 'is_handwritten && amount > 50000', 'REQUIRE_APPROVAL', 0.88),
        this.createRule('AP-PO-001', 'Section 2.1', 'po_exists == false', 'REJECT', 0.98, 'Invalid PO Reference'),
        this.createRule('AP-PO-002', 'Section 2.2(a)', 'abs(invoice_total - po_total) <= po_total * 0.01', 'AUTO_APPROVE', 0.97),
        this.createRule('AP-PO-003', 'Section 2.2(b)', 'invoice_total > po_total * 1.01 && invoice_total < po_total * 1.10', 'ROUTE', 0.94, 'Variance 1-10%', 'DEPARTMENT_HEAD'),
        this.createRule('AP-PO-004', 'Section 2.2(c)', 'invoice_total >= po_total * 1.10', 'ESCALATE', 0.96, 'Variance >10%', 'FINANCE_CONTROLLER'),
        this.createRule('AP-GRN-001', 'Section 3.1', 'grn_exists == false', 'HOLD', 0.92, 'Awaiting GRN'),
        this.createRule('AP-TAX-001', 'Section 4.1', 'vendor_gstin != master_gstin', 'REJECT', 0.99, 'GSTIN Mismatch'),
        this.createRule('AP-TAX-003', 'Section 4.3(a)', 'tax_calculation_error', 'FLAG', 0.91, 'Tax Calculation Error'),
        this.createRule('AP-APP-001', 'Section 5.1', 'invoice_total <= 100000', 'AUTO_APPROVE', 0.95),
        this.createRule('AP-APP-002', 'Section 5.2', 'invoice_total > 100000 && invoice_total <= 1000000', 'REQUIRE_APPROVAL', 0.93, undefined, 'DEPARTMENT_HEAD'),
        this.createRule('AP-APP-003', 'Section 5.3', 'invoice_total > 1000000 && invoice_total <= 5000000', 'REQUIRE_APPROVE', 0.91, undefined, 'FINANCE_CONTROLLER'),
        this.createRule('AP-APP-004', 'Section 5.4', 'invoice_total > 5000000', 'REQUIRE_APPROVAL', 0.89, undefined, 'CFO'),
        this.createRule('AP-NOT-001', 'Section 6.1', 'deviation_detected == true', 'SEND_EMAIL', 0.87),
        this.createRule('AP-NOT-002', 'Section 6.3', 'unresolved_duration > 48', 'ESCALATE', 0.85),
        this.createRule('AP-NOT-003', 'Section 6.4', 'deviation_percent > 10 || compliance_failure', 'SEND_IMMEDIATE_ALERT', 0.92),
        this.createRule('AP-DIG-001', 'Section 7.1', 'amount > 1000000 && qr_missing', 'HOLD', 0.88, 'QR Missing')
      );
    } else if (policyType === 'procurement') {
      rules.push(
        this.createRule('PR-001', 'Section 1.1', 'pr_missing', 'REJECT', 0.94),
        this.createRule('PR-002', 'Section 1.2', 'amount > threshold && approval_missing', 'REQUIRE_APPROVAL', 0.91),
        this.createRule('VS-001', 'Section 2.1', 'quotes < 3 && amount > 100000', 'REQUIRE_MORE_QUOTES', 0.89),
        this.createRule('VS-002', 'Section 2.2', 'vendor_blacklisted', 'REJECT', 0.99),
        this.createRule('PO-001', 'Section 3.1', 'po_amount > 500000 && approval_missing', 'REQUIRE_APPROVAL', 0.92),
        this.createRule('CM-001', 'Section 4.1', 'contract_missing && amount > 200000', 'REQUIRE_CONTRACT', 0.90),
        this.createRule('RA-001', 'Section 5.1', 'inspection_failed', 'REJECT', 0.96),
        this.createRule('PP-001', 'Section 6.1', 'payment_schedule == biweekly', 'PROCESS_PAYMENT', 0.95)
      );
    }

    return rules;
  }

  private createRule(
    rule_id: string,
    source_clause: string,
    condition: string,
    action: string,
    confidence: number,
    reason?: string,
    route_to?: string
  ): ExtractedRule {
    return {
      rule_id,
      source_clause,
      condition,
      action,
      reason,
      route_to,
      confidence,
      passed: false
    };
  }

  evaluateRule(rule: ExtractedRule, context: Record<string, any>): ExtractedRule {
    const evalResult = { ...rule, passed: false };
    
    try {
      const condition = rule.condition
        .replace(/invoice_date/g, 'context.invoice_date')
        .replace(/current_date/g, 'new Date().toISOString().split("T")[0]')
        .replace(/invoice_total/g, 'context.invoice?.grand_total')
        .replace(/po_total/g, 'context.po?.total_amount')
        .replace(/amount/g, 'context.invoice?.grand_total')
        .replace(/is_handwritten/g, 'context.invoice?.is_handwritten')
        .replace(/invoice/g, 'context.invoice')
        .replace(/po/g, 'context.po')
        .replace(/vendor/g, 'context.vendor')
        .replace(/grn/g, 'context.grn')
        .replace(/po_exists/g, '!!context.po')
        .replace(/grn_exists/g, '!!context.grn')
        .replace(/mandatory_field_missing/g, 'false')
        .replace(/deviation_detected/g, 'context.deviation_detected')
        .replace(/unresolved_duration/g, 'context.unresolved_hours')
        .replace(/qr_missing/g, '!context.invoice?.qr_code_data');
      
      const safeEval = new Function('context', `return (${condition})`);
      const result = safeEval(context);
      evalResult.passed = result;
      evalResult.evaluation_details = `${rule.condition} → ${result ? 'TRUE' : 'FALSE'}`;
    } catch (e) {
      evalResult.evaluation_details = `Error evaluating: ${e}`;
      evalResult.passed = false;
    }

    return evalResult;
  }

  execute(
    invoice: Invoice,
    po: PO | null,
    grn: GRN | null,
    vendor: Vendor,
    buyerGstin: string = '27AAACG1234A1Z5',
    policyType: PolicyType = this.currentPolicy
  ): RuleExecutionResult {
    const startTime = performance.now();
    
    this.setPolicy(policyType);
    const rules = this.extractRulesFromPolicy(policyType);

    const context = {
      invoice,
      po,
      grn,
      vendor,
      buyer_gstin: buyerGstin,
      deviation_detected: false,
      unresolved_hours: 0,
      compliance_failure: false
    };

    const passedRules: ExtractedRule[] = [];
    const failedRules: ExtractedRule[] = [];
    const lowConfidenceRules: ExtractedRule[] = [];
    const notifications: EmailNotification[] = [];

    for (const rule of rules) {
      const evaluatedRule = this.evaluateRule(rule, context);
      
      if (evaluatedRule.passed) {
        passedRules.push(evaluatedRule);
        
        if (evaluatedRule.action === 'SEND_EMAIL' || evaluatedRule.action === 'SEND_IMMEDIATE_ALERT') {
          context.deviation_detected = true;
          
          if (invoice.grand_total > (po?.total_amount || 0) * 1.10) {
            const notif = emailService.sendDeviationEmail(
              invoice,
              vendor,
              evaluatedRule.reason || 'Amount Variance',
              `Invoice ${invoice.grand_total} vs PO ${po?.total_amount}`,
              ((invoice.grand_total - (po?.total_amount || 0)) / (po?.total_amount || 1)) * 100,
              evaluatedRule.route_to || 'FINANCE_CONTROLLER',
              evaluatedRule.reason || 'Review required'
            );
            notifications.push(notif);
          }
          
          if (evaluatedRule.action === 'SEND_IMMEDIATE_ALERT') {
            emailService.sendCriticalAlert(invoice, vendor, 'Critical Deviation', 10);
          }
        }
        
        if (evaluatedRule.action === 'ESCALATE' || evaluatedRule.action === 'SEND_IMMEDIATE_ALERT') {
          if (invoice.grand_total > (po?.total_amount || 0) * 1.10) {
            emailService.sendCriticalAlert(
              invoice,
              vendor,
              'Amount Variance > 10%',
              ((invoice.grand_total - (po?.total_amount || 0)) / (po?.total_amount || 1)) * 100
            );
          }
        }
      } else {
        failedRules.push(evaluatedRule);
      }

      if (evaluatedRule.confidence < 0.85) {
        lowConfidenceRules.push(evaluatedRule);
      }
    }

    const deviationPercent = po 
      ? ((invoice.grand_total - po.total_amount) / po.total_amount) * 100 
      : 0;
    const deviates = deviationPercent > 10 || failedRules.length > 0;

    let approver = 'AUTO';
    let actionRequired = 'None';
    
    if (invoice.grand_total > 5000000) {
      approver = 'CFO';
      actionRequired = 'CFO Approval Required';
    } else if (invoice.grand_total > 1000000) {
      approver = 'FINANCE_CONTROLLER';
      actionRequired = 'Finance Controller Approval Required';
    } else if (invoice.grand_total > 100000) {
      approver = 'DEPARTMENT_HEAD';
      actionRequired = 'Department Head Approval Required';
    } else if (failedRules.length > 0) {
      approver = 'MANUAL_REVIEW';
      actionRequired = 'Manual Review Required';
    }

    let overallStatus: 'passed' | 'failed' | 'flagged' = 'passed';
    if (failedRules.length > 0) {
      overallStatus = 'failed';
    } else if (passedRules.length > 0 && deviates) {
      overallStatus = 'flagged';
    }

    const executionTime = performance.now() - startTime;

    return {
      invoice_id: invoice.invoice_number,
      policy_type: policyType,
      overall_status: overallStatus,
      execution_time_ms: Math.round(executionTime * 100) / 100,
      rules_extracted: rules,
      passed_rules: passedRules,
      failed_rules: failedRules,
      low_confidence_rules: lowConfidenceRules,
      notifications_sent: notifications,
      decision: {
        approver,
        action_required: actionRequired,
        deviates,
        deviation_percentage: deviationPercent,
        deviation_type: deviationPercent > 10 ? 'Amount Variance > 10%' : deviationPercent > 1 ? 'Amount Variance 1-10%' : undefined
      }
    };
  }

  generateRuleGraph(policyType: PolicyType = this.currentPolicy): RuleGraph {
    const rules = this.extractRulesFromPolicy(policyType);
    const nodes: RuleNode[] = [];
    const edges: { from: string; to: string }[] = [];

    nodes.push({
      id: 'start',
      label: 'Invoice Received',
      type: 'start'
    });

    nodes.push({
      id: 'end-approved',
      label: 'Auto-Approved',
      type: 'end'
    });

    nodes.push({
      id: 'end-flagged',
      label: 'Flagged for Review',
      type: 'end'
    });

    nodes.push({
      id: 'end-rejected',
      label: 'Rejected',
      type: 'end'
    });

    const sectionGroups: Record<string, string> = {
      'Section 1': 'validation',
      'Section 2': 'po-matching',
      'Section 3': 'grn-matching',
      'Section 4': 'tax-compliance',
      'Section 5': 'approval',
      'Section 6': 'notifications',
      'Section 7': 'digital'
    };

    for (const [section, group] of Object.entries(sectionGroups)) {
      nodes.push({
        id: group,
        label: section,
        type: 'action'
      });
    }

    edges.push({ from: 'start', to: 'validation' });
    edges.push({ from: 'validation', to: 'po-matching' });
    edges.push({ from: 'po-matching', to: 'grn-matching' });
    edges.push({ from: 'grn-matching', to: 'tax-compliance' });
    edges.push({ from: 'tax-compliance', to: 'approval' });
    edges.push({ from: 'approval', to: 'notifications' });
    edges.push({ from: 'notifications', to: 'end-approved' });

    for (const rule of rules.slice(0, 15)) {
      const nodeId = `rule-${rule.rule_id}`;
      
      nodes.push({
        id: nodeId,
        label: `${rule.rule_id}: ${rule.action}`,
        type: 'decision',
        rule_id: rule.rule_id
      });

      if (rule.source_clause.includes('Section 1')) {
        edges.push({ from: 'validation', to: nodeId });
      } else if (rule.source_clause.includes('Section 2')) {
        edges.push({ from: 'po-matching', to: nodeId });
      } else if (rule.source_clause.includes('Section 3')) {
        edges.push({ from: 'grn-matching', to: nodeId });
      } else if (rule.source_clause.includes('Section 4')) {
        edges.push({ from: 'tax-compliance', to: nodeId });
      } else if (rule.source_clause.includes('Section 5')) {
        edges.push({ from: 'approval', to: nodeId });
      } else if (rule.source_clause.includes('Section 6')) {
        edges.push({ from: 'notifications', to: nodeId });
      }

      if (rule.action === 'REJECT') {
        edges.push({ from: nodeId, to: 'end-rejected' });
      } else if (rule.action === 'FLAG' || rule.action === 'ESCALATE') {
        edges.push({ from: nodeId, to: 'end-flagged' });
      }
    }

    return { nodes, edges };
  }

  getConfidenceStats(policyType: PolicyType = this.currentPolicy): {
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
    average_confidence: number;
  } {
    const rules = this.extractRulesFromPolicy(policyType);
    
    let high = 0, medium = 0, low = 0;
    let total = 0;

    for (const rule of rules) {
      total += rule.confidence;
      if (rule.confidence >= 0.90) high++;
      else if (rule.confidence >= 0.80) medium++;
      else low++;
    }

    return {
      high_confidence: high,
      medium_confidence: medium,
      low_confidence: low,
      average_confidence: total / rules.length
    };
  }
}

export const advancedEngine = new AdvancedRuleEngine();