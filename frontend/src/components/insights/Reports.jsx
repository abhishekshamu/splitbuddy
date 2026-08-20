import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore, useGroupStore, useExpenseStore, useUIStore } from '../../store';
import api from '../../lib/api';
import { currencyOptions, defaultCurrency, formatMoney, normalizeCurrency, normalizeLanguage, translate, translatePageTitle } from '../../lib/prefs';
import { useCurrency } from '../../lib/CurrencyContext';
import { Home, Zap, Wifi, ShoppingCart, Utensils, Flame, Sparkles, Droplets, Package, Settings as SettingsIcon, ArrowRight, ArrowLeft, ArrowUpRight, ArrowDownRight, Bell, Calendar, CheckCircle2, ChevronRight, ChevronLeft, Menu, Plus, RefreshCw, Search, Trash2, X, Wallet, Users, BarChart3, PieChart, Activity, LogOut, Check, ChevronDown, List, Grid, MoreVertical, Share, FileText, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import DonutChart from './DonutChart';
import BarChart from './BarChart';
import TrendChart from './TrendChart';
import { GroupChipNav, ConfirmSettleModal, useCentralBalance } from '../../SplitBuddy';

export default function Reports({ nav, openModal }) {
  const { allExpenses, fetchAllExpenses, settleHistory, fetchSettlementHistory, expenses, fetchSettlePlan } = useExpenseStore();
  const { groups } = useGroupStore();
  const authUser = useAuthStore(s => s.user);

  const [groupId, setGroupId] = useState('all');
  const [timeRange, setTimeRange] = useState('month');

  const getDateRange = (range) => {
    const now = new Date();
    let from = new Date();
    from.setHours(0, 0, 0, 0);
    switch (range) {
      case '7days': from.setDate(now.getDate() - 7); break;
      case '30days': from.setDate(now.getDate() - 30); break;
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      case 'all': return { from: null, to: null };
      default: from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    }
    return { from, to: now };
  };

  useEffect(() => {
    const { from, to } = getDateRange(timeRange);
    const filters = {};
    if (groupId !== 'all') filters.group_id = groupId;
    if (from) filters.from_date = from.toISOString();
    if (to) filters.to_date = to.toISOString();
    fetchAllExpenses(filters);
    fetchSettlementHistory(groupId === 'all' ? undefined : groupId);
    fetchSettlePlan(groupId);
  }, [groupId, timeRange, fetchAllExpenses, fetchSettlementHistory, expenses.length, fetchSettlePlan]);

  const { netBalance, toReceiveTotal, toPayTotal, toReceiveList, toPayList, rawPlan } = useCentralBalance(groupId);
  const pendingSettlementsCount = toReceiveList.length + toPayList.length;

  const stats = useMemo(() => {
    const { from, to } = getDateRange(timeRange);
    const filteredExpenses = allExpenses.filter(e => {
      if (groupId !== 'all' && (e.group?._id || e.group) !== groupId) return false;
      if (from) { const ed = new Date(e.expense_date); if (ed < from || (to && ed > to)) return false; }
      return true;
    });
    const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const cats = {};
    filteredExpenses.forEach(e => { const l = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : "Other"; cats[l] = (cats[l] || 0) + e.amount; });
    const categoryData = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const topCategory = categoryData.length > 0 ? categoryData[0] : null;
    const members = {};
    filteredExpenses.forEach(e => { const name = e.paid_by_name || e.paid_by?.full_name || "Member"; members[name] = (members[name] || 0) + e.amount; });
    const topSpenders = Object.entries(members).sort((a, b) => b[1] - a[1]);
    const topSpender = topSpenders.length > 0 ? topSpenders[0] : null;
    const largestExpense = filteredExpenses.length > 0 ? [...filteredExpenses].sort((a, b) => b.amount - a.amount)[0] : null;
    const groupTotals = {};
    filteredExpenses.forEach(e => { const gName = groups.find(g => g._id === (e.group?._id || e.group))?.name || "Other"; groupTotals[gName] = (groupTotals[gName] || 0) + e.amount; });
    const activeGroupArr = Object.entries(groupTotals).sort((a, b) => b[1] - a[1]);
    const mostActiveGroup = activeGroupArr.length > 0 ? activeGroupArr[0][0] : "None";

    // ALL settlements (completed + reversed) for bank statement
    const allSettlements = settleHistory.filter(h => {
      const matchGroup = groupId === 'all' || (h.group?._id || h.group) === groupId;
      if (!matchGroup) return false;
      if (!from) return true;
      const hd = new Date(h.settled_at);
      return hd >= from && hd <= to;
    }).sort((a, b) => new Date(b.settled_at) - new Date(a.settled_at));

    const insights = [];
    if (topCategory && total > 0) { const pct = Math.round((topCategory[1] / total) * 100); insights.push(`${topCategory[0]} accounts for ${pct}% of this period's spending.`); }
    if (pendingSettlementsCount === 1) insights.push("You have exactly one pending settlement to resolve.");
    else if (pendingSettlementsCount === 0) insights.push("All your settlements are completely up to date.");
    if (toReceiveTotal > 0) insights.push(`You need to collect a total of \u20B9${toReceiveTotal.toLocaleString()}.`);
    if (mostActiveGroup && mostActiveGroup !== "None") insights.push(`${mostActiveGroup} is your most active group right now.`);
    if (topSpender) insights.push(`${topSpender[0]} contributed the highest amount (\u20B9${topSpender[1].toLocaleString()}).`);

    return { total, topSpender, largestExpense, mostActiveGroup, allSettlements, insights };
  }, [allExpenses, settleHistory, groups, groupId, timeRange, pendingSettlementsCount, toReceiveTotal]);

  const exportReport = (format) => {
    try {
      const data = allExpenses.map(e => ({
        Date: new Date(e.created_at).toLocaleDateString(),
        Description: e.title || e.description || 'Expense',
        Amount: e.amount,
        Category: e.category,
        PaidBy: e.paid_by_name || e.paid_by?.full_name || 'Unknown'
      }));

      const settleData = stats.allSettlements.map(s => ({
        Date: new Date(s.settled_at).toLocaleDateString(),
        Description: `Settlement: ${s.from_name || s.paid_by?.full_name} paid ${s.to_name || s.paid_to?.full_name}`,
        Amount: s.amount,
        Status: s.status === 'reversed' ? 'Reversed' : 'Completed'
      }));

      if (data.length === 0 && settleData.length === 0) {
        toast.error("No data to export");
        return;
      }

      if (format === 'csv') {
        let csv = "";
        if (data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
          csv += `--- Expenses ---\n${headers}\n${rows}\n\n`;
        }
        if (settleData.length > 0) {
          const headers = Object.keys(settleData[0]).join(',');
          const rows = settleData.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
          csv += `--- Settlements ---\n${headers}\n${rows}`;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `splitbuddy_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text("SplitBuddy - Expense Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
        
        let startY = 28;
        if (data.length > 0) {
          doc.text("Expenses", 14, startY);
          doc.autoTable({
            startY: startY + 4,
            head: [Object.keys(data[0])],
            body: data.map(Object.values),
            theme: 'striped'
          });
          startY = doc.lastAutoTable.finalY + 15;
        }
        
        if (settleData.length > 0) {
          doc.text("Settlements", 14, startY);
          doc.autoTable({
            startY: startY + 4,
            head: [Object.keys(settleData[0])],
            body: settleData.map(Object.values),
            theme: 'striped'
          });
        }
        
        doc.save(`splitbuddy_export_${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();
        if (data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, "Expenses");
        }
        if (settleData.length > 0) {
          const wsSettle = XLSX.utils.json_to_sheet(settleData);
          XLSX.utils.book_append_sheet(wb, wsSettle, "Settlements");
        }
        XLSX.writeFile(wb, `splitbuddy_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      toast.success(`Exported as ${format.toUpperCase()}!`);
    } catch (err) {
      console.error("Export Error:", err);
      toast.error(err.message || "Failed to export");
    }
  };

  const handleUndo = async (id, gid) => {
    try { await useExpenseStore.getState().undoSettlement(id, gid); toast.success("Settlement reversed"); }
    catch (err) { toast.error(err.message || "Failed to undo"); }
  };

  const [confirmSettle, setConfirmSettle] = useState(null);
  const { settleLoading } = useExpenseStore();

  const handleSettle = (t) => {
    setConfirmSettle(t);
  };

  const executeSettle = async () => {
    if (!confirmSettle) return;
    try {
      await useExpenseStore.getState().recordSettlement({
        group_id: groupId === 'all' ? undefined : groupId,
        from_id: confirmSettle.from_id,
        from_name: confirmSettle.from_name,
        to_id: confirmSettle.to_id,
        to_name: confirmSettle.to_name,
        amount: confirmSettle.amount
      });
      toast.success('Settlement recorded successfully!');
      setConfirmSettle(null);
    } catch (err) {
      toast.error('Settlement failed: ' + err.message);
    }
  };

  const chipStyle = (active) => ({ padding: '10px 20px', borderRadius: 24, whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, border: 'none', background: active ? 'var(--tx)' : 'var(--bg-card)', color: active ? 'var(--bg)' : 'var(--tx2)', transition: 'all 0.25s ease', cursor: 'pointer', flexShrink: 0 });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px 100px 12px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* FILTER CHIPS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="hide-scroll">
          {[{ id: '7days', lbl: '7 Days' }, { id: '30days', lbl: '30 Days' }, { id: 'month', lbl: 'This Month' }, { id: 'year', lbl: 'This Year' }, { id: 'all', lbl: 'All Time' }].map(t => (
            <button key={t.id} onClick={() => setTimeRange(t.id)} style={chipStyle(timeRange === t.id)}>{t.lbl}</button>
          ))}
        </div>
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <GroupChipNav 
            selectedGroupId={groupId} 
            onSelect={(g) => setGroupId(g._id)} 
            allowAll={true} 
            nav={nav} 
          />
        </div>
      </div>

      {/* SECTION 1: HERO CARD */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: 24, padding: 'clamp(20px, 4vw, 32px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Net Balance</div>
            <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', fontWeight: 800, color: netBalance >= 0 ? 'var(--lime)' : '#ff6060', fontFamily: 'var(--fd)', letterSpacing: '-1px', marginBottom: 20 }}>
              {netBalance >= 0 ? '+' : '-'}{'\u20B9'}{Math.abs(netBalance).toLocaleString()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 600, marginBottom: 4 }}>To Receive</div>
                <div style={{ fontSize: 20, color: 'var(--lime)', fontWeight: 700 }}>{'\u20B9'}{toReceiveTotal.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 600, marginBottom: 4 }}>To Pay</div>
                <div style={{ fontSize: 20, color: '#ff6060', fontWeight: 700 }}>{'\u20B9'}{toPayTotal.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 500 }}>{pendingSettlementsCount} Pending Settlement{pendingSettlementsCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="action-row">
            <button className="action-btn primary" onClick={() => {
              if (pendingSettlementsCount === 0) return toast("No pending settlements");
              nav && nav('settle');
            }}>Settle Now</button>
            <button className="action-btn ghost" onClick={() => openModal && openModal()}>Add Expense</button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SMART INSIGHTS */}
      {stats.insights.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Smart Insights</h3>
          <div className="card" style={{ borderRadius: 20, padding: 20 }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.insights.map((ins, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--tx)', lineHeight: 1.5, fontWeight: 500 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', marginTop: 7, flexShrink: 0 }} />
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 3: PERIOD SUMMARY */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Period Summary</h3>
        <div className="card" style={{ borderRadius: 20, padding: 'clamp(16px, 3vw, 28px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px 20px' }}>
            <div><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 6 }}>Total Spending</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>{'\u20B9'}{stats.total.toLocaleString()}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 6 }}>Pending Amount</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{'\u20B9'}{(toReceiveTotal + toPayTotal).toLocaleString()}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 6 }}>Largest Expense</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{stats.largestExpense ? `\u20B9${stats.largestExpense.amount.toLocaleString()}` : 'N/A'}</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{stats.largestExpense?.description || ''}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 6 }}>Most Active Group</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{stats.mostActiveGroup}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 6 }}>Most Active Friend</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{stats.topSpender ? stats.topSpender[0] : 'N/A'}</div></div>
          </div>
        </div>
      </div>

      {/* SECTION 4: SETTLEMENT CENTER */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Settlement Center</h3>

        {/* Pending To Receive */}
        {toReceiveList.length > 0 && (
          <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending to Receive</div>
            {toReceiveList.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 12, marginBottom: i < toReceiveList.length - 1 ? 12 : 0, borderBottom: i < toReceiveList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div className="avatar sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>{t.from_avatar || t.from_name[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.from_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 700 }}>{'\u20B9'}{t.amount.toLocaleString()}</div>
                  </div>
                </div>
                <button className="action-btn primary sm" onClick={() => handleSettle(t)}>Settle</button>
              </div>
            ))}
          </div>
        )}

        {/* Pending To Pay */}
        {toPayList.length > 0 && (
          <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ff6060', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending to Pay</div>
            {toPayList.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 12, marginBottom: i < toPayList.length - 1 ? 12 : 0, borderBottom: i < toPayList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div className="avatar sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>{t.to_avatar || t.to_name[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.to_name}</div>
                    <div style={{ fontSize: 13, color: '#ff6060', fontWeight: 700 }}>{'\u20B9'}{t.amount.toLocaleString()}</div>
                  </div>
                </div>
                <button className="action-btn ghost sm" onClick={() => handleSettle(t)}>Pay Now</button>
              </div>
            ))}
          </div>
        )}

        {/* Settlement History - Bank Statement Style */}
        {stats.allSettlements.length > 0 && (
          <div className="card" style={{ borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Settlement History</div>
            {stats.allSettlements.slice(0, 8).map((s, i) => {
              const isReversed = s.status === 'reversed';
              const fromName = s.paid_by?.full_name || s.from_name || 'Member';
              const toName = s.paid_to?.full_name || s.to_name || 'Member';
              const settledDate = new Date(s.settled_at);
              return (
                <div key={s._id} className={`settle-history-item ${isReversed ? 'reversed' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, width: '100%' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: isReversed ? 'var(--glass-soft)' : 'rgba(181,255,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isReversed ? <RefreshCw size={18} /> : <Check size={18} />}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isReversed ? 'var(--tx3)' : 'var(--tx)', textDecoration: isReversed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal', wordBreak: 'break-word' }}>{fromName} paid {toName}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{settledDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      {isReversed && s.updatedAt && <div style={{ fontSize: 10, color: '#ff6060', fontWeight: 600, marginTop: 2 }}>Reversed {new Date(s.updatedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--fn)', fontSize: 16, fontWeight: 700, color: isReversed ? 'var(--tx3)' : 'var(--lime)', textDecoration: isReversed ? 'line-through' : 'none', fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{'\u20B9'}{s.amount.toLocaleString()}</div>
                    {isReversed ? <span className="status-badge reversed"><RefreshCw size={10} /> Reversed</span> : <span className="status-badge completed"><Check size={10} /> Completed</span>}
                    {!isReversed && <button className="action-btn danger sm" style={{ padding: '6px 12px', minHeight: 32 }} onClick={() => handleUndo(s._id, s.group?._id || s.group)}>Undo</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {toReceiveList.length === 0 && toPayList.length === 0 && stats.allSettlements.length === 0 && (
          <div className="card" style={{ borderRadius: 20, padding: 24, textAlign: 'center', color: 'var(--tx3)' }}>No settlement data available.</div>
        )}
      </div>

      {/* SECTION 5: EXPORT */}
      <div className="card" style={{ borderRadius: 20, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>Export Data</h3>
        <div className="action-row insights-export-row">
          <button className="action-btn ghost" onClick={() => exportReport('csv')}>Download CSV</button>
          <button className="action-btn ghost" onClick={() => exportReport('pdf')}>Download PDF</button>
          <button className="action-btn ghost" onClick={() => exportReport('xlsx')}>Download Excel</button>
        </div>
      </div>

      {confirmSettle && (
        <ConfirmSettleModal 
          settle={confirmSettle} 
          onClose={() => setConfirmSettle(null)} 
          onConfirm={executeSettle} 
          loading={settleLoading} 
        />
      )}
    </div>
  );
}

