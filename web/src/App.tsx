/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import './App.css';
import { RuleEngine } from './lib/engine';
import type { Invoice, PO, GRN, Vendor, ValidationResult } from './lib/engine';
import { AdvancedDashboard } from './lib/AdvancedDashboard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [engine] = useState(() => new RuleEngine());
  const [invoice, setInvoice] = useState<Invoice>({
    invoice_number: 'INV-2024-001',
    invoice_date: new Date().toISOString().split('T')[0],
    vendor_gstin: '27AAACG1234A1Z5',
    po_number: 'PO-8822',
    grand_total: 75000,
    taxable_amount: 63559.32,
    tax_amount: 11440.68,
    cgst: 5720.34,
    sgst: 5720.34,
    igst: 0,
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 63559.32 }],
    place_of_supply: '27',
    is_handwritten: false
  });

  const [po] = useState<PO>({
    number: 'PO-8822',
    vendor_gstin: '27AAACG1234A1Z5',
    total_amount: 75000,
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 63559.32 }],
    is_active: true,
    is_goods_based: true
  });

  const [grn] = useState<GRN>({
    number: 'GRN-991',
    grn_date: new Date().toISOString().split('T')[0],
    po_number: 'PO-8822',
    items: [{ item_name: 'Premium Workstations', quantity: 1, unit_rate: 63559.32 }]
  });

  const [vendor] = useState<Vendor>({
    name: 'TechFlow Systems',
    gstin: '27AAACG1234A1Z5',
    pan: 'AAACG1234A',
    is_on_watchlist: false
  });

  const [result, setResult] = useState<ValidationResult | null>(null);

  const runValidation = () => {
    const res = engine.validate(invoice, po, grn, vendor, '27AAACB5678B1Z2');
    setResult(res);
  };

  useEffect(() => {
    runValidation();
  }, [invoice]);

  const setDemoScenario = (type: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (type === 'future') {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      setInvoice({ ...invoice, invoice_date: futureDate.toISOString().split('T')[0] });
    } else if (type === 'variance') {
      setInvoice({ ...invoice, grand_total: 85000, invoice_date: todayStr });
    } else if (type === 'perfect') {
      setInvoice({ ...invoice, grand_total: 75000, invoice_date: todayStr });
    } else if (type === 'critical') {
      setInvoice({ ...invoice, grand_total: 120000, invoice_date: todayStr });
    }
  };

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="gradient-text app-title">Cashflo AI Policy Agent</h1>
          <p className="app-subtitle">Advanced Rule Extraction & Execution Engine</p>
        </div>
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced Features
          </button>
        </div>
      </header>

      {activeTab === 'basic' ? (
        <div className="dashboard-grid">
          <div className="flex-column">
            <div className="glass-card">
              <h3 className="card-title">Scenario Presets</h3>
              <div className="scenario-presets">
                <button className="btn btn-primary" onClick={() => setDemoScenario('perfect')} aria-label="Demo: Perfect Match">Perfect Match</button>
                <button className="btn btn-primary" onClick={() => setDemoScenario('future')} aria-label="Demo: Future Date Error">Future Date</button>
                <button className="btn btn-primary" onClick={() => setDemoScenario('variance')} aria-label="Demo: Amount Variance">Amount Variance</button>
                <button className="btn btn-danger" onClick={() => setDemoScenario('critical')} aria-label="Demo: Critical Deviation">Critical (&gt;10%)</button>
              </div>
            </div>

            <div className="glass-card">
              <h3 className="card-title">Live Invoice Data</h3>
              <div className="input-group">
                <label htmlFor="grand-total">Grand Total (INR)</label>
                <input
                  id="grand-total"
                  type="number"
                  value={invoice.grand_total}
                  onChange={(e) => setInvoice({ ...invoice, grand_total: Number(e.target.value) })}
                  placeholder="Enter grand total"
                />
              </div>
              <div className="input-group">
                <label htmlFor="invoice-date">Invoice Date</label>
                <input
                  id="invoice-date"
                  type="date"
                  value={invoice.invoice_date}
                  onChange={(e) => setInvoice({ ...invoice, invoice_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex-column">
            {result && (
              <>
                <div
                  className="glass-card"
                  style={{ borderTop: `4px solid ${result.status === 'Success' ? 'var(--accent-primary)' : result.status === 'Flagged' ? 'var(--warning)' : 'var(--danger)'}` }}
                >
                  <div className="result-card-header">
                    <span className={`status-badge status-${result.status.toLowerCase()}`}>
                      {result.status}
                    </span>
                    <h2>
                      {result.status === 'Success' ? 'Auto-Approved' : result.status === 'Flagged' ? 'Manual Review' : 'Rejected'}
                    </h2>
                    <p className="approver-text">
                      {result.approver !== 'auto' ? `Requires approval from: ${result.approver.replace('_', ' ').toUpperCase()}` : 'System cleared for payment.'}
                    </p>
                  </div>
                </div>

                {(result.rejections.length > 0 || result.flags.length > 0) && (
                  <div className="glass-card">
                    <h3 className="violation-title" style={{ color: result.rejections.length > 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {result.rejections.length > 0 ? 'Critical Violations' : 'Detected Deviations'}
                    </h3>
                    <div className="violation-list">
                      {[...result.rejections, ...result.flags].map((item, i) => (
                        <div key={i} className="violation-item">
                          <div
                            className="violation-dot"
                            style={{ backgroundColor: result.rejections.length > 0 ? 'var(--danger)' : 'var(--warning)' }}
                          ></div>
                          <span style={{ fontSize: '0.9rem' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-card">
                  <h3 className="card-title">Triggered Rules & Confidence</h3>
                  <div className="audit-log-container">
                    {result.triggered_rules?.map((rule, i) => (
                      <div key={i} className="rule-trigger">
                        <span className="rule-id">{rule.rule_id}</span>
                        <span className="rule-confidence">{(rule.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="card-title">Audit Log</h3>
                  <div className="audit-log-container">
                    {result.logs.map((log, i) => (
                      <p key={i} className="audit-log-entry">
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <AdvancedDashboard 
          initialInvoice={invoice}
          initialPO={po}
          initialGRN={grn}
          initialVendor={vendor}
        />
      )}

      <footer className="app-footer">
        <p className="footer-text">
          Cashflo AI Policy Agent v2 • Rule Extraction • Multi-Document Support • Visual Graph • Confidence Scoring • Email Notifications
        </p>
      </footer>
    </div>
  );
};

export default App;