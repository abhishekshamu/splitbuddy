import React from 'react';

export default function BarChart({ data }) {
  const mx = Math.max(...data.map(d => d.v));
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-fill" style={{ height: `${(d.v / mx) * 100}px`, background: i === data.length - 1 ? "linear-gradient(180deg,#b5ff4d,#3de8d0)" : "rgba(255,255,255,0.09)", borderRadius: "5px 5px 0 0" }} />
          <span className="bar-lbl">{d.m}</span>
        </div>
      ))}
    </div>
  );
}
