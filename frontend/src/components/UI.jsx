import React from 'react';
import { useAuthStore } from '../store';
import { formatMoney, normalizeCurrency, defaultCurrency } from '../lib/prefs';

const useCurrencyFormatter = () => {
  const user = useAuthStore(s => s.user);
  const currentCurrency = normalizeCurrency(user?.settings?.currency || defaultCurrency);
  return (value) => formatMoney(value, currentCurrency);
};

export const ActionButton = ({ onClick, variant = 'primary', children, style, className = '', ...props }) => {
  const baseClass = 'btn ' + (variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : variant === 'violet' ? 'btn-violet' : variant === 'danger' ? 'btn-danger' : '');
  return (
    <button className={`action-btn ${baseClass} ${className}`} onClick={onClick} style={style} {...props}>
      {children}
    </button>
  );
};

export const StatusBadge = ({ status }) => {
  if (status === 'reversed') {
    return <span className="status-badge reversed">↩ Reversed</span>;
  }
  return <span className="status-badge completed">✔ Completed</span>;
};

export const HistoryCard = ({ settlement, onUndo }) => {
  const formatCurrency = useCurrencyFormatter();
  const isReversed = settlement.status === 'reversed';
  const amount = settlement.amount || 0;
  
  return (
    <div className={`history-card ${isReversed ? 'reversed' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hc-icon">{isReversed ? '↩' : '✅'}</div>
        <div>
          <div className="hc-title">
            <span className={isReversed ? 'strike' : ''}>{settlement.paid_by?.full_name || settlement.from_name || 'Member'} paid {settlement.paid_to?.full_name || settlement.to_name || 'Member'}</span>
          </div>
          <div className="hc-meta">
            {new Date(settlement.settled_at || settlement.created_at).toLocaleString()}
          </div>
          {isReversed && settlement.updated_at && (
            <div className="hc-meta-undo">
              Undo at {new Date(settlement.updated_at).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div className={`hc-amount ${isReversed ? 'strike' : ''}`}>{formatCurrency(amount)}</div>
        <StatusBadge status={settlement.status} />
        {!isReversed && onUndo && (
          <button className="btn btn-sm btn-ghost hc-undo-btn" onClick={() => onUndo(settlement._id, settlement.group?._id || settlement.group)}>Undo</button>
        )}
      </div>
    </div>
  );
};

export const SettlementCard = ({ fromUser, toUser, amount, onSettle, type = 'receive' }) => {
  const formatCurrency = useCurrencyFormatter();
  return (
    <div className={`settlement-card type-${type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {type === 'receive' ? (fromUser.avatar || fromUser.name[0]) : (toUser.avatar || toUser.name[0])}
        </div>
        <div>
          <div className="sc-name">{type === 'receive' ? fromUser.name : toUser.name}</div>
          <div className={`sc-amount ${type}`}>{formatCurrency(amount)}</div>
        </div>
      </div>
      <ActionButton variant={type === 'receive' ? 'primary' : 'ghost'} onClick={onSettle}>
        {type === 'receive' ? 'Settle' : 'Pay Now'}
      </ActionButton>
    </div>
  );
};

export const TimelineItem = ({ activity }) => {
  const formatCurrency = useCurrencyFormatter();
  const isSettlement = activity.type === 'settlement' || activity.type === 'settlement_undo';
  const isReversed = activity.status === 'reversed' || activity.type === 'settlement_undo';
  
  return (
    <div className={`timeline-item ${isReversed ? 'reversed' : ''}`}>
      <div className="tl-line"></div>
      <div className={`tl-icon ${activity.type === 'expense' ? 'expense' : 'settle'} ${isReversed ? 'reversed' : ''}`}>
        {activity.type === 'expense' ? '💸' : isReversed ? '↩' : '🤝'}
      </div>
      <div className="tl-content">
        <div className="tl-header">
          <div className={`tl-title ${isReversed ? 'strike' : ''}`}>
            {activity.description || (isSettlement ? 'Settlement' : 'Expense')}
          </div>
          {activity.amount && (
            <div className={`tl-amount ${isReversed ? 'strike' : ''}`}>
              {formatCurrency(activity.amount)}
            </div>
          )}
        </div>
        <div className="tl-meta">
          {new Date(activity.date || activity.created_at).toLocaleString()}
          {isReversed && activity.type === 'settlement_undo' && ' • Reversed'}
        </div>
      </div>
    </div>
  );
};
