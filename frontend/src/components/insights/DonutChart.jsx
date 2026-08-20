import React from 'react';
import { useCurrency } from '../../lib/CurrencyContext';

export default function DonutChart({ data }) {
  const { fm: formatCurrency } = useCurrency();
  const total = data.reduce((s, d) => s + d.v, 0);
  let cum = -90;
  const paths = data.map(d => {
    const angle = (d.v / total) * 360;
    const s = cum; cum += angle;
    const t = a => a * Math.PI / 180;
    const x1 = 80 + 60 * Math.cos(t(s)), y1 = 80 + 60 * Math.sin(t(s));
    const x2 = 80 + 60 * Math.cos(t(s + angle)), y2 = 80 + 60 * Math.sin(t(s + angle));
    return { path: `M80,80 L${x1},${y1} A60,60 0 ${angle > 180 ? 1 : 0} 1 ${x2},${y2} Z`, color: d.c };
  });
  return (
    <div className="donut-wrap" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width="100%" height="auto" viewBox="0 0 160 160" style={{ flexShrink: 0, maxWidth: '160px' }}>
        {paths.map((p, i) => <path key={i} d={p.path} fill={p.color} opacity=".85" />)}
        <circle cx="80" cy="80" r="37" fill="#12121a" />
        <text x="80" y="75" textAnchor="middle" fill="#f0f0f8" fontSize="18" fontWeight="700" fontFamily="Inter" style={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{formatCurrency(total)}</text>
        <text x="80" y="92" textAnchor="middle" fill="#8888a0" fontSize="10" fontFamily="DM Sans">Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>{data.map((d, i) => (
        <div className="legend-item" key={i}>
          <div className="legend-dot" style={{ background: d.c }} />
          <span className="legend-label">{d.l}</span>
          <span className="legend-val">{formatCurrency(d.v)}</span>
        </div>
      ))}</div>
    </div>
  );
}