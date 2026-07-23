const fs = require('fs');
let code = fs.readFileSync('frontend/src/SplitBuddy.jsx', 'utf8');

const cssToAdd = `
  /* ACTION BUTTON SYSTEM */
  .action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; font-family: var(--fb); min-height: 48px; }
  .action-btn.primary { background: var(--lime); color: #000; }
  .action-btn.primary:hover { background: #ccff77; box-shadow: 0 0 24px rgba(181,255,77,0.22); }
  .action-btn.ghost { background: var(--bg-glass); color: var(--tx); border: 1px solid var(--border); }
  .action-btn.ghost:hover { background: var(--bg-glass2); }
  .action-btn.danger { background: rgba(255,80,80,0.1); color: #ff6060; border: 1px solid rgba(255,80,80,0.18); }
  .action-btn.sm { padding: 8px 14px; min-height: 36px; font-size: 13px; border-radius: 10px; }
  .action-row { display: flex; gap: 12px; flex-wrap: wrap; }
  @media(max-width: 768px) { .action-btn { width: 100%; } .action-row { flex-direction: column; } }

  .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .status-badge.completed { background: rgba(181,255,77,0.12); color: var(--lime); }
  .status-badge.reversed { background: var(--glass-soft); color: var(--tx3); }
  .strike { text-decoration: line-through; }

  .hide-scroll::-webkit-scrollbar { display: none; }
  .hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }

  .filter-chip { padding: 10px 20px; border-radius: 24px; white-space: nowrap; font-size: 14px; font-weight: 600; border: none; transition: all 0.25s ease; cursor: pointer; flex-shrink: 0; }
  .filter-chip.active { background: var(--tx); color: var(--bg); }
  .filter-chip:not(.active) { background: var(--bg-card); color: var(--tx2); }

  .settle-history-item { padding: 16px; border-radius: 16px; background: var(--bg-glass); border: 1px solid var(--border); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; transition: all 0.2s; }
  .settle-history-item.reversed { opacity: 0.65; border-color: var(--border2); }
  @media(max-width: 430px) { .settle-history-item { flex-direction: column; align-items: flex-start; } }

  @media(max-width: 768px) {
    .insights-export-row { flex-direction: column; }
    .insights-export-row .action-btn { width: 100%; }
  }
`;

code = code.replace('/* --- LANDING V2 --- */', cssToAdd + '\n  /* --- LANDING V2 --- */');
fs.writeFileSync('frontend/src/SplitBuddy.jsx', code);
console.log('CSS injected');
