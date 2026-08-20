import React from 'react';
import { useAuthStore } from '../store';
import { formatMoney, normalizeCurrency, defaultCurrency } from '../lib/prefs';

const useCurrencyFormatter = () => {
  const user = useAuthStore(s => s.user);
  const currentCurrency = normalizeCurrency(user?.settings?.currency || defaultCurrency);
  return (value) => formatMoney(value, currentCurrency);
};

export default function MyBalancesModal({ onClose, balances, filterMember }) {
  const formatCurrency = useCurrencyFormatter();
  let { toReceiveList, toPayList } = balances;

  if (filterMember) {
    toReceiveList = toReceiveList.filter(s => s.from_name === filterMember);
    toPayList = toPayList.filter(s => s.to_name === filterMember);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: "90%" }}>
        <div className="modal-header">
          <div className="modal-title">Your Pending Balances</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>

        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          {toReceiveList.length === 0 && toPayList.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>You&apos;re all settled up!</div>
              <div style={{ fontSize: 14, color: "var(--tx2)" }}>No one owes you money, and you don&apos;t owe anyone.</div>
            </div>
          )}

          {toReceiveList.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--lime)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span>💚 You Will Receive</span>
                <div style={{ flex: 1, height: 1, background: "rgba(181,255,77,0.2)" }}></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {toReceiveList.map((s, i) => (
                  <div key={i} style={{ padding: 16, background: "var(--bg-glass)", border: "1px solid rgba(181,255,77,0.15)", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="avatar sm" style={{ background: "rgba(181,255,77,0.1)", color: "var(--lime)", border: "1px solid rgba(181,255,77,0.2)" }}>{s.from_name?.[0] || 'U'}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)" }}>{s.from_name}</div>
                          <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>owes you</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--lime)", fontFamily: "var(--fd)" }}>{formatCurrency(s.amount)}</div>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>Reason</span>
                        <span style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>{s.expense_title || 'Expense'}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>Date</span>
                        <span style={{ fontSize: 12, color: "var(--tx2)" }}>{new Date(s.expense_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {toPayList.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--rose)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span>❤️ You Need To Pay</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,51,102,0.2)" }}></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {toPayList.map((s, i) => (
                  <div key={i} style={{ padding: 16, background: "var(--bg-glass)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="avatar sm" style={{ background: "rgba(255,51,102,0.1)", color: "var(--rose)", border: "1px solid rgba(255,51,102,0.2)" }}>{s.to_name?.[0] || 'U'}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)" }}>{s.to_name}</div>
                          <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>you owe</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--rose)", fontFamily: "var(--fd)" }}>{formatCurrency(s.amount)}</div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--panel-bg-alt)", borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>Group</span>
                        <span style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>{s.group_name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>Reason</span>
                        <span style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>{s.expense_title || 'Expense'}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>Date</span>
                        <span style={{ fontSize: 12, color: "var(--tx2)" }}>{new Date(s.expense_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
