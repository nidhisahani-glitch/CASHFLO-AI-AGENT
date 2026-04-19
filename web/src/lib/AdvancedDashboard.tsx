import React, { useState, useMemo } from 'react';
import { advancedEngine, type PolicyType, type RuleExecutionResult, type ExtractedRule } from './advancedEngine';
import type { Invoice, PO, GRN, Vendor } from './engine';
import { sendDeviationEmail, sendCriticalAlert, checkApiHealth } from './emailApi';

interface AdvancedDashboardProps {
  initialInvoice?: Invoice;
  initialPO?: PO;
  initialGRN?: GRN | null;
  initialVendor?: Vendor;
}

export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({
  initialInvoice,
  initialPO,
  initialGRN,
  initialVendor
}) => {
  const [policyType, setPolicyType] = useState<PolicyType>('accounts_payable');
  const [showGraph, setShowGraph] = useState(false);
  const [executionResult, setExecutionResult] = useState<RuleExecutionResult | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');

  const invoice: Invoice = initialInvoice || {
    invoice_number: 'INV-2024-001',
    invoice_date: new Date().toISOString().split('T')[0],
    vendor_gstin: '27AAACG1234A1Z5',
    po_number: 'PO-8822',
    grand_total: 120000,
    taxable_amount: 101694,
    tax_amount: 18306,
    cgst: 9153,
    sgst: 9153,
    igst: 0,
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 101694 }],
    place_of_supply: '27',
    is_handwritten: false
  };

  const po: PO = initialPO || {
    number: 'PO-8822',
    vendor_gstin: '27AAACG1234A1Z5',
    total_amount: 100000,
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 85000 }],
    is_active: true,
    is_goods_based: true
  };

  const grn: GRN = initialGRN || {
    number: 'GRN-991',
    grn_date: new Date().toISOString().split('T')[0],
    po_number: 'PO-8822',
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 85000 }]
  };

  const vendor: Vendor = initialVendor || {
    name: 'TechFlow Systems',
    gstin: '27AAACG1234A1Z5',
    pan: 'AAACG1234A',
    is_on_watchlist: false
  };

  const handleExecute = async () => {
    const result = advancedEngine.execute(invoice, po, grn, vendor, '27AAACG1234A1Z5', policyType);
    setExecutionResult(result);

    const variance = po ? ((invoice.grand_total - po.total_amount) / po.total_amount) * 100 : 0;
    
    if (variance > 10 && result.overall_status !== 'passed') {
      const alert = {
        to_email: "nidhisahani3190@gmail.com",
        invoice_number: invoice.invoice_number,
        vendor_name: vendor.name,
        deviation_percent: variance
      };
      const sent = await sendCriticalAlert(alert);
      setEmailStatus(sent ? "Critical alert sent!" : "Failed to send");
    } else if (variance > 1 && result.overall_status === 'flagged') {
      const alert = {
        to_email: "nidhisahani3190@gmail.com",
        invoice_number: invoice.invoice_number,
        vendor_name: vendor.name,
        deviation_type: "Amount Variance",
        deviation_details: `Invoice ${invoice.grand_total} vs PO ${po?.total_amount}`,
        deviation_percent: variance,
        recommended_action: "Review and approve"
      };
      const sent = await sendDeviationEmail(alert);
      setEmailStatus(sent ? "Deviation email sent!" : "Failed to send");
    }
  };

  React.useEffect(() => {
    checkApiHealth().then(ok => setApiStatus(ok ? 'API Connected' : 'API Disconnected')).catch(() => setApiStatus('API Error'));
  }, []);

  const confidenceStats = useMemo(() => advancedEngine.getConfidenceStats(policyType), [policyType]);
  const extractedRules = useMemo(() => advancedEngine.extractRulesFromPolicy(policyType), [policyType]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'flagged': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  return (
    <div className="advanced-dashboard">
      <div className="dashboard-header">
        <h2 className="gradient-text">Advanced Rule Engine Dashboard</h2>
        <p>Multi-Document Support • Confidence Scoring • Visual Graph • Email Notifications</p>
      </div>

      <div className="control-panel">
        <div className="policy-selector">
          <label>Select Policy:</label>
          <select 
            value={policyType} 
            onChange={(e) => setPolicyType(e.target.value as PolicyType)}
            className="policy-select"
          >
            <option value="accounts_payable">Accounts Payable Policy</option>
            <option value="procurement">Procurement Policy</option>
          </select>
        </div>
        
        <button className="btn btn-primary" onClick={handleExecute}>
          Execute Rules
        </button>
        
        <button className="btn btn-secondary" onClick={() => setShowGraph(!showGraph)}>
          {showGraph ? 'Hide Graph' : 'Show Graph'}
        </button>
        
        <div className="api-status">
          <span style={{ fontSize: '12px', color: apiStatus === 'API Connected' ? '#22c55e' : '#ef4444' }}>
            {apiStatus}
          </span>
          {emailStatus && (
            <span style={{ fontSize: '12px', color: emailStatus.includes('sent') ? '#22c55e' : '#ef4444', marginLeft: '10px' }}>
              {emailStatus}
            </span>
          )}
        </div>
      </div>

      {showGraph && (
        <div className="graph-section">
          <h3>Visual Rule Flow</h3>
          <SimpleRuleFlow 
            policyType={policyType}
            rules={executionResult?.rules_extracted || extractedRules}
          />
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Extracted Rules</h4>
          <div className="stat-value">{extractedRules.length}</div>
        </div>
        
        <div className="stat-card">
          <h4>High Confidence (≥90%)</h4>
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {confidenceStats.high_confidence}
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Medium Confidence (80-89%)</h4>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {confidenceStats.medium_confidence}
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Low Confidence (&lt;80%)</h4>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {confidenceStats.low_confidence}
          </div>
        </div>
        
        <div className="stat-card">
          <h4>Average Confidence</h4>
          <div className="stat-value">{(confidenceStats.average_confidence * 100).toFixed(1)}%</div>
        </div>
      </div>

      {executionResult && (
        <div className="execution-results">
          <h3>Rule Execution Results</h3>
          
          <div className="result-summary">
            <div className="summary-item">
              <span>Status:</span>
              <span 
                className="status-badge"
                style={{ background: getStatusColor(executionResult.overall_status) }}
              >
                {executionResult.overall_status.toUpperCase()}
              </span>
            </div>
            
            <div className="summary-item">
              <span>Policy:</span>
              <span>{executionResult.policy_type}</span>
            </div>
            
            <div className="summary-item">
              <span>Execution Time:</span>
              <span>{executionResult.execution_time_ms}ms</span>
            </div>
            
            <div className="summary-item">
              <span>Approver:</span>
              <span>{executionResult.decision.approver}</span>
            </div>
            
            {executionResult.decision.deviation_percentage !== undefined && (
              <div className="summary-item">
                <span>Deviation:</span>
                <span style={{ 
                  color: executionResult.decision.deviation_percentage! > 10 ? '#ef4444' : '#f59e0b'
                }}>
                  {executionResult.decision.deviation_percentage!.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {executionResult.notifications_sent.length > 0 && (
            <div className="notifications-section">
              <h4>📧 Email Notifications Sent</h4>
              {executionResult.notifications_sent.map((notif, idx) => (
                <div key={idx} className="notification-item">
                  <div><strong>To:</strong> {notif.to}</div>
                  <div><strong>Subject:</strong> {notif.subject}</div>
                  <div><strong>Deviation:</strong> {notif.deviation_type}</div>
                </div>
              ))}
            </div>
          )}

          {executionResult.low_confidence_rules.length > 0 && (
            <div className="low-confidence-section">
              <h4>⚠️ Low Confidence Rules (Requires Review)</h4>
              {executionResult.low_confidence_rules.map((rule, idx) => (
                <div key={idx} className="rule-item low-confidence">
                  <span className="rule-id">{rule.rule_id}</span>
                  <span className="rule-confidence">{(rule.confidence * 100).toFixed(0)}%</span>
                  <span className="rule-condition">{rule.condition}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rules-breakdown">
            <div className="rules-column">
              <h4>✅ Passed Rules ({executionResult.passed_rules.length})</h4>
              {executionResult.passed_rules.map((rule, idx) => (
                <div key={idx} className="rule-item passed">
                  <span className="rule-id">{rule.rule_id}</span>
                  <span className="rule-action">{rule.action}</span>
                  <span className="rule-confidence">{(rule.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            
            <div className="rules-column">
              <h4>❌ Failed Rules ({executionResult.failed_rules.length})</h4>
              {executionResult.failed_rules.map((rule, idx) => (
                <div key={idx} className="rule-item failed">
                  <span className="rule-id">{rule.rule_id}</span>
                  <span className="rule-action">{rule.action}</span>
                  <span className="rule-confidence">{(rule.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="all-rules-section">
        <h3>All Extracted Rules ({extractedRules.length})</h3>
        <div className="rules-table">
          <div className="rules-table-header">
            <span>Rule ID</span>
            <span>Clause</span>
            <span>Condition</span>
            <span>Action</span>
            <span>Confidence</span>
          </div>
          {extractedRules.map((rule, idx) => (
            <div key={idx} className="rules-table-row">
              <span className="rule-id">{rule.rule_id}</span>
              <span className="rule-clause">{rule.source_clause}</span>
              <span className="rule-condition">{rule.condition}</span>
              <span className="rule-action">{rule.action}</span>
              <span 
                className="rule-confidence"
                style={{ 
                  color: rule.confidence >= 0.9 ? '#22c55e' : rule.confidence >= 0.8 ? '#f59e0b' : '#ef4444'
                }}
              >
                {(rule.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .advanced-dashboard {
          padding: 20px;
          color: #fff;
        }
        
        .dashboard-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .dashboard-header h2 {
          font-size: 1.8rem;
          margin-bottom: 5px;
        }
        
        .control-panel {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .policy-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .policy-select {
          padding: 8px 15px;
          border-radius: 6px;
          background: #1e293b;
          color: #fff;
          border: 1px solid #475569;
        }
        
        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        
        .btn-secondary {
          background: #334155;
          color: #fff;
        }
        
        .api-status {
          display: flex;
          align-items: center;
          margin-left: auto;
          padding: 8px 15px;
          background: #1e293b;
          border-radius: 6px;
        }
        
        .graph-section {
          margin-bottom: 20px;
        }
        
        .graph-section h3 {
          margin-bottom: 10px;
          color: #a5b4fc;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: #1e293b;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        
        .stat-card h4 {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 5px;
        }
        
        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
        }
        
        .execution-results {
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .execution-results h3 {
          color: #a5b4fc;
          margin-bottom: 15px;
        }
        
        .result-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .summary-item span:first-child {
          color: #94a3b8;
          font-size: 0.85rem;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .notifications-section,
        .low-confidence-section {
          margin-bottom: 15px;
          padding: 15px;
          border-radius: 8px;
        }
        
        .notifications-section {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid #f59e0b;
        }
        
        .low-confidence-section {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
        }
        
        .notification-item {
          padding: 10px;
          background: #1e293b;
          border-radius: 6px;
          margin-top: 10px;
          font-size: 0.9rem;
        }
        
        .rules-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }
        
        .rules-column h4 {
          margin-bottom: 10px;
        }
        
        .rules-column:first-child h4 {
          color: #22c55e;
        }
        
        .rules-column:last-child h4 {
          color: #ef4444;
        }
        
        .rule-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 5px;
          font-size: 0.85rem;
        }
        
        .rule-item.passed {
          background: rgba(34, 197, 94, 0.1);
        }
        
        .rule-item.failed {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .rule-item.low-confidence {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
        }
        
        .rule-id {
          font-weight: 600;
          font-family: monospace;
        }
        
        .rule-confidence {
          font-family: monospace;
        }
        
        .rule-condition {
          flex: 1;
          opacity: 0.8;
          font-size: 0.8rem;
        }
        
        .rule-action,
        .rule-clause {
          font-size: 0.85rem;
          opacity: 0.8;
        }
        
        .all-rules-section {
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
        }
        
        .all-rules-section h3 {
          color: #a5b4fc;
          margin-bottom: 15px;
        }
        
        .rules-table {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .rules-table-header,
        .rules-table-row {
          display: grid;
          grid-template-columns: 100px 100px 1fr 120px 80px;
          gap: 10px;
          padding: 10px;
          align-items: center;
        }
        
        .rules-table-header {
          background: #334155;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        .rules-table-row {
          background: #0f172a;
          border-radius: 6px;
          font-size: 0.85rem;
        }
        
        .rules-table-row:hover {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

const SimpleRuleFlow: React.FC<{
  policyType: PolicyType;
  rules: ExtractedRule[];
}> = ({ policyType, rules }) => {
  const sections = [
    { name: 'Section 1: Validation', rules: rules.filter(r => r.source_clause.includes('Section 1')) },
    { name: 'Section 2: PO Matching', rules: rules.filter(r => r.source_clause.includes('Section 2')) },
    { name: 'Section 3: GRN Matching', rules: rules.filter(r => r.source_clause.includes('Section 3')) },
    { name: 'Section 4: Tax Compliance', rules: rules.filter(r => r.source_clause.includes('Section 4')) },
    { name: 'Section 5: Approval', rules: rules.filter(r => r.source_clause.includes('Section 5')) },
    { name: 'Section 6: Notifications', rules: rules.filter(r => r.source_clause.includes('Section 6')) },
  ];

  return (
    <div style={{ 
      padding: '20px', 
      background: '#0f172a', 
      borderRadius: '12px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div style={{ fontSize: '14px', color: '#a5b4fc', marginBottom: '15px' }}>
        Policy: <strong>{policyType === 'accounts_payable' ? 'Accounts Payable' : 'Procurement'}</strong>
      </div>
      {sections.filter(s => s.rules.length > 0).map((section, idx) => (
        <div key={idx} style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontWeight: 600, 
            color: '#22c55e', 
            marginBottom: '8px',
            padding: '8px 12px',
            background: '#1e293b',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            {section.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '10px' }}>
            {section.rules.map((rule, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: rule.passed ? '#166534' : rule.action === 'REJECT' ? '#7f1d1d' : '#1e293b',
                borderRadius: '6px',
                border: `2px solid ${rule.passed ? '#22c55e' : rule.action === 'REJECT' ? '#ef4444' : '#f59e0b'}`,
                fontSize: '12px',
                color: '#fff'
              }}>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{rule.rule_id}</div>
                <div style={{ opacity: 0.8, marginTop: '4px' }}>{rule.action}</div>
                <div style={{ 
                  color: rule.confidence >= 0.9 ? '#22c55e' : rule.confidence >= 0.8 ? '#f59e0b' : '#ef4444',
                  fontSize: '11px',
                  marginTop: '4px'
                }}>
                  {(rule.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdvancedDashboard;