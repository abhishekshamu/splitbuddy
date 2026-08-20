import React from 'react';

export default function TrendChart({ data }) {
  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)' }}>No data</div>;
  const max = Math.max(...data.map(d => d.v), 1);
  const h = 200, w = 400;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.v / max) * (h - 20) - 10}`).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-chart" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.5s ease' }} />
      <polygon points={areaPoints} fill="url(#trendGrad)" style={{ transition: 'all 0.5s ease' }} />
      {data.map((d, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (d.v / max) * (h - 20) - 10} r="4" fill="var(--bg)" stroke="var(--lime)" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ── GROUP SEARCH MODAL ──────────────────────────────────────────────