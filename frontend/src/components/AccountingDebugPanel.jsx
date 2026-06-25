import React from 'react';

export default function AccountingDebugPanel({ debugData, balances }) {
  if (!debugData) return null;

  const {
    totalExpenses = 0,
    ledgerValidation = {},
    txnValidation = {},
    rawExpenses = [],
    expensesProcessed = 0,
    duplicatesSkipped = 0
  } = debugData;

  const sumPositive = ledgerValidation.sumPositive || 0;
  const sumNegative = ledgerValidation.sumNegative || 0;
  const ledgerDiff = Math.abs(sumPositive + sumNegative);
  
  const hasTxnErrors = txnValidation.errors && txnValidation.errors.length > 0;
  const hasLedgerErrors = ledgerValidation.errors && ledgerValidation.errors.length > 0;

  return (
    <div style={{ background: "rgba(255, 60, 100, 0.05)", border: "1px solid var(--pink)", borderRadius: 16, padding: 24, marginBottom: 24, color: "var(--tx)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 24 }}>🚨</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--pink)" }}>Validation Failed</h2>
          <div style={{ fontSize: 13, color: "var(--tx2)", marginTop: 4 }}>The settlement engine blocked transactions to protect financial integrity.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 30 }}>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Total Expenses</div>
          <div style={{ fontSize: 20, fontFamily: "var(--fd)", fontWeight: 800, color: "var(--cyan)" }}>₹{totalExpenses.toFixed(2)}</div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Total Credits (+ve)</div>
          <div style={{ fontSize: 20, fontFamily: "var(--fd)", fontWeight: 800, color: "var(--lime)" }}>₹{sumPositive.toFixed(2)}</div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Total Debits (-ve)</div>
          <div style={{ fontSize: 20, fontFamily: "var(--fd)", fontWeight: 800, color: "var(--pink)" }}>₹{sumNegative.toFixed(2)}</div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Ledger Difference</div>
          <div style={{ fontSize: 20, fontFamily: "var(--fd)", fontWeight: 800, color: ledgerDiff > 0.02 ? "var(--pink)" : "var(--lime)" }}>₹{ledgerDiff.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12, color: "var(--tx)" }}>Validation Checks</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <div style={{ display: "flex", gap: 10 }}><span style={{ color: "var(--lime)" }}>✓</span> <span>Expenses Processed: {expensesProcessed}</span></div>
          {duplicatesSkipped > 0 && <div style={{ display: "flex", gap: 10 }}><span style={{ color: "var(--amber)" }}>⚠️</span> <span>Duplicates Skipped: {duplicatesSkipped}</span></div>}
          
          <div style={{ display: "flex", gap: 10 }}>
            {hasLedgerErrors ? <span style={{ color: "var(--pink)" }}>✗</span> : <span style={{ color: "var(--lime)" }}>✓</span>}
            <span>Ledger Reconciliation</span>
          </div>
          {hasLedgerErrors && (
            <div style={{ marginLeft: 24, padding: "8px 12px", background: "rgba(255,0,0,0.1)", borderRadius: 8, fontSize: 13, color: "var(--pink)", fontFamily: "monospace" }}>
              {ledgerValidation.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {hasTxnErrors ? <span style={{ color: "var(--pink)" }}>✗</span> : <span style={{ color: "var(--lime)" }}>✓</span>}
            <span>Transaction Overflow Limits</span>
          </div>
          {hasTxnErrors && (
            <div style={{ marginLeft: 24, padding: "8px 12px", background: "rgba(255,0,0,0.1)", borderRadius: 8, fontSize: 13, color: "var(--pink)", fontFamily: "monospace" }}>
              {txnValidation.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      </div>

      {balances && balances.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: "var(--tx)" }}>Member Balance Table</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--tx3)" }}>
                  <th style={{ padding: "10px 8px" }}>Member</th>
                  <th style={{ padding: "10px 8px" }}>Total Paid</th>
                  <th style={{ padding: "10px 8px" }}>Total Owed</th>
                  <th style={{ padding: "10px 8px" }}>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {balances.map(b => (
                  <tr key={b.id || b.full_name} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 600 }}>{b.full_name}</td>
                    <td style={{ padding: "10px 8px" }}>₹{b.total_paid?.toFixed(2)}</td>
                    <td style={{ padding: "10px 8px" }}>₹{b.total_owed?.toFixed(2)}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 700, color: b.net_balance > 0 ? "var(--lime)" : b.net_balance < 0 ? "var(--pink)" : "var(--tx3)" }}>
                      {b.net_balance > 0 ? '+' : ''}₹{b.net_balance?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rawExpenses && rawExpenses.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: "var(--tx)" }}>Expense Audit Table</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--tx3)" }}>
                  <th style={{ padding: "10px 8px" }}>Title</th>
                  <th style={{ padding: "10px 8px" }}>Amount</th>
                  <th style={{ padding: "10px 8px" }}>Paid By</th>
                  <th style={{ padding: "10px 8px" }}>Split Type</th>
                  <th style={{ padding: "10px 8px" }}>Participants</th>
                </tr>
              </thead>
              <tbody>
                {rawExpenses.map(e => (
                  <tr key={e._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 8px" }}>{e.title}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "var(--cyan)" }}>₹{e.amount}</td>
                    <td style={{ padding: "10px 8px" }}>{e.paid_by_name || 'Unknown'}</td>
                    <td style={{ padding: "10px 8px" }}>{e.split_type}</td>
                    <td style={{ padding: "10px 8px" }}>{e.splits?.length || 0} pax</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
