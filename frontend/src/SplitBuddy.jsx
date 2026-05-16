import toast from 'react-hot-toast';
import { useState, useMemo, useEffect } from "react";
import { useAuthStore, useGroupStore, useExpenseStore, useUIStore } from "./store";
import api from "./lib/api";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --bg-card: #12121a; --bg-glass: rgba(255,255,255,0.04); --bg-glass2: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08); --border2: rgba(255,255,255,0.13);
    --lime: #b5ff4d; --violet: #9b6dff; --cyan: #3de8d0; --pink: #ff5fcb; --amber: #ffb830;
    --tx: #f0f0f8; --tx2: #8888a0; --tx3: #55556a;
    --fd: 'Syne', sans-serif; --fb: 'DM Sans', sans-serif;
  }
  html,body,#root { height:100%; background:var(--bg); color:var(--tx); font-family:var(--fb); }
  ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:99px; }

  /* --- LANDING V2 --- */
  .landing-v2 { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); overflow-y: auto; overflow-x: hidden; }
  .landing-v2-nav { position: sticky; top: 0; z-index: 100; display: flex; justify-content: space-between; align-items: center; padding: 16px 5%; background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
  .landing-v2-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 5%; text-align: left; max-width: 1200px; margin: 0 auto; min-height: 80vh; }
  @media (min-width: 768px) { .landing-v2-hero { flex-direction: row; gap: 40px; align-items: center; } .landing-v2-hero > * { flex: 1; } }
  .landing-v2-badge { display: inline-block; padding: 6px 12px; background: rgba(181, 255, 77, 0.1); color: var(--lime); border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 24px; border: 1px solid rgba(181, 255, 77, 0.2); }
  .landing-v2-h1 { font-family: var(--fd); font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 20px; }
  @media (min-width: 768px) { .landing-v2-h1 { font-size: 56px; } }
  .landing-v2-h1 span { color: var(--lime); }
  .landing-v2-sub { font-size: 16px; color: var(--tx2); line-height: 1.6; margin-bottom: 32px; max-width: 480px; }
  @media (min-width: 768px) { .landing-v2-sub { font-size: 18px; } }
  .landing-v2-cta { display: flex; gap: 16px; flex-wrap: wrap; }
  .landing-v2-mockup { width: 100%; max-width: 500px; aspect-ratio: 4/3; background: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05)); border: 1px solid var(--border); border-radius: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); position: relative; overflow: hidden; margin-top: 40px; }
  @media (min-width: 768px) { .landing-v2-mockup { margin-top: 0; } }
  .landing-v2-mockup::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle, rgba(181,255,77,0.1) 0%, transparent 60%); }
  .landing-v2-mockup-inner { position: relative; z-index: 1; text-align: center; }
  .landing-v2-section { padding: 80px 5%; max-width: 1200px; margin: 0 auto; width: 100%; }
  .landing-v2-sec-title { font-family: var(--fd); font-size: 32px; font-weight: 700; text-align: center; margin-bottom: 48px; }
  .landing-v2-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media (min-width: 600px) { .landing-v2-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) { .landing-v2-grid { grid-template-columns: repeat(3, 1fr); } }
  .landing-v2-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid var(--border); padding: 32px 24px; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; gap: 12px; }
  .landing-v2-card:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.05); border-color: rgba(181, 255, 77, 0.3); box-shadow: 0 10px 30px rgba(181, 255, 77, 0.05); }
  .landing-v2-card-icon { font-size: 32px; width: 56px; height: 56px; border-radius: 14px; background: rgba(181, 255, 77, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
  .landing-v2-card-title { font-size: 18px; font-weight: 700; font-family: var(--fd); color: var(--tx); }
  .landing-v2-card-desc { font-size: 14px; color: var(--tx2); line-height: 1.5; }
  .landing-v2-timeline { display: flex; flex-direction: column; gap: 20px; max-width: 600px; margin: 0 auto; }
  .landing-v2-step { display: flex; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 16px; padding: 24px; gap: 20px; align-items: flex-start; transition: all 0.3s; }
  .landing-v2-step:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.1); }
  .landing-v2-step-num { width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; background: var(--lime); color: #000; font-family: var(--fd); font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  .landing-v2-step-info { flex: 1; }
  .landing-v2-step-title { font-size: 18px; font-weight: 700; font-family: var(--fd); margin-bottom: 6px; }
  .landing-v2-step-desc { font-size: 14px; color: var(--tx2); line-height: 1.5; }
  .landing-v2-footer { padding: 40px 5%; border-top: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 20px; margin-top: 40px; }
  @media (min-width: 768px) { .landing-v2-footer { flex-direction: row; justify-content: space-between; } }
  .landing-v2-footer-links { display: flex; gap: 24px; font-size: 14px; color: var(--tx2); }
  .landing-v2-footer-links span { cursor: pointer; transition: color 0.2s; }
  .landing-v2-footer-links span:hover { color: var(--lime); }

  .app { display:flex; height:100vh; overflow:hidden; }

  .sidebar { width:232px; flex-shrink:0; background:var(--bg-card); border-right:1px solid var(--border); display:flex; flex-direction:column; padding:20px 0; }
  .sb-logo { padding:0 18px 22px; display:flex; align-items:center; gap:9px; }
  .logo-mark { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,var(--lime),var(--cyan)); display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:800; color:#000; font-family:var(--fd); flex-shrink:0; }
  .logo-text { font-family:var(--fd); font-size:17px; font-weight:700; }
  .logo-text span { color:var(--lime); }
  .nav-sec { padding:0 10px; margin-bottom:6px; }
  .nav-label { font-size:10px; font-weight:700; letter-spacing:1.2px; color:var(--tx3); text-transform:uppercase; padding:0 8px; margin-bottom:3px; }
  .nav-item { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:9px; cursor:pointer; transition:all .18s; font-size:13.5px; color:var(--tx2); font-weight:500; position:relative; }
  .nav-item:hover { background:var(--bg-glass); color:var(--tx); }
  .nav-item.active { background:rgba(181,255,77,0.1); color:var(--lime); }
  .nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:18px; background:var(--lime); border-radius:0 3px 3px 0; }
  .nav-icon { font-size:15px; width:18px; text-align:center; }
  .sb-bottom { margin-top:auto; padding:10px; border-top:1px solid var(--border); }
  .user-pill { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:9px; background:var(--bg-glass); cursor:pointer; transition:background .2s; }
  .user-pill:hover { background:var(--bg-glass2); }
  .avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,var(--violet),var(--pink)); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; font-family:var(--fd); flex-shrink:0; }
  .avatar.lg { width:64px; height:64px; font-size:24px; box-shadow:0 0 20px rgba(155,109,255,0.4); }
  .avatar.sm { width:22px; height:22px; font-size:9px; border:2px solid var(--bg-card); margin-left:-5px; }
  .user-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .user-role { font-size:11px; color:var(--tx3); }

  .main { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .topbar { padding:18px 28px; display:flex; align-items:center; gap:14px; border-bottom:1px solid var(--border); background:rgba(10,10,15,0.92); backdrop-filter:blur(20px); position:sticky; top:0; z-index:5; flex-shrink:0; }
  .topbar-title { font-family:var(--fd); font-size:19px; font-weight:700; flex:1; }
  .topbar-actions { display:flex; gap:7px; align-items:center; }

  .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 17px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; transition:all .18s; border:none; font-family:var(--fb); }
  .btn-primary { background:var(--lime); color:#000; }
  .btn-primary:hover { background:#ccff77; box-shadow:0 0 24px rgba(181,255,77,0.22); transform:translateY(-1px); }
  .btn-ghost { background:var(--bg-glass); color:var(--tx); border:1px solid var(--border); }
  .btn-ghost:hover { background:var(--bg-glass2); border-color:var(--border2); }
  .btn-violet { background:var(--violet); color:#fff; }
  .btn-violet:hover { background:#b08cff; box-shadow:0 0 24px rgba(155,109,255,0.3); }
  .btn-sm { padding:6px 11px; font-size:12px; }
  .btn-danger { background:rgba(255,80,80,0.1); color:#ff6060; border:1px solid rgba(255,80,80,0.18); }

  .content { padding:28px; flex:1; }

  .card { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:22px; box-shadow:0 8px 28px rgba(0,0,0,0.35); }
  .card-sm { padding:14px; border-radius:14px; }

  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .stat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:18px; padding:18px 20px; position:relative; overflow:hidden; transition:all .2s; cursor:default; }
  .stat-card:hover { border-color:var(--border2); transform:translateY(-2px); }
  .stat-card::after { content:''; position:absolute; top:-35px; right:-35px; width:90px; height:90px; border-radius:50%; opacity:.08; }
  .stat-card.lime::after { background:var(--lime); } .stat-card.violet::after { background:var(--violet); }
  .stat-card.cyan::after { background:var(--cyan); } .stat-card.pink::after { background:var(--pink); }
  .stat-icon { font-size:22px; margin-bottom:10px; }
  .stat-label { font-size:11px; color:var(--tx3); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
  .stat-val { font-family:var(--fd); font-size:26px; font-weight:800; margin-bottom:4px; }
  .stat-val.lime{color:var(--lime);} .stat-val.violet{color:var(--violet);} .stat-val.cyan{color:var(--cyan);} .stat-val.pink{color:var(--pink);}
  .stat-meta { font-size:11px; color:var(--tx3); }
  .stat-meta.up{color:#4dff88;} .stat-meta.down{color:#ff6060;}

  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .three-col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }

  .expense-item { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; background:var(--bg-glass); border:1px solid var(--border); margin-bottom:7px; transition:all .18s; cursor:pointer; }
  .expense-item:hover { background:var(--bg-glass2); border-color:var(--border2); }
  .exp-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; }
  .exp-title { font-size:13.5px; font-weight:600; margin-bottom:2px; }
  .exp-meta { font-size:11.5px; color:var(--tx2); }
  .exp-amt { text-align:right; flex-shrink:0; }
  .exp-total { font-family:var(--fd); font-size:15px; font-weight:700; }
  .exp-split { font-size:10.5px; color:var(--tx3); }

  .bal-item { margin-bottom:14px; }
  .bal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:13px; }
  .bal-name { font-weight:600; }
  .bal-amt { font-family:var(--fd); font-weight:700; }
  .bal-amt.owe{color:#ff6060;} .bal-amt.gets{color:#4dff88;}
  .prog-track { height:5px; background:rgba(255,255,255,0.05); border-radius:99px; overflow:hidden; }
  .prog-fill { height:100%; border-radius:99px; transition:width .7s cubic-bezier(.4,0,.2,1); }

  .group-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .group-card { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:18px; cursor:pointer; transition:all .22s; position:relative; overflow:hidden; }
  .group-card:hover { border-color:var(--border2); transform:translateY(-3px); box-shadow:0 14px 36px rgba(0,0,0,0.38); }
  .group-card-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
  .group-emoji { font-size:30px; }
  .group-name { font-family:var(--fd); font-size:16px; font-weight:700; margin-bottom:3px; }
  .group-members { font-size:11.5px; color:var(--tx2); margin-bottom:12px; }
  .group-stat { display:flex; justify-content:space-between; align-items:center; }
  .group-total { font-family:var(--fd); font-size:18px; font-weight:800; }
  .member-avatars { display:flex; }

  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .2s ease; }
  .modal { background:var(--bg-card); border:1px solid var(--border2); border-radius:26px; padding:28px; width:100%; max-width:510px; max-height:90vh; overflow-y:auto; animation:slideUp .22s cubic-bezier(.4,0,.2,1); box-shadow:0 40px 80px rgba(0,0,0,0.6); }
  .modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
  .modal-title { font-family:var(--fd); font-size:21px; font-weight:700; }
  .modal-close { width:30px; height:30px; border-radius:8px; background:var(--bg-glass); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; color:var(--tx2); transition:all .15s; }
  .modal-close:hover { background:var(--bg-glass2); color:var(--tx); }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}

  .form-group { margin-bottom:16px; }
  .form-label { font-size:11px; font-weight:700; color:var(--tx2); text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; display:block; }
  .form-input,.form-select,.form-textarea { width:100%; padding:10px 13px; background:var(--bg-glass); border:1px solid var(--border); border-radius:9px; color:var(--tx); font-family:var(--fb); font-size:13.5px; transition:all .15s; outline:none; }
  .form-input:focus,.form-select:focus,.form-textarea:focus { border-color:var(--lime); box-shadow:0 0 0 3px rgba(181,255,77,0.09); }
  .form-select option { background:var(--bg-card); }
  .form-textarea { resize:vertical; min-height:72px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .split-toggle { display:flex; gap:5px; }
  .split-btn { flex:1; padding:8px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; border:1px solid var(--border); background:transparent; color:var(--tx2); font-family:var(--fb); text-align:center; }
  .split-btn.active { background:rgba(181,255,77,0.12); border-color:var(--lime); color:var(--lime); }

  .donut-wrap { display:flex; align-items:center; gap:20px; }
  .legend-item { display:flex; align-items:center; gap:7px; font-size:12.5px; margin-bottom:8px; }
  .legend-dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
  .legend-label { color:var(--tx2); flex:1; }
  .legend-pct { font-weight:700; color:var(--tx); }

  .activity-item { display:flex; gap:10px; padding:11px 0; border-bottom:1px solid var(--border); }
  .activity-item:last-child { border-bottom:none; }
  .activity-dot { width:7px; height:7px; border-radius:50%; margin-top:5px; flex-shrink:0; }
  .activity-text { font-size:12.5px; line-height:1.5; }
  .activity-time { font-size:10.5px; color:var(--tx3); margin-top:1px; }

  .tag { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:99px; font-size:10.5px; font-weight:700; }
  .tag-lime{background:rgba(181,255,77,.11);color:var(--lime);} .tag-violet{background:rgba(155,109,255,.11);color:var(--violet);}
  .tag-cyan{background:rgba(61,232,208,.11);color:var(--cyan);} .tag-pink{background:rgba(255,95,203,.11);color:var(--pink);}
  .tag-amber{background:rgba(255,184,48,.11);color:var(--amber);} .tag-red{background:rgba(255,80,80,.11);color:#ff6060;}
  .tag-green{background:rgba(77,255,136,.11);color:#4dff88;}
  .tag-blue{background:rgba(61,135,255,.11);color:#3da8ff;}
  .tag-orange{background:rgba(255,153,0,.11);color:#ff9900;}

  .utilities-view { height:100%; display:flex; flex-direction:column; }
  .utilities-container { padding: 24px; display: flex; flex-direction: column; gap: 24px; position: relative; }
  .util-header { display: flex; justify-content: space-between; align-items: flex-end; }
  .util-title-group { display: flex; flex-direction: column; gap: 4px; }
  .util-actions { display: flex; gap: 8px; }

  .utilities-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
  .util-card { min-height: 240px; display: flex; flex-direction: column; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .section-title { font-family: var(--fd); font-size: 15px; font-weight: 700; color: var(--tx); display: flex; align-items: center; gap: 8px; }

  /* Generic List Styling */
  .util-list { flex: 1; overflow-y: auto; max-height: 200px; padding-right: 5px; margin-bottom: 15px; }
  .empty-state { display: flex; align-items: center; justify-content: center; height: 100px; color: var(--tx3); font-size: 12px; text-align: center; }
  .add-footer { display: flex; gap: 6px; padding-top: 12px; border-top: 1px solid var(--border); }
  .form-input.sm { padding: 6px 10px; font-size: 12px; border-radius: 8px; }
  .btn-del { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--tx3); cursor: pointer; border-radius: 50%; }
  .btn-del:hover { background: rgba(255,80,80,0.15); color: #ff6060; }

  /* Reminders V2 */
  .rem-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); transition: all 0.2s; }
  .rem-item.completed { opacity: 0.4; }
  .rem-check { width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 12px; color: var(--lime); margin-top: 2px; }
  .rem-item.completed .rem-check { background: var(--lime); border-color: var(--lime); color: #000; }
  .rem-content { flex: 1; }
  .rem-title { font-size: 13px; font-weight: 600; color: var(--tx); }
  .rem-item.completed .rem-title { text-decoration: line-through; }
  .rem-meta { font-size: 10px; color: var(--tx3); margin-top: 2px; }
  .pri-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 800; font-size: 8px; }
  .pri-low { background: rgba(61,232,208,0.1); color: var(--cyan); }
  .pri-medium { background: rgba(255,184,48,0.1); color: var(--amber); }
  .pri-high { background: rgba(255,95,203,0.1); color: var(--pink); }

  /* Grocery V2 */
  .grocery-item-v2 { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .gro-content { flex: 1; display: flex; justify-content: space-between; align-items: center; }
  .gro-name { font-size: 13px; font-weight: 600; }
  .gro-qty { color: var(--tx3); font-size: 11px; margin-left: 4px; }
  .gro-price { font-size: 12px; font-weight: 700; color: var(--tx2); }

  /* Chores V2 */
  .chore-item-v2 { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-glass); border-radius: 12px; margin-bottom: 8px; border: 1px solid var(--border); }
  .chore-info { flex: 1; }
  .chore-name { font-size: 13px; font-weight: 700; }
  .chore-assignee { font-size: 10px; color: var(--tx3); margin-top: 2px; }
  .chore-actions { display: flex; align-items: center; gap: 8px; }

  /* Payments V2 */
  .pay-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; background: var(--bg-glass); margin-bottom: 8px; }
  .pay-info { flex: 1; }
  .pay-title { font-size: 13px; font-weight: 700; }
  .pay-due { font-size: 10px; color: var(--tx3); margin-top: 2px; }
  .pay-amt { font-family: var(--fd); font-size: 14px; font-weight: 800; color: var(--pink); }
  .btn-status { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; border: none; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
  .btn-status.paid { background: rgba(181,255,77,0.15); color: var(--lime); }
  .btn-status.pending { background: rgba(255,95,203,0.15); color: var(--pink); }

  /* Shared Links & Notes V3 */
  .links-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; flex: 1; }
  .link-card { background: var(--bg-glass); padding: 10px; border-radius: 10px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; transition: all 0.2s; }
  .link-card:hover { border-color: var(--border2); background: var(--bg-glass2); }
  .link-title { font-size: 12px; font-weight: 700; color: var(--cyan); margin-bottom: 2px; }
  .link-url { font-size: 9px; color: var(--tx3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .notes-v3-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 15px; }
  .note-card-v3 { background: #1a1a24; border: 1px solid var(--border); padding: 14px; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .note-h { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .note-t { font-size: 13px; font-weight: 800; color: var(--amber); }
  .note-b { font-size: 12px; color: var(--tx); line-height: 1.5; min-height: 40px; margin-bottom: 10px; }
  .note-f { font-size: 9px; color: var(--tx3); font-weight: 600; text-transform: uppercase; }
  .note-input-v3 { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); }

  /* Activity Feed */
  .activity-card { max-height: 400px; }
  .activity-list { flex: 1; overflow-y: auto; padding-left: 10px; border-left: 1px solid var(--border); }
  .activity-item { position: relative; padding: 0 0 20px 20px; font-size: 11px; color: var(--tx2); }
  .act-dot { position: absolute; left: -5.5px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--violet); border: 2px solid var(--bg-card); }
  .act-time { font-size: 9px; color: var(--tx3); margin-top: 4px; font-weight: 700; }

  /* Quick Action Bar */
  .quick-action-bar { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(18,18,26,0.85); backdrop-filter: blur(15px); border: 1px solid var(--border2); padding: 8px 15px; border-radius: 50px; display: flex; gap: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); z-index: 100; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .quick-action-bar:hover { bottom: 35px; box-shadow: 0 15px 50px rgba(0,0,0,0.6); }
  .qa-btn { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; transition: all 0.2s; }
  .qa-btn:hover { transform: translateY(-3px); }
  .qa-icon { font-size: 18px; }
  .qa-label { font-size: 9px; font-weight: 700; color: var(--tx2); text-transform: uppercase; }

  .settle-item { padding:18px; border-radius:20px; background:var(--bg-glass); border:1px solid var(--border); margin-bottom:12px; display:flex; align-items:center; gap:16px; transition:all .2s; }
  .settle-item:hover { background:var(--bg-glass2); transform:translateY(-2px); border-color:var(--border2); }
  .settle-arrow { font-size:22px; color:var(--tx3); font-weight:700; opacity:.5; }
  .settle-amt { font-family:var(--fd); font-size:20px; font-weight:800; color:var(--lime); }

  .ai-bubble { padding:12px 16px; border-radius:12px; margin-bottom:8px; font-size:13px; line-height:1.6; max-width:86%; }
  .ai-bubble.bot { background:rgba(155,109,255,.11); border:1px solid rgba(155,109,255,.2); }
  .ai-bubble.user { background:rgba(181,255,77,.09); border:1px solid rgba(181,255,77,.2); align-self:flex-end; }
  .ai-chat { display:flex; flex-direction:column; gap:2px; min-height:260px; }

  .bar-chart { display:flex; align-items:flex-end; gap:7px; height:110px; padding-top:10px; }
  .bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; }
  .bar-fill { width:100%; border-radius:5px 5px 0 0; min-height:7px; }
  .bar-lbl { font-size:10.5px; color:var(--tx3); }

  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .section-title { font-family:var(--fd); font-size:16px; font-weight:700; }
  .section-link { font-size:12px; color:var(--violet); cursor:pointer; font-weight:600; }

  .tabs { display:flex; gap:3px; background:var(--bg-glass); border-radius:9px; padding:3px; margin-bottom:18px; }
  .tab { flex:1; padding:8px; text-align:center; font-size:13px; font-weight:600; border-radius:7px; cursor:pointer; transition:all .15s; color:var(--tx2); }
  .tab.active { background:var(--bg-card); color:var(--tx); box-shadow:0 2px 8px rgba(0,0,0,0.3); }

  .badge { display:inline-flex; align-items:center; justify-content:center; min-width:17px; height:17px; padding:0 4px; background:var(--violet); color:#fff; border-radius:99px; font-size:9.5px; font-weight:700; }
  .divider { height:1px; background:var(--border); margin:14px 0; }

  .reminder-banner { padding:12px 16px; border-radius:11px; background:rgba(255,184,48,.07); border:1px solid rgba(255,184,48,.18); display:flex; align-items:center; gap:10px; margin-bottom:18px; }
  .reminder-icon { font-size:20px; }
  .reminder-text { flex:1; font-size:13px; }
  .reminder-text strong { color:var(--amber); }

  .note-card { padding:12px; border-radius:11px; background:rgba(255,184,48,.05); border:1px solid rgba(255,184,48,.13); margin-bottom:8px; }
  .note-title { font-size:12.5px; font-weight:700; color:var(--amber); margin-bottom:3px; }
  .note-body { font-size:12.5px; color:var(--tx2); line-height:1.5; }

  .landing { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; }
  .landing-nav { padding:18px 56px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:10; background:rgba(10,10,15,.95); backdrop-filter:blur(20px); }
  .hero { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:72px 32px; background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(181,255,77,.07) 0%,transparent 60%); }
  .hero-eyebrow { display:inline-flex; align-items:center; gap:5px; padding:5px 13px; border-radius:99px; font-size:12px; font-weight:700; background:rgba(181,255,77,.09); border:1px solid rgba(181,255,77,.22); color:var(--lime); margin-bottom:22px; }
  .hero-h { font-family:var(--fd); font-size:clamp(40px,6vw,76px); font-weight:800; line-height:1.05; margin-bottom:18px; background:linear-gradient(180deg,#f0f0f8 0%,#8888a0 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .hero-h .hi { background:linear-gradient(135deg,var(--lime),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .hero-sub { font-size:17px; color:var(--tx2); max-width:480px; line-height:1.6; margin-bottom:36px; }
  .hero-cta { display:flex; gap:11px; flex-wrap:wrap; justify-content:center; }
  .feat-row { display:flex; gap:28px; margin-top:52px; flex-wrap:wrap; justify-content:center; }
  .feat-item { text-align:center; }
  .feat-icon { font-size:26px; margin-bottom:6px; }
  .feat-lbl { font-size:12.5px; font-weight:600; color:var(--tx2); }
  .feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:900px; margin:0 auto; padding:60px 32px; }
  .feat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:18px; padding:22px; text-align:center; }
  .feat-card-icon { font-size:34px; margin-bottom:12px; }
  .feat-card-title { font-family:var(--fd); font-size:16px; font-weight:700; margin-bottom:6px; }
  .feat-card-desc { font-size:13px; color:var(--tx2); line-height:1.5; }
  .landing-footer { border-top:1px solid var(--border); padding:24px 56px; display:flex; align-items:center; justify-content:space-between; font-size:13px; color:var(--tx3); }

  .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); background-image:radial-gradient(ellipse at 20% 50%,rgba(155,109,255,.05) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(181,255,77,.04) 0%,transparent 50%); }
  .auth-card { width:400px; }
  .auth-header { text-align:center; margin-bottom:28px; }
  .auth-title { font-family:var(--fd); font-size:28px; font-weight:800; margin-bottom:5px; }
  .auth-sub { font-size:13.5px; color:var(--tx2); }
  .auth-div { display:flex; align-items:center; gap:10px; margin:16px 0; }
  .auth-div-line { flex:1; height:1px; background:var(--border); }
  .auth-div-text { font-size:11.5px; color:var(--tx3); white-space:nowrap; }
  .social-btn { width:100%; padding:11px; border-radius:9px; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .18s; font-family:var(--fb); display:flex; align-items:center; justify-content:center; gap:7px; background:var(--bg-glass); border:1px solid var(--border); color:var(--tx); margin-bottom:7px; }
  .social-btn:hover { background:var(--bg-glass2); border-color:var(--border2); }

  .profile-banner { background:linear-gradient(135deg,rgba(155,109,255,.13),rgba(181,255,77,.07)); border-radius:18px; padding:24px; margin-bottom:18px; border:1px solid var(--border); display:flex; align-items:center; gap:18px; }

  .mob-nav { display:none; position:fixed; bottom:0; left:0; right:0; background:var(--bg-card); border-top:1px solid var(--border); padding:7px 0; z-index:50; justify-content:space-around; }
  .mob-item { display:flex; flex-direction:column; align-items:center; gap:1px; padding:5px 10px; cursor:pointer; font-size:9.5px; color:var(--tx3); font-weight:600; border-radius:8px; }
  .mob-item.active { color:var(--lime); }
  .mob-item .micon { font-size:19px; }
  .fab { position:fixed; bottom:72px; right:16px; width:50px; height:50px; border-radius:50%; background:var(--lime); color:#000; font-size:22px; display:none; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 24px rgba(181,255,77,.3),0 8px 20px rgba(0,0,0,.3); transition:transform .2s; z-index:40; border:none; }
  .fab:hover { transform:scale(1.08); }

  @media(max-width:768px) {
    .sidebar{display:none;} .mob-nav{display:flex;} .fab{display:flex;}
    .content{padding:16px 14px 78px;} .topbar{padding:13px 14px;}
    .stat-grid{grid-template-columns:1fr 1fr;gap:9px;}
    .two-col,.three-col,.group-grid{grid-template-columns:1fr;}
    .landing-nav{padding:14px 18px;} .hero-h{font-size:34px;} .hero-sub{font-size:14px;}
    .feat-grid{grid-template-columns:1fr;}
  }

  .autocomplete-dropdown {
    position: absolute; top: 48px; left: 0; right: 0;
    background: #181825; border: 1px solid var(--border2);
    border-radius: 12px; z-index: 100; box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    max-height: 260px; overflow-y: auto; overflow-x: hidden;
  }
  .suggestion-item {
    padding: 11px 15px; display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all .15s; border-bottom: 1px solid var(--border);
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:hover { background: rgba(255,255,255,0.05); }
  .badge-reg {
    font-size: 9px; font-weight: 700; color: #3de8d0; background: rgba(61,232,208,0.1);
    padding: 3px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: .3px;
  }

  .reports-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 14px; }
  .reports-filters { display: flex; gap: 10px; flex-wrap: wrap; }
  .reports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .report-stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; transition: all .2s; }
  .report-stat-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .report-stat-label { font-size: 11px; color: var(--tx3); font-weight: 700; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px; }
  .report-stat-val { font-family: var(--fd); font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .report-stat-meta { font-size: 12px; display: flex; align-items: center; gap: 5px; }
  .report-stat-meta.up { color: #4dff88; }
  .report-stat-meta.down { color: #ff6060; }
  
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
  .chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 22px; }
  .chart-title { font-family: var(--fd); font-size: 16px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
  
  .trend-chart { width: 100%; height: 200px; }
  .bar-chart-v { display: flex; flex-direction: column; gap: 12px; }
  .bar-row { display: flex; align-items: center; gap: 12px; }
  .bar-label { font-size: 13px; width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 12px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; }
  .bar-fill-v { height: 100%; border-radius: 99px; transition: width 1s ease; }
  .bar-val { font-family: var(--fd); font-size: 13px; font-weight: 700; width: 70px; text-align: right; }

  @media(max-width: 768px) {
    .utilities-grid { grid-template-columns: 1fr; gap: 16px; }
    .stat-grid { grid-template-columns: 1fr; }
    .chart-grid { grid-template-columns: 1fr; }
    .two-col { grid-template-columns: 1fr; }
    .three-col { grid-template-columns: 1fr; }
    .util-header { flex-direction: column; align-items: flex-start; gap: 15px; }
    .util-actions { width: 100%; justify-content: flex-end; }
  }
  
  @media(min-width: 769px) and (max-width: 1200px) {
    .utilities-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .reports-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media(min-width: 1201px) {
    .utilities-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .stat-grid { grid-template-columns: repeat(4, 1fr); }
  }

  /* Utility Upgrade Styles */
  .util-dashboard { padding: 5px; }
  .util-header-v2 { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
  .util-stat-row { display: flex; gap: 20px; margin-top: 15px; }
  .util-stat-pill { background: var(--bg-glass); border: 1px solid var(--border); padding: 8px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 2px; }
  .util-stat-label { font-size: 10px; color: var(--tx3); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .util-stat-val { font-family: var(--fd); font-size: 18px; font-weight: 800; color: var(--lime); }
  
  .util-card-v2 { height: 100%; display: flex; flex-direction: column; transition: transform 0.3s ease, border-color 0.3s ease; }
  .util-card-v2:hover { transform: translateY(-5px); border-color: var(--lime); }
  .util-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .util-card-title { display: flex; align-items: center; gap: 10px; font-family: var(--fd); font-size: 17px; font-weight: 700; }
  .util-card-content { flex: 1; overflow-y: auto; max-height: 350px; }
  .util-card-footer { margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--border); }

  .activity-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .activity-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--bg-glass); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .activity-desc { font-size: 12.5px; line-height: 1.4; color: var(--tx2); }
  .activity-time { font-size: 10px; color: var(--tx3); margin-top: 4px; font-weight: 600; }
  
  .budget-metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
  .budget-metric-card { background: var(--bg-glass); padding: 12px; border-radius: 12px; border: 1px solid var(--border); }
  
  /* Notification Styles */
  .notif-trigger { position: relative; display: flex; align-items: center; justify-content: center; }
  .notif-badge { position: absolute; top: -2px; right: -2px; background: #ff4d4d; color: white; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 10px; border: 2px solid var(--bg); min-width: 18px; text-align: center; }
  
  .notif-panel { 
    position: fixed; 
    top: 74px; 
    right: 24px; 
    width: 380px; 
    background: #15151a; 
    border: 1px solid var(--border); 
    border-radius: 24px; 
    box-shadow: 0 25px 60px rgba(0,0,0,0.8); 
    z-index: 2500; 
    display: flex; 
    flex-direction: column; 
    max-height: calc(100vh - 100px); 
    overflow: hidden; 
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  }
  @keyframes slideDown { 
    from { opacity: 0; transform: translateY(-20px); } 
    to { opacity: 1; transform: translateY(0); } 
  }
  
  .notif-header { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .notif-title { font-family: var(--fd); font-size: 18px; font-weight: 800; }
  .notif-list { flex: 1; overflow-y: auto; padding: 10px 0; }
  .notif-item { padding: 14px 22px; display: flex; gap: 14px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.03); position: relative; }
  .notif-item:hover { background: rgba(255,255,255,0.04); }
  .notif-item.unread { background: rgba(181,255,77,0.03); }
  .notif-item.unread::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--lime); }
  
  .notif-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .notif-content { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 13.5px; font-weight: 700; color: var(--tx); margin-bottom: 3px; }
  .notif-item-body { font-size: 12px; color: var(--tx3); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-item-time { font-size: 10px; color: var(--tx3); margin-top: 6px; font-weight: 600; }
  
  .notif-footer { padding: 14px; text-align: center; border-top: 1px solid var(--border); background: rgba(0,0,0,0.1); }
  .notif-empty { padding: 60px 20px; text-align: center; color: var(--tx3); }
  
  @media(max-width: 768px) {
    .notif-panel { top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; max-height: none; border-radius: 0; z-index: 1001; }
    .notif-header { padding-top: 50px; }
  }
`;

// ── DATA ─────────────────────────────────────────────────────────

const CATS = [
  {icon:"🏠",label:"Rent",color:"#9b6dff"},{icon:"⚡",label:"Electricity",color:"#ffb830"},
  {icon:"📶",label:"WiFi",color:"#3de8d0"},{icon:"🛒",label:"Grocery",color:"#4dff88"},
  {icon:"🍔",label:"Food",color:"#ff5fcb"},{icon:"🔥",label:"Gas",color:"#ff8c42"},
  {icon:"🧹",label:"Cleaning",color:"#b5ff4d"},{icon:"💧",label:"Water",color:"#3de8d0"},
  {icon:"🎮",label:"Other",color:"#9b6dff"},
];








// ── MINI CHARTS ──────────────────────────────────────────────────
function DonutChart({data}) {
  const total = data.reduce((s,d)=>s+d.v,0);
  let cum = -90;
  const paths = data.map(d => {
    const angle = (d.v/total)*360;
    const s = cum; cum += angle;
    const t = a => a*Math.PI/180;
    const x1=80+60*Math.cos(t(s)), y1=80+60*Math.sin(t(s));
    const x2=80+60*Math.cos(t(s+angle)), y2=80+60*Math.sin(t(s+angle));
    return {path:`M80,80 L${x1},${y1} A60,60 0 ${angle>180?1:0} 1 ${x2},${y2} Z`, color:d.c};
  });
  return (
    <div className="donut-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" style={{flexShrink:0}}>
        {paths.map((p,i)=><path key={i} d={p.path} fill={p.color} opacity=".85"/>)}
        <circle cx="80" cy="80" r="37" fill="#12121a"/>
        <text x="80" y="75" textAnchor="middle" fill="#f0f0f8" fontSize="13" fontWeight="800" fontFamily="Syne">₹{total>=1000?Math.round(total/100)/10+"K":total.toLocaleString()}</text>
        <text x="80" y="92" textAnchor="middle" fill="#8888a0" fontSize="10" fontFamily="DM Sans">Total</text>
      </svg>
      <div>{data.map((d,i)=>(
        <div className="legend-item" key={i}>
          <div className="legend-dot" style={{background:d.c}}/>
          <span className="legend-label">{d.l}</span>
          <span className="legend-pct">{Math.round((d.v/total)*100)}%</span>
        </div>
      ))}</div>
    </div>
  );
}

function BarChart({data}) {
  const mx = Math.max(...data.map(d=>d.v));
  return (
    <div className="bar-chart">
      {data.map((d,i)=>(
        <div className="bar-col" key={i}>
          <div className="bar-fill" style={{height:`${(d.v/mx)*100}px`,background:i===data.length-1?"linear-gradient(180deg,#b5ff4d,#3de8d0)":"rgba(255,255,255,0.09)",borderRadius:"5px 5px 0 0"}}/>
          <span className="bar-lbl">{d.m}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }) {
  if (!data || data.length === 0) return <div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)'}}>No data</div>;
  const max = Math.max(...data.map(d => d.v), 1);
  const h = 200, w = 400;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.v / max) * (h - 20) - 10}`).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-chart" preserveAspectRatio="none" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{transition:'all 0.5s ease'}} />
      <polygon points={areaPoints} fill="url(#trendGrad)" style={{transition:'all 0.5s ease'}} />
      {data.map((d, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (d.v / max) * (h - 20) - 10} r="4" fill="var(--bg)" stroke="var(--lime)" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ── ADD EXPENSE MODAL ────────────────────────────────────────────
function AddExpenseModal({onClose, editExpense}) {
  const { addExpense, updateExpense } = useExpenseStore();
  const { groups, activeGroup } = useGroupStore();
  
  const isEdit = !!editExpense;
  
  // Determine initial group
  const initialGroup = editExpense 
    ? (groups.find(g => g._id === (editExpense.group?._id || editExpense.group)) || activeGroup || groups[0])
    : (activeGroup || groups[0]);

  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [members, setMembers] = useState(selectedGroup?.members || []);
  const [split,setSplit] = useState(editExpense?.split_type || "equal");
  const [cat,setCat] = useState(editExpense ? (CATS.find(c=>c.label.toLowerCase() === editExpense.category.toLowerCase())?.label || "Other") : "Rent");
  const [amount,setAmount] = useState(editExpense ? String(editExpense.amount) : "");
  const [title,setTitle] = useState(editExpense?.title || "");
  const [paidBy,setPaidBy] = useState(editExpense?.paid_by?._id || editExpense?.paid_by || "");
  const [date,setDate] = useState(editExpense?.expense_date ? new Date(editExpense.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [selectedMembers,setSelectedMembers] = useState(() => {
    if (editExpense?.splits) {
      return editExpense.splits.map(s => s.user?._id || s.user || s.full_name);
    }
    return selectedGroup?.members?.map(m => m.user?._id || m._id || m.full_name) || [];
  });
  const [newMemberInput,setNewMemberInput] = useState("");
  const [customAmts,setCustomAmts] = useState(()=>{
    const o={};
    if (editExpense?.splits) {
      editExpense.splits.forEach(s => { 
        const id = s.user?._id || s.user || s.full_name;
        o[id] = s.owed_amount; 
      });
    }
    return o;
  });

  useEffect(() => {
    if (selectedGroup && !isEdit) {
      setMembers(selectedGroup.members);
      setSelectedMembers(selectedGroup.members.map(m => m.user?._id || m._id || m.full_name));
      if (!paidBy) setPaidBy(useAuthStore.getState().user?._id);
    }
  }, [selectedGroup, isEdit]);

  const toggleMember = (mId) => {
    if (!mId) return;
    const sId = mId.toString();
    setSelectedMembers(prev => prev.some(x => x?.toString() === sId) ? prev.filter(x=>x?.toString() !== sId) : [...prev, mId]);
  };

  const handleAdd = async () => {
    // 1) Validations
    if (!title.trim()) return toast.error("Please enter an expense title");
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return toast.error("Please enter a valid amount greater than 0");
    if (!selectedGroup) return toast.error("Please select a group");
    if (!selectedMembers || selectedMembers.length === 0) return toast.error("Please select at least one member to split with");
    if (!paidBy) return toast.error("Please select who paid");

    const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id));

    const expData = {
      group_id: selectedGroup._id,
      title: title.trim(),
      amount: parseFloat(amount),
      paid_by: paidBy, 
      category: (cat || "other").toLowerCase(),
      split_type: split || "equal",
      member_ids: selectedMembers.map(mId => {
        if (!mId) return null;
        const m = selectedGroup.members.find(sm => 
          (sm.user?._id || sm._id || sm.full_name || "").toString() === mId.toString()
        );
        return { 
          user: (m?.user?._id || m?.user || (isObjectId(mId) ? mId : null)), 
          full_name: m?.full_name || m?.user?.full_name || (typeof mId === 'string' ? mId : 'Member')
        };
      }).filter(Boolean),
      custom_splits: (split === "custom" || split === "percent")
        ? Object.entries(customAmts).map(([uid, val]) => ({ 
            user_id: uid, 
            amount: split === "custom" ? parseFloat(val || 0) : undefined,
            percent: split === "percent" ? parseFloat(val || 0) : undefined
          }))
        : [],
      expense_date: date || new Date().toISOString().split('T')[0],
    };

    console.log("Saving Expense Payload:", expData);

    try {
      if (isEdit) {
        await updateExpense(editExpense._id, expData);
      } else {
        await addExpense(expData);
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const splitCount = selectedMembers.length || 1;
  const amt = parseFloat(amount) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit?"Edit Expense ✏️":"Add Expense ➕"}</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        {!isEdit && groups.length > 0 && (
          <div className="form-group">
            <label className="form-label">Select Group</label>
            <select className="form-select" value={selectedGroup?._id} onChange={e => {
              const g = groups.find(x => x._id === e.target.value);
              setSelectedGroup(g);
            }}>
              {groups.map(g => <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Category</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {CATS.map(c=>(
              <div key={c.label} onClick={()=>{setCat(c.label);if(!isEdit)setTitle(c.label);}}
                style={{padding:"6px 11px",borderRadius:9,cursor:"pointer",fontSize:12.5,
                  background:cat===c.label?`${c.color}20`:"var(--bg-glass)",
                  border:`1px solid ${cat===c.label?c.color+"55":"var(--border)"}`,
                  color:cat===c.label?c.color:"var(--tx2)",fontWeight:600,
                  display:"flex",alignItems:"center",gap:4,transition:"all .15s"}}>
                {c.icon} {c.label}
              </div>
            ))}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="e.g. BSES Bill" value={title} onChange={e=>setTitle(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" placeholder="0.00" type="number" value={amount} onChange={e=>setAmount(e.target.value)}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Paid By</label>
            <select className="form-select" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              {[...new Set([...members, ...selectedMembers])].map((m, i) => (
                <option key={m?._id || i} value={m?._id || m}>{m?.user?.full_name || m?.full_name || m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Split Type</label>
          <div className="split-toggle">
            {["equal","custom","percent"].map(t=>(
              <button key={t} className={`split-btn${split===t?" active":""}`} onClick={()=>setSplit(t)}>
                {t==="equal"?"⚖️ Equal":t==="custom"?"✏️ Custom":"% Percent"}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Split Between</label>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
            {members.map((m, i) => {
              const mId = m.user?._id || m._id;
              const isSelected = selectedMembers.includes(mId);
              return (
                <div key={mId || i} onClick={() => toggleMember(mId)} style={{
                  padding: "5px 11px", borderRadius: 99, cursor: "pointer", fontSize: 12.5,
                  background: isSelected ? "rgba(181,255,77,0.09)" : "var(--bg-glass)",
                  border: isSelected ? "1px solid rgba(181,255,77,0.22)" : "1px solid var(--border)",
                  color: isSelected ? "var(--lime)" : "var(--tx3)", fontWeight: 600, transition: "all .15s"
                }}>{m.full_name || m.user?.full_name || 'Member'}</div>
              );
            })}
          </div>

          {split==="equal" && parseFloat(amount) > 0 && (
            <div style={{marginTop:4,padding:"9px 13px",borderRadius:9,background:"rgba(181,255,77,0.05)",border:"1px solid rgba(181,255,77,0.12)",fontSize:13,color:"var(--tx2)"}}>
              Each person pays: <strong style={{color:"var(--lime)"}}>₹{(parseFloat(amount)/Math.max(selectedMembers.length, 1)).toFixed(2)}</strong> ({selectedMembers.length} people)
            </div>
          )}

          {split==="custom" && (
            <div style={{marginTop:8}}>
              {selectedMembers.map(mId => {
                const m = members.find(sm => (sm.user?._id || sm._id).toString() === mId.toString());
                return (
                  <div key={mId} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div className="avatar" style={{width:24,height:24,fontSize:10}}>{(m?.full_name || m?.user?.full_name || 'M')[0]}</div>
                    <span style={{flex:1,fontSize:13,fontWeight:600}}>{m?.full_name || m?.user?.full_name || 'Member'}</span>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:12,color:"var(--tx3)"}}>₹</span>
                      <input className="form-input" type="number" placeholder="0" value={customAmts[mId]||""} onChange={e=>setCustomAmts({...customAmts,[mId]:e.target.value})} style={{width:90,padding:"6px 8px",fontSize:13}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:6,padding:"7px 12px",borderRadius:8,fontSize:12,color: Math.abs(Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0) - parseFloat(amount || 0)) < 0.1 ?"#4dff88":"#ff6060",background:"var(--bg-glass)"}}>
                Total: ₹{Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0).toLocaleString()} / ₹{parseFloat(amount || 0).toLocaleString()}
                {Math.abs(Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0) - parseFloat(amount || 0)) < 0.1 ?" ✓":" ✗ doesn't match"}
              </div>
            </div>
          )}

          {split==="percent" && (
            <div style={{marginTop:8}}>
              {selectedMembers.map(mId => {
                const m = members.find(sm => (sm.user?._id || sm._id).toString() === mId.toString());
                return (
                  <div key={mId} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div className="avatar" style={{width:24,height:24,fontSize:10}}>{(m?.full_name || m?.user?.full_name || 'M')[0]}</div>
                    <span style={{flex:1,fontSize:13,fontWeight:600}}>{m?.full_name || m?.user?.full_name || 'Member'}</span>
                    <div style={{display:'flex', alignItems:'center', gap:5}}>
                      <input className="form-input sm" type="number" placeholder="0" value={customAmts[mId] || ""} onChange={e => setCustomAmts({ ...customAmts, [mId]: e.target.value })} style={{width:60, padding:"6px 8px", fontSize:13, textAlign:'right'}}/>
                      <span style={{fontSize:11, color:'var(--tx3)'}}>%</span>
                    </div>
                    <div style={{width:70, textAlign:'right', fontSize:12, color:'var(--tx2)'}}>
                      ₹{((parseFloat(amount||0) * parseFloat(customAmts[mId]||0))/100).toFixed(2)}
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:6,padding:"7px 12px",borderRadius:8,fontSize:12,color: Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0) === 100 ?"#4dff88":"#ff6060",background:"var(--bg-glass)"}}>
                Total: {Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0)}% / 100%
                {Object.values(customAmts).reduce((s,v)=>s+parseFloat(v||0),0) === 100 ?" ✓":" ✗ must be 100%"}
              </div>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <textarea className="form-textarea" placeholder="Any extra details..."/>
        </div>
        <div style={{display:"flex",gap:9}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{flex:1}} onClick={handleAdd}>{isEdit?"Save Changes":"Add Expense"}</button>
        </div>
      </div>
    </div>
  );
}

// ── CREATE GROUP MODAL ──────────────────────────────────────────
function CreateGroupModal({onClose}) {
  const { addGroup } = useGroupStore();
  const [name,setName]=useState("");
  const [emoji,setEmoji]=useState("🏠");
  const [type,setType]=useState("Flatmates");
  const [memberInput,setMemberInput]=useState("");
  const [members,setMembers]=useState(["You"]);
  const colors=["#9b6dff","#3de8d0","#ff5fcb","#ffb830","#b5ff4d","#ff8c42"];
  const [color,setColor]=useState(colors[0]);
  const emojis=["🏠","✈️","🍱","🎉","💼","🏖️","🎓","🏋️","🎮","🛒"];
  const types = ["Flatmates", "Trip", "Hostel", "Office", "Friends", "Family", "Custom"];

  const { searchUsers } = useAuthStore();
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (memberInput.length >= 2) {
        setSearching(true);
        const results = await searchUsers(memberInput);
        setSuggestions(results);
        setSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [memberInput, searchUsers]);

  const addMember = (m) => {
    const name = typeof m === 'string' ? m.trim() : m.full_name;
    const exists = members.some(x => (typeof x === 'string' ? x : x.full_name) === name);
    
    if (name && !exists) {
      if (typeof m === 'string') {
        setMembers([...members, name]); // Guest
      } else {
        setMembers([...members, { user: m._id, full_name: m.full_name, avatar_url: m.avatar_url, type: 'registered' }]);
      }
      setMemberInput("");
      setSuggestions([]);
    }
  };

  const removeMember = (m) => {
    setMembers(members.filter(x => {
      const xId = typeof x === 'string' ? x : (x.user?._id || x.user || x._id);
      const mId = typeof m === 'string' ? m : (m.user?._id || m.user || m._id);
      return xId !== mId;
    }));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await addGroup({
        name: name.trim(),
        emoji,
        type: type.toLowerCase(),
        color,
        members: members.filter(m => m !== "You")
      });
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Create Group ✨</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {emojis.map(e=>(
              <div key={e} onClick={()=>setEmoji(e)} style={{width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",background:emoji===e?"rgba(181,255,77,0.15)":"var(--bg-glass)",border:emoji===e?"1px solid var(--lime)":"1px solid var(--border)",transition:"all .15s"}}>{e}</div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Group Name</label>
          <input className="form-input" placeholder="e.g. Flat 302 Bros" value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={type} onChange={e=>setType(e.target.value)}>
              {types.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{display:"flex",gap:6}}>
              {colors.map(c=>(
                <div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:color===c?"2px solid #fff":"2px solid transparent",transition:"all .15s"}}/>
              ))}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Members</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {members.map((m, i) => {
              const isYou = m === "You";
              const isRegistered = m.type === 'registered';
              const name = typeof m === 'string' ? m : m.full_name;
              
              return (
                <div key={i} style={{ 
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, 
                  background: isRegistered ? "rgba(61,232,208,0.1)" : "rgba(181,255,77,0.08)", 
                  border: isRegistered ? "1px solid rgba(61,232,208,0.3)" : "1px solid rgba(181,255,77,0.2)", 
                  color: isRegistered ? "#3de8d0" : "var(--lime)", fontSize: 12.5, fontWeight: 600 
                }}>
                  <span style={{ fontSize: 10 }}>{isRegistered ? "🟢" : "⚪"}</span>
                  {name}
                  {!isYou && <span onClick={() => removeMember(m)} style={{ cursor: "pointer", marginLeft: 2, opacity: .7, fontSize: 14 }}>✕</span>}
                </div>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="form-input" placeholder="Enter name or email..." value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember(memberInput)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => addMember(memberInput)}>Add</button>
            </div>
            {suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map(u => (
                  <div key={u._id} className="suggestion-item" onClick={() => addMember(u)}>
                    <div className="avatar sm">{(u.full_name || 'U')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>{u.email}</div>
                    </div>
                    <div className="badge-reg">Registered ✓</div>
                  </div>
                ))}
              </div>
            )}
            {searching && <div style={{ position: "absolute", right: 70, top: 12, fontSize: 10, color: "var(--tx3)" }}>Searching...</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:9,marginTop:8}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{flex:1}} onClick={handleCreate}>Create Group</button>
        </div>
      </div>
    </div>
  );
}

// ── EDIT GROUP MODAL ────────────────────────────────────────────
function EditGroupModal({group,onClose,onSave,onDelete}) {
  const [name,setName]=useState(group.name);
  const [emoji,setEmoji]=useState(group.emoji);
  const [type,setType]=useState(group.type);
  const [memberInput,setMemberInput]=useState("");
  const [members,setMembers]=useState([...group.members]);
  const colors=["#9b6dff","#3de8d0","#ff5fcb","#ffb830","#b5ff4d","#ff8c42"];
  const [color,setColor]=useState(group.color);
  const emojis=["🏠","✈️","🍱","🎉","💼","🏖️","🎓","🏋️","🎮","🛒"];
  const types=["Flatmates","Trip","Food","Office","Friends","Family","Custom"];

  const { searchUsers } = useAuthStore();
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (memberInput.length >= 2) {
        setSearching(true);
        const results = await searchUsers(memberInput);
        setSuggestions(results);
        setSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [memberInput, searchUsers]);

  const addMember = (m) => {
    const name = typeof m === 'string' ? m.trim() : m.full_name;
    const exists = members.some(x => (x.full_name || x) === name);
    
    if (name && !exists) {
      if (typeof m === 'string') {
        setMembers([...members, name]); 
      } else {
        setMembers([...members, { user: m._id, full_name: m.full_name, avatar_url: m.avatar_url, type: 'registered' }]);
      }
      setMemberInput("");
      setSuggestions([]);
    }
  };

  const removeMember = (m) => {
    setMembers(members.filter(x => {
      const xId = typeof x === 'string' ? x : (x.user?._id || x.user || x._id);
      const mId = typeof m === 'string' ? m : (m.user?._id || m.user || m._id);
      return xId !== mId;
    }));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanMembers = members.filter(m => m !== "You").map(m => {
      if (typeof m === 'string') return m;
      return { user: m.user || m.id, full_name: m.full_name };
    });
    onSave({ ...group, name: name.trim(), emoji, members: cleanMembers, type: type.toLowerCase(), color });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Group ✏️</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {emojis.map(e=>(
              <div key={e} onClick={()=>setEmoji(e)} style={{width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",background:emoji===e?"rgba(181,255,77,0.15)":"var(--bg-glass)",border:emoji===e?"1px solid var(--lime)":"1px solid var(--border)",transition:"all .15s"}}>{e}</div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Group Name</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={type} onChange={e=>setType(e.target.value)}>
              {types.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{display:"flex",gap:6}}>
              {colors.map(c=>(
                <div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:color===c?"2px solid #fff":"2px solid transparent",transition:"all .15s"}}/>
              ))}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Members</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {members.map((m, i) => {
              const isRegistered = m.type === 'registered' || (m.user && m.user !== null);
              const name = typeof m === 'string' ? m : m.full_name;
              
              return (
                <div key={i} style={{ 
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, 
                  background: isRegistered ? "rgba(61,232,208,0.1)" : "rgba(181,255,77,0.08)", 
                  border: isRegistered ? "1px solid rgba(61,232,208,0.3)" : "1px solid rgba(181,255,77,0.2)", 
                  color: isRegistered ? "#3de8d0" : "var(--lime)", fontSize: 12.5, fontWeight: 600 
                }}>
                  <span style={{ fontSize: 10 }}>{isRegistered ? "🟢" : "⚪"}</span>
                  {name}
                  <span onClick={() => removeMember(m)} style={{ cursor: "pointer", marginLeft: 2, opacity: .7, fontSize: 14 }}>✕</span>
                </div>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="form-input" placeholder="Enter name or email..." value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember(memberInput)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => addMember(memberInput)}>Add</button>
            </div>
            {suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map(u => (
                  <div key={u._id} className="suggestion-item" onClick={() => addMember(u)}>
                    <div className="avatar sm">{(u.full_name || 'U')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>{u.email}</div>
                    </div>
                    <div className="badge-reg">Registered ✓</div>
                  </div>
                ))}
              </div>
            )}
            {searching && <div style={{ position: "absolute", right: 70, top: 12, fontSize: 10, color: "var(--tx3)" }}>Searching...</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={() => { onDelete(group._id); onClose(); }}>🗑️ Delete</button>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ── PAGES ────────────────────────────────────────────────────────
function Landing({ nav }) {
  return (
    <div className="landing-v2">
      <nav className="landing-v2-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div className="logo-mark">S</div>
          <span className="logo-text">Split<span>Buddy</span></span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => nav("login")}>Login</button>
          <button className="btn btn-primary" onClick={() => nav("login")}>Sign Up Free</button>
        </div>
      </nav>

      <section className="landing-v2-hero">
        <div>
          <div className="landing-v2-badge">🇮🇳 India's Smart Expense Splitter</div>
          <h1 className="landing-v2-h1">Manage Group Expenses<br /><span>The Smart Way.</span></h1>
          <p className="landing-v2-sub">Track shared bills, trips, groceries and roommate expenses in one place.</p>
          <div className="landing-v2-cta">
            <button className="btn btn-primary btn-lg" style={{ padding: "14px 24px", fontSize: 15 }} onClick={() => nav("login")}>Get Started Free</button>
            <button className="btn btn-ghost btn-lg" style={{ padding: "14px 24px", fontSize: 15 }} onClick={() => nav("login")}>Login</button>
          </div>
        </div>
        <div className="landing-v2-mockup">
          <div className="landing-v2-mockup-inner">
            <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 24, fontWeight: 700 }}>SplitBuddy Dashboard</div>
            <div style={{ color: "var(--tx2)", fontSize: 14, marginTop: 8 }}>Preview</div>
          </div>
        </div>
      </section>

      <section className="landing-v2-section">
        <h2 className="landing-v2-sec-title">Everything You Need</h2>
        <div className="landing-v2-grid">
          {[
            { icon: "👥", title: "Group Expenses", desc: "Create unlimited groups for flats, trips, or events." },
            { icon: "⚖️", title: "Smart Split", desc: "Split equally, by percentage, or custom amounts effortlessly." },
            { icon: "📈", title: "Expense Tracking", desc: "Real-time logs of every transaction and category breakdown." },
            { icon: "🤝", title: "Settle Up", desc: "Smart debt minimization: we tell you the fewest payments needed." },
            { icon: "📊", title: "Reports", desc: "Beautiful charts to visualize your monthly spending." },
            { icon: "🔔", title: "Notifications", desc: "Instant alerts for new expenses and settlements." },
          ].map((f, i) => (
            <div className="landing-v2-card" key={i}>
              <div className="landing-v2-card-icon">{f.icon}</div>
              <div className="landing-v2-card-title">{f.title}</div>
              <div className="landing-v2-card-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-v2-section">
        <h2 className="landing-v2-sec-title">How It Works</h2>
        <div className="landing-v2-timeline">
          {[
            { step: "1", title: "Create a Group", desc: "Add your friends or roommates to a common space." },
            { step: "2", title: "Add Expenses", desc: "Log any shared cost and choose who participated." },
            { step: "3", title: "Track Balances", desc: "See real-time status of who is 'plus' and who is 'minus'." },
            { step: "4", title: "Settle Dues", desc: "Use UPI to pay back and mark as settled in one click." },
          ].map((s, i) => (
            <div className="landing-v2-step" key={i}>
              <div className="landing-v2-step-num">{s.step}</div>
              <div className="landing-v2-step-info">
                <div className="landing-v2-step-title">{s.title}</div>
                <div className="landing-v2-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-v2-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div className="logo-mark" style={{ width: 28, height: 28, fontSize: 14, borderRadius: 8 }}>S</div>
          <span className="logo-text" style={{ fontSize: 16 }}>Split<span>Buddy</span></span>
        </div>
        <div style={{ fontSize: 13, color: "var(--tx3)" }}>© 2026 SplitBuddy. All rights reserved.</div>
        <div className="landing-v2-footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
}

function Login({ nav }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("login"); // 'login' or 'signup'
  const [name, setName] = useState("");

  const { setAuth } = useAuthStore();

  const handleAuth = async () => {
    setError(null);
    if (!email || !pass || (mode === "signup" && !name)) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await api.auth.login(email, pass);
      } else {
        data = await api.auth.register({ email, password: pass, full_name: name });
      }
      setAuth(data.user, data.token);
      nav("dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div className="logo-mark" style={{ width: 46, height: 46, fontSize: 21, borderRadius: 13 }}>S</div>
          </div>
          <div className="auth-title">{mode === "login" ? "Welcome back 👋" : "Create Account ✨"}</div>
          <div className="auth-sub">{mode === "login" ? "Sign in to SplitBuddy" : "Join SplitBuddy today"}</div>
        </div>

        {error && <div className="tag tag-red" style={{ width: "100%", marginBottom: 16, padding: "10px", borderRadius: "8px", justifyContent: "center" }}>{error}</div>}

        {mode === "signup" && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Abhishek Sharma" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
        </div>

        <button className="btn btn-primary" style={{ width: "100%", padding: 13, fontSize: 14, marginTop: 4 }} onClick={handleAuth} disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--tx2)" }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <span style={{ color: "var(--lime)", cursor: "pointer", fontWeight: 600 }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Create account" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ nav, openModal }) {
  const { allExpenses, fetchAllExpenses, loading: expLoading } = useExpenseStore();
  const { groups, fetchGroups, loading: grpLoading } = useGroupStore();

  useEffect(() => {
    fetchGroups();
    fetchAllExpenses();
  }, [fetchGroups, fetchAllExpenses]);

  const totalThisMonth = allExpenses.reduce((s, e) => s + e.amount, 0);
  const catTotals = allExpenses.reduce((acc, e) => {
    const catLabel = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : "Other";
    acc[catLabel] = (acc[catLabel] || 0) + e.amount;
    return acc;
  }, {});
  const donut = Object.entries(catTotals).map(([l, v]) => {
    const c = CATS.find(cat => cat.label === l)?.color || "#9b6dff";
    return { l, v, c };
  });
  if (donut.length === 0) donut.push({ l: "No data", v: 1, c: "#333" });

  const uniqueMembers = [
    ...new Set(
      groups.flatMap(group =>
        (group.members || []).map(
          member => 
            member.name || 
            member.email || 
            member._id || 
            member.id || 
            member.full_name || 
            member.user?._id || 
            member.user?.email || 
            member.user?.full_name
        )
      )
    )
  ].filter(Boolean);

  const totalMembers = uniqueMembers.length;

  console.log("Groups:", groups);
  console.log("Unique Members:", uniqueMembers);
  console.log("Count:", totalMembers);

  // Statistics
  const user = useAuthStore.getState().user;
  const youOwe = 0; 
  const youGet = 0;
  const fairShare = totalMembers > 0 ? totalThisMonth / totalMembers : 0;

  return (
    <div className="dashboard-v3">
      <div className="stat-grid">
        <div className="stat-card lime">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Total Spending</div>
          <div className="stat-val lime">₹{totalThisMonth.toLocaleString()}</div>
          <div className="stat-meta">{allExpenses.length} expenses total</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Active Groups</div>
          <div className="stat-val violet">{groups.length}</div>
          <div className="stat-meta">Across all spaces</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon">👤</div>
          <div className="stat-label">Total Members</div>
          <div className="stat-val cyan">{totalMembers}</div>
          <div className="stat-meta">Shared with {totalMembers} people</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon">⚖️</div>
          <div className="stat-label">Global Share</div>
          <div className="stat-val pink">₹{fairShare.toFixed(2)}</div>
          <div className="stat-meta">avg per person</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginTop: 20 }}>
        <div className="card">
          <div className="section-header">
            <div className="section-title">🕒 Recent Global Activity</div>
            <span className="section-link" onClick={() => nav("expenses")}>See all →</span>
          </div>
          <div className="expense-list">
            {allExpenses.length === 0 && <div className="empty-state">No expenses yet.</div>}
            {allExpenses.slice(0, 5).map(e => (
              <div className="expense-item" key={e._id}>
                <div className="exp-icon" style={{ background: `${e.color || '#3de8d0'}18` }}>
                  {CATS.find(c => c.label.toLowerCase() === e.category)?.icon || "🎮"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="exp-title">{e.title}</div>
                  <div className="exp-meta">
                    <span style={{ color: 'var(--lime)' }}>{e.group?.name || 'Group'}</span> · Paid by {e.paid_by_name || 'Someone'}
                  </div>
                </div>
                <div className="exp-amt">
                  <div className="exp-total" style={{ color: e.color || 'var(--tx)' }}>₹{e.amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-title">🥧 Spending Split</div>
          </div>
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DonutChart data={donut} />
          </div>
        </div>
      </div>
    </div>
  );
}
function Groups({nav}) {
  const { groups, fetchGroups } = useGroupStore();
  const { allExpenses, fetchAllExpenses } = useExpenseStore();
  const [showCreate,setShowCreate]=useState(false);
  const colorTag = {"#9b6dff":"violet","#3de8d0":"cyan","#ff5fcb":"pink","#ffb830":"amber","#b5ff4d":"lime","#ff8c42":"amber"};

  useEffect(() => {
    fetchGroups();
    fetchAllExpenses();
  }, [fetchGroups, fetchAllExpenses]);

  return (
    <div>
      <div className="group-grid">
        {groups.map(g => {
          const groupTotal = allExpenses
            .filter(e => (e.group?._id || e.group) === g._id)
            .reduce((s, e) => s + e.amount, 0);

          return (
            <div className="group-card" key={g._id} onClick={() => nav("groupdetail", g)}>
              <div className="group-card-head"><span className="group-emoji">{g.emoji}</span><span className={`tag tag-${colorTag[g.color] || "violet"}`}>{g.type}</span></div>
              <div className="group-name">{g.name}</div>
              <div className="group-members">{g.members?.length || 0} members</div>
              <div className="group-stat">
                <div className="group-total" style={{ color: g.color }}>₹{groupTotal.toLocaleString()}</div>
                <div className="member-avatars">{g.members?.slice(0, 4).map((m, i) => <div key={i} className="avatar sm">{(m.full_name || m.user?.full_name || 'U')[0]}</div>)}</div>
              </div>
            </div>
          );
        })}
        <div className="group-card" onClick={()=>setShowCreate(true)} style={{border:"1px dashed var(--border2)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:9,minHeight:155,cursor:"pointer"}}>
          <div style={{fontSize:34,opacity:.35}}>+</div>
          <div style={{color:"var(--tx3)",fontWeight:600,fontSize:13.5}}>Create New Group</div>
        </div>
      </div>
      {showCreate&&<CreateGroupModal onClose={()=>setShowCreate(false)}/>}
    </div>
  );
}
function GroupDetail({ group, nav }) {
  const { expenses, fetchExpenses, removeExpense, settlePlan, balances, fetchSettlePlan, recordSettlement } = useExpenseStore();
  const { updateGroup, removeGroup } = useGroupStore();
  const [showEdit, setShowEdit] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [partialSettle, setPartialSettle] = useState(null);
  const [view, setView] = useState("expenses"); // expenses | balances

  useEffect(() => {
    if (group?._id) {
      fetchExpenses(group._id);
      fetchSettlePlan(group._id);
    }
  }, [group, fetchExpenses, fetchSettlePlan]);

  const g = group || { _id: 0, name: "Unknown", members: [], total_amount: 0, color: "#fff", emoji: "❓", type: "Unknown" };
  const groupExpenses = expenses.filter(e => e.group === g._id || e.group?._id === g._id);
  const groupTotal = groupExpenses.reduce((s, e) => s + e.amount, 0);

  const handleFullSettle = async (s) => {
    if (!window.confirm(`Settle full ₹${s.amount} from ${s.from_name} to ${s.to_name}?`)) return;
    try {
      await recordSettlement({
        group_id: g._id,
        from_id: s.from_id,
        from_name: s.from_name,
        to_id: s.to_id,
        to_name: s.to_name,
        amount: s.amount
      });
      fetchSettlePlan(g._id);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="card" style={{marginBottom:18,background:`linear-gradient(135deg,${g.color}18,var(--bg-card))`}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
          <span style={{fontSize:42}}>{g.emoji}</span>
          <div><div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:800}}>{g.name}</div><div style={{color:"var(--tx2)",fontSize:13}}>{g.members.length} members · {g.type}</div></div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{textAlign:"right"}}>
              <div style={{color:"var(--tx3)",fontSize:12}}>Total Spend</div>
              <div style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:800,color:g.color}}>₹{groupTotal.toLocaleString()}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={(e)=>{e.stopPropagation();setShowEdit(true);}}>✏️</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(() => {
            const totalExpense = (groupExpenses || []).reduce((sum, e) => sum + (e?.amount || 0), 0);
            const members = (g?.members || []);
            const share = members.length > 0 ? (totalExpense / members.length) : 0;
            
            console.log("Recalculating Frontend Balances:", { totalExpense, memberCount: members.length, share });

            return members.map((m, i) => {
              const userId = (m?.user?._id || m?.user || m?._id)?.toString?.() || "";
              const userName = m?.full_name || m?.user?.full_name || 'User';
              
              // Calculate paid amount for this member from the current expense list ONLY
              const paidAmount = (groupExpenses || [])
                .filter(e => (e?.paid_by?.toString?.() === userId) || (e?.paid_by_name === userName) || (e?.paid_by?.toString?.() === userId))
                .reduce((sum, e) => sum + (e?.amount || 0), 0);
              
              const balance = paidAmount - share;
              const color = balance > 0.01 ? "var(--lime)" : balance < -0.01 ? "var(--pink)" : "var(--tx3)";
              
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 99, background: "var(--bg-glass)", border: `1px solid ${Math.abs(balance) > 0.01 ? color : 'var(--border)'}`, fontSize: 12.5 }}>
                    <div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{userName?.[0] || "U"}</div>{userName}
                  </div>
                  <div style={{ fontSize: 9, textAlign: "center", color, fontWeight: 700 }}>
                    {balance > 0.01 ? `gets ₹${balance.toFixed(2)}` : balance < -0.01 ? `owes ₹${Math.abs(balance).toFixed(2)}` : 'settled'}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        <div className={`tab ${view === 'expenses' ? 'active' : ''}`} onClick={() => setView('expenses')}>Expenses</div>
        <div className={`tab ${view === 'balances' ? 'active' : ''}`} onClick={() => setView('balances')}>Balances & Settlements</div>
      </div>

      {view === "expenses" ? (
        <>
          {groupExpenses.length === 0 && <div style={{color:"var(--tx3)", fontSize: 13, padding: "20px 0", textAlign: "center"}}>No expenses in this group yet. Add one using the button above!</div>}
          {groupExpenses.map(e => (
            <div className="expense-item" key={e._id}>
              <div className="exp-icon" style={{ background: `${e.color || '#3de8d0'}18` }}>{CATS.find(c => c.label.toLowerCase() === e.category)?.icon || "🎮"}</div>
              <div style={{ flex: 1 }}><div className="exp-title">{e.title}</div><div className="exp-meta">Paid by {e.paid_by_name || 'Someone'} · {new Date(e.expense_date).toLocaleDateString()}</div></div>
              <div className="exp-amt"><div className="exp-total" style={{ color: e.color || 'var(--tx)' }}>₹{e.amount.toLocaleString()}</div><div className="exp-split">÷{g.members?.length || 1} = ₹{(e.amount / (g.members?.length || 1)).toFixed(2)}</div></div>
              <div onClick={() => setEditExp(e)} style={{ cursor: "pointer", fontSize: 14, color: "var(--tx3)", padding: "4px 6px" }} title="Edit">✏️</div>
              <div onClick={() => { if(window.confirm("Delete this expense?")) removeExpense(e._id); }} style={{ cursor: "pointer", fontSize: 14, color: "var(--tx3)", padding: "4px 6px" }} title="Delete">🗑️</div>
            </div>
          ))}
        </>
      ) : (
        <div className="two-col">
          <div className="card">
            <div className="section-title" style={{ marginBottom: 15 }}>Member Balances</div>
            {balances.map(b => (
              <div key={b.id || b.full_name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar sm">{(b.full_name || 'U')[0]}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.full_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: b.net_balance > 0 ? "var(--lime)" : b.net_balance < 0 ? "var(--pink)" : "var(--tx3)" }}>
                    {b.net_balance > 0 ? `+₹${b.net_balance.toLocaleString()}` : b.net_balance < 0 ? `-₹${Math.abs(b.net_balance).toLocaleString()}` : "Settled"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--tx3)" }}>{b.net_balance > 0 ? "gets back" : b.net_balance < 0 ? "owes total" : "clean slate"}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 15 }}>Who pays whom</div>
            {settlePlan.length === 0 && <div style={{ color: "var(--tx3)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>All settled! No payments pending. 🎉</div>}
            {settlePlan.map((s, i) => (
              <div key={i} className="settle-item" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", padding: 14, borderRadius: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div className="avatar sm">{(s.from_name || 'U')[0]}</div>
                  <div style={{ fontSize: 13 }}><strong>{s.from_name}</strong> → <strong>{s.to_name}</strong></div>
                  <div className="avatar sm" style={{ marginLeft: "auto" }}>{(s.to_name || 'U')[0]}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 800, color: "var(--lime)" }}>₹{s.amount.toLocaleString()}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setPartialSettle(s)}>Partial</button>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => handleFullSettle(s)}>Settle Full</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEdit && <EditGroupModal group={g} onClose={() => setShowEdit(false)} onSave={(updated) => { updateGroup(updated._id, updated); nav("groups"); }} onDelete={(id) => { removeGroup(id); nav("groups"); }} />}
      {editExp&&<AddExpenseModal onClose={()=>setEditExp(null)} editExpense={editExp}/>}
      {partialSettle && (
        <PartialSettleModal 
          s={partialSettle} 
          groupId={g._id} 
          onClose={() => setPartialSettle(null)} 
          onRefresh={() => fetchSettlePlan(g._id)} 
        />
      )}
    </div>
  );
}
function Expenses() {
  const { allExpenses, fetchAllExpenses, removeExpense } = useExpenseStore();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editExp, setEditExp] = useState(null);

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  // Combined Filtering & Searching
  const filtered = allExpenses
    .filter(e => {
      // 1. Category Filter
      const categoryMatch = filter === "all" || e.category?.toLowerCase() === filter.toLowerCase();
      
      // 2. Search Filter (Title, Group, or Payer)
      const s = search.toLowerCase();
      const searchMatch = !search || 
        e.title?.toLowerCase().includes(s) || 
        (e.group?.name || "").toLowerCase().includes(s) || 
        (e.paid_by_name || "").toLowerCase().includes(s);

      return categoryMatch && searchMatch;
    })
    .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, padding: 15 }}>
        <div className="form-row" style={{ alignItems: "center" }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input 
              className="form-input" 
              placeholder="Search by title, group, or member..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 12 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1.5 }}>
            {["all", "Rent", "Electricity", "Wifi", "Food", "Grocery"].map(t => (
              <div 
                key={t} 
                className={`tag ${filter === t.toLowerCase() ? "tag-lime" : ""}`} 
                onClick={() => setFilter(t.toLowerCase())}
                style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ color: "var(--tx3)", fontSize: 14, padding: "40px 0", textAlign: "center", border: "1px dashed var(--border)" }}>
          {search ? `No expenses found matching "${search}"` : "No expenses found. Click '+ Add Expense' to start tracking!"}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map(e => (
          <div className="expense-item" key={e._id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <div className="exp-icon" style={{ background: `${e.color || '#3de8d0'}18` }}>
              {CATS.find(c => c.label.toLowerCase() === e.category)?.icon || "🎮"}
            </div>
            <div style={{ flex: 1 }}>
              <div className="exp-title">{e.title}</div>
              <div className="exp-meta">
                <span style={{ color: "var(--lime)", fontWeight: 600 }}>{e.group?.name || "Group"}</span> · 
                Paid by <strong style={{ color: "var(--tx)" }}>{e.paid_by_name || "User"}</strong> · 
                {new Date(e.expense_date).toLocaleDateString()}
              </div>
            </div>
            <div className="exp-amt" style={{ textAlign: "right" }}>
              <div className="exp-total" style={{ color: e.color || 'var(--tx)', fontSize: 17, fontWeight: 800 }}>₹{e.amount.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: "var(--tx3)" }}>{e.split_type || "equal"} split</div>
            </div>
            <div style={{ display: "flex", gap: 4, marginLeft: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditExp(e)} title="Edit">✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={() => removeExpense(e._id)} style={{ color: "var(--pink)" }} title="Delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
      {editExp && <AddExpenseModal onClose={() => setEditExp(null)} editExpense={editExp} />}
    </div>
  );
}
function PartialSettleModal({ s, groupId, onClose, onRefresh }) {
  const [amount, setAmount] = useState(s.amount);
  const { recordSettlement, loading } = useExpenseStore();

  const handleSettle = async () => {
    if (!amount || amount <= 0) return toast.error("Enter valid amount");
    if (amount > s.amount) return toast.error(`Settlement amount (₹${amount}) cannot exceed debt (₹${s.amount})`);
    
    try {
      await recordSettlement({
        group_id: groupId === 'all' ? undefined : groupId,
        from_id: s.from_id,
        from_name: s.from_name,
        to_id: s.to_id,
        to_name: s.to_name,
        amount: parseFloat(amount)
      });
      onRefresh();
      onClose();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Partial Settlement</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 8 }}>Settling payment from <strong>{s.from_name}</strong> to <strong>{s.to_name}</strong></div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--lime)' }}>Total Debt: ₹{s.amount.toLocaleString()}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Amount to Settle</label>
          <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSettle} style={{ flex: 1 }} disabled={loading}>
            {loading ? "Settle..." : `Settle ₹${amount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Settle({ group }) {
  const { groups } = useGroupStore();
  const { settlePlan, settleHistory, fetchSettlePlan, fetchSettlementHistory, recordSettlement, loading } = useExpenseStore();
  const [selectedGroupId, setSelectedGroupId] = useState(group?._id || 'all');
  const [tab, setTab] = useState('pending');
  const [partialSettle, setPartialSettle] = useState(null);

  useEffect(() => {
    fetchSettlePlan(selectedGroupId);
    fetchSettlementHistory(selectedGroupId);
  }, [selectedGroupId, fetchSettlePlan, fetchSettlementHistory]);

  const handleMarkPaid = async (s) => {
    if (!window.confirm(`Settle full ₹${s.amount} payment from ${s.from_name} to ${s.to_name}?`)) return;
    try {
      await recordSettlement({
        group_id: selectedGroupId === 'all' ? undefined : selectedGroupId,
        from_id: s.from_id,
        from_name: s.from_name,
        to_id: s.to_id,
        to_name: s.to_name,
        amount: s.amount
      });
      fetchSettlePlan(selectedGroupId);
      fetchSettlementHistory(selectedGroupId);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="form-row" style={{marginBottom:18}}>
        <div className="form-group" style={{flex:1}}>
          <label className="form-label">Select Group</label>
          <select className="form-select" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="all">All Groups (Combined)</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="tabs" style={{marginBottom:20}}>
        <div className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending</div>
        <div className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>History</div>
      </div>

      {tab === 'pending' ? (
        <>
          <div className="card" style={{marginBottom:18,background:"linear-gradient(135deg,rgba(77,255,136,.07),var(--bg-card))"}}>
             <div style={{textAlign:"center",padding:"8px 0"}}>
               <div style={{fontSize:38,marginBottom:8}}>🎯</div>
               <div style={{fontFamily:"var(--fd)",fontSize:19,fontWeight:700,marginBottom:5}}>Smart Settlement Plan</div>
               <div style={{color:"var(--tx2)",fontSize:13}}>{settlePlan.length>0?`${settlePlan.length} payment${settlePlan.length>1?"s":""} to settle everything!`:"All settled! No pending payments."}</div>
             </div>
          </div>
          {settlePlan.map((s,i)=>{
            const hasHistory = settleHistory.some(h => (h.from_user?._id === s.from_id || h.from_name === s.from_name) && (h.to_user?._id === s.to_id || h.to_name === s.to_name));
            return (
              <div className="settle-item" key={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 60 }}>
                  <div className="avatar">{s.from_avatar ? <img src={s.from_avatar} style={{width:'100%',borderRadius:'50%'}} /> : (s.from_name || 'U')[0]}</div>
                  <div style={{ fontSize: 10, marginTop: 4, color: "var(--tx3)", textAlign:'center', overflow:'hidden', width:'100%' }}>{s.from_name}</div>
                </div>
                <span className="settle-arrow">→</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 11, color: "var(--tx3)", textTransform:'uppercase', fontWeight:700 }}>owes</div>
                    <span className={`tag ${s.status === 'pending' ? 'tag-orange' : 'tag-blue'}`}>{s.status === 'pending' ? 'Pending' : 'Completed'}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color:'var(--tx)' }}>{s.to_name}</div>
                  {s.to_upi && <div style={{fontSize:10, color:'var(--cyan)', marginTop:2}}>UPI: {s.to_upi}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="settle-amt">₹{s.amount.toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setPartialSettle(s)} style={{ padding: '4px 8px' }}>Partial</button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleMarkPaid(s)}>Settle Full</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="history-list">
          {settleHistory.length === 0 && <div style={{textAlign:'center', color:'var(--tx3)', padding:'40px 0'}}>No settlement history yet.</div>}
          {settleHistory.map(h => (
            <div className="settle-item" key={h._id} style={{opacity:0.85, border:'1px solid var(--border)'}}>
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 60 }}>
                <div className="avatar sm">{(h.from_name || 'U')[0]}</div>
              </div>
              <div style={{flex:1, fontSize:13}}>
                <span style={{fontWeight:600}}>{h.from_name}</span> paid <span style={{fontWeight:600}}>{h.to_name}</span>
                <div style={{fontSize:11, color:'var(--tx3)', marginTop:2}}>{new Date(h.settled_at).toLocaleDateString()} · {h.method}</div>
              </div>
              <div style={{textAlign:'right', display:'flex', alignItems:'center', gap: 12}}>
                <div>
                  <div style={{fontSize:15, fontWeight:700, color:'var(--lime)'}}>₹{h.amount.toLocaleString()}</div>
                  <div className="tag tag-green" style={{fontSize:9}}>Completed</div>
                </div>
                <button className="btn-del" onClick={() => removeSettlement(h._id, selectedGroupId)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {partialSettle && (
        <PartialSettleModal 
          s={partialSettle} 
          groupId={selectedGroupId} 
          onClose={() => setPartialSettle(null)} 
          onRefresh={() => {
            fetchSettlePlan(selectedGroupId);
            fetchSettlementHistory(selectedGroupId);
          }} 
        />
      )}
    </div>
  );
}
function Reports() {
  const { allExpenses, fetchAllExpenses, settleHistory, fetchSettlementHistory, expenses } = useExpenseStore();
  const { groups } = useGroupStore();
  
  const [groupId, setGroupId] = useState('all');
  const [timeRange, setTimeRange] = useState('month'); 
  
  const getDateRange = (range) => {
    const now = new Date();
    let from = new Date();
    from.setHours(0,0,0,0);
    switch(range) {
      case 'today': break;
      case 'week': from.setDate(now.getDate() - 7); break;
      case 'month': from.setMonth(now.getMonth() - 1); break;
      case 'last_month': 
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from, to };
      case 'year': from.setFullYear(now.getFullYear() - 1); break;
      case 'all': return { from: null, to: null };
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
  }, [groupId, timeRange, fetchAllExpenses, fetchSettlementHistory, expenses.length]);

  const stats = useMemo(() => {
    const total = allExpenses.reduce((s, e) => s + e.amount, 0);
    const count = allExpenses.length;
    
    const cats = {};
    allExpenses.forEach(e => {
      const l = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : "Other";
      cats[l] = (cats[l] || 0) + e.amount;
    });
    const donutData = Object.entries(cats).map(([l, v]) => ({ l, v, c: CATS.find(c => c.label === l)?.color || "#9b6dff" }));
    
    const members = {};
    allExpenses.forEach(e => {
      const name = e.paid_by_name || e.paid_by?.full_name || "Member";
      members[name] = (members[name] || 0) + e.amount;
    });
    const barData = Object.entries(members).sort((a,b) => b[1] - a[1]);
    
    const trend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = d.toLocaleString('default', { month: 'short' });
      const mVal = allExpenses.filter(e => {
        const ed = new Date(e.expense_date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).reduce((s, e) => s + e.amount, 0);
      trend.push({ m: mLabel, v: mVal });
    }

    const highestCat = donutData.length > 0 ? donutData.sort((a,b) => b.v - a.v)[0] : null;
    
    // Calculate most active based on count
    const activityCounts = {};
    allExpenses.forEach(e => {
      const name = e.paid_by_name || e.paid_by?.full_name || "Member";
      activityCounts[name] = (activityCounts[name] || 0) + 1;
    });
    const countsData = Object.entries(activityCounts).sort((a,b) => b[1] - a[1]);
    const mostActive = countsData.length > 0 ? countsData[0][0] : "N/A";
    
    const avgSpend = count > 0 ? total / count : 0;
    
    // Group and Date-specific settlement logic
    const { from, to } = getDateRange(timeRange);
    const totalSettled = settleHistory
      .filter(h => {
        const matchGroup = groupId === 'all' || (h.group?._id || h.group) === groupId;
        if (!matchGroup) return false;
        if (!from) return true;
        const hd = new Date(h.settled_at);
        return hd >= from && hd <= to;
      })
      .reduce((s, h) => s + h.amount, 0);

    const safeSettled = Math.min(totalSettled, total);
    
    return { total, count, donutData, barData, trend, highestCat, mostActive, avgSpend, totalSettled, safeSettled };
  }, [allExpenses, settleHistory, groupId, timeRange]);

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
      summary: { total: stats.total, count: stats.count },
      expenses: allExpenses 
    }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `splitbuddy_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Report exported as JSON! 📥");
  };

  return (
    <div className="reports-view">
      <div className="reports-header">
        <h2 className="topbar-title">Reports & Analytics 📈</h2>
        <div className="reports-filters">
          <select className="form-select" style={{width: 150}} value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="all">All Groups</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>)}
          </select>
          <select className="form-select" style={{width: 140}} value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportData}>📥 Export</button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-stat-card">
          <div className="report-stat-label">Total Expenses</div>
          <div className="report-stat-val" style={{color:'var(--lime)'}}>₹{stats.total.toLocaleString()}</div>
          <div className="report-stat-meta">{stats.count} expenses tracked</div>
        </div>
        <div className="report-stat-card">
          <div className="report-stat-label">Average per Expense</div>
          <div className="report-stat-val" style={{color:'var(--cyan)'}}>₹{Math.round(stats.avgSpend).toLocaleString()}</div>
          <div className="report-stat-meta">Based on current filter</div>
        </div>
        <div className="report-stat-card">
          <div className="report-stat-label">Total Settled</div>
          <div className="report-stat-val" style={{color:'var(--violet)'}}>₹{stats.totalSettled.toLocaleString()}</div>
          <div className="report-stat-meta">Payments recorded</div>
        </div>
        <div className="report-stat-card">
          <div className="report-stat-label">Highest Category</div>
          <div className="report-stat-val" style={{color:'var(--pink)'}}>{stats.highestCat?.l || "N/A"}</div>
          <div className="report-stat-meta">₹{stats.highestCat?.v.toLocaleString() || 0} spent</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-title">Category Distribution 🥧</div>
          {stats.donutData.length > 0 ? <DonutChart data={stats.donutData}/> : <div style={{height: 160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tx3)'}}>No data available</div>}
        </div>
        <div className="chart-card">
          <div className="chart-title">Spending Trend (Monthly) 📈</div>
          <TrendChart data={stats.trend} />
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
            {stats.trend.map(d => <span key={d.m} style={{fontSize: 10, color:'var(--tx3)'}}>{d.m}</span>)}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{marginBottom: 18}}>
        <div className="chart-title">
          <span>Individual Contribution 👤</span>
          <span style={{fontSize: 11, color:'var(--tx3)'}}>Top Spenders</span>
        </div>
        {stats.barData.length === 0 && <div style={{textAlign:'center', color:'var(--tx3)', padding:'20px 0'}}>No spending data for this period.</div>}
        <div className="bar-chart-v">
          {stats.barData.map(([name, val], i) => (
            <div className="bar-row" key={name}>
              <div className="bar-label">{name}</div>
              <div className="bar-track">
                <div className="bar-fill-v" style={{ 
                  width: `${(val / (stats.barData[0][1] || 1)) * 100}%`, 
                  background: `linear-gradient(90deg, ${i % 2 === 0 ? 'var(--violet)' : 'var(--lime)'}, transparent)` 
                }} />
              </div>
              <div className="bar-val">₹{val.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="card" style={{background:'rgba(255,255,255,0.02)'}}>
        <div className="section-title" style={{fontSize: 14, marginBottom: 12}}>Advanced Insights 🔍</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap: 14}}>
          <div>
            <div style={{fontSize: 11, color:'var(--tx3)', textTransform:'uppercase', marginBottom: 4}}>Most Active Member</div>
            <div style={{fontSize: 15, fontWeight: 700}}>{stats.mostActive}</div>
          </div>
          <div>
            <div style={{fontSize: 11, color:'var(--tx3)', textTransform:'uppercase', marginBottom: 4}}>Settlement Ratio</div>
            <div style={{fontSize: 15, fontWeight: 700}}>{stats.total > 0 ? Math.round((stats.safeSettled / stats.total) * 100) : 0}% settled</div>
          </div>
          <div>
            <div style={{fontSize: 11, color:'var(--tx3)', textTransform:'uppercase', marginBottom: 4}}>Pending Collections</div>
            <div style={{fontSize: 15, fontWeight: 700, color:'var(--amber)'}}>₹{Math.max(0, stats.total - stats.totalSettled).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartBudget({ group, expenses }) {
  const { updateGroup } = useGroupStore();
  const [showEdit, setShowEdit] = useState(false);
  const [newBudget, setNewBudget] = useState(group.monthly_budget || 0);
  
  const budget = group.monthly_budget || 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  
  const spent = expenses
    .filter(e => {
      const d = new Date(e.expense_date);
      const gid = e.group?._id || e.group;
      return gid === group._id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  const remaining = Math.max(0, budget - spent);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = pct > 90 ? "#ff4d4d" : pct > 70 ? "var(--amber)" : "var(--lime)";
  
  const dailyAllowance = remaining > 0 ? Math.round(remaining / (daysInMonth - currentDay + 1)) : 0;
  const projected = Math.round((spent / currentDay) * daysInMonth);

  const handleSave = async () => {
    await updateGroup(group._id, { monthly_budget: parseFloat(newBudget) });
    setShowEdit(false);
    toast.success("Budget updated!");
  };

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">📈 Smart Budget</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
      </div>
      <div className="util-card-content">
        {showEdit ? (
          <div style={{ marginTop: 10 }}>
            <input className="form-input" type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: 'var(--tx3)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Remaining</div>
              <div className="fd" style={{ fontSize: 36, fontWeight: 800, color: 'var(--lime)' }}>₹{remaining.toLocaleString()}</div>
            </div>

            <div className="prog-track" style={{ height: 10, background: 'rgba(255,255,255,0.05)', marginBottom: 25 }}>
              <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
            </div>

            <div className="budget-metric-grid">
              <div className="budget-metric-card">
                <div className="util-stat-label">Monthly Budget</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>₹{budget.toLocaleString()}</div>
              </div>
              <div className="budget-metric-card">
                <div className="util-stat-label">Spent So Far</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>₹{spent.toLocaleString()}</div>
              </div>
              <div className="budget-metric-card">
                <div className="util-stat-label">Daily Left</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>₹{dailyAllowance}/day</div>
              </div>
              <div className="budget-metric-card">
                <div className="util-stat-label">Projected (EST)</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>₹{projected.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="util-card-footer">
        {projected > budget ? 
          <div style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 700 }}>⚠ You are on track to exceed budget by ₹{Math.round(projected - budget).toLocaleString()}</div> :
          <div style={{ color: "var(--lime)", fontSize: 12, fontWeight: 700 }}>✅ You are within budget limits. Great job!</div>
        }
      </div>
    </div>
  );
}

function ActivityFeed({ gid }) {
  const { activities, fetchActivities } = useExpenseStore();

  useEffect(() => {
    if (gid) fetchActivities(gid);
  }, [gid, fetchActivities]);

  const getTimeAgo = (d) => {
    const diff = new Date() - new Date(d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString();
  };

  const getIcon = (type) => {
    switch(type) {
      case 'expense': return '💰';
      case 'settle': return '🤝';
      case 'grocery': return '🛒';
      case 'chore': return '🧹';
      case 'reminder': return '🔔';
      case 'note': return '📝';
      default: return '📝';
    }
  };

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">🕒 Room Activity</div>
      </div>
      <div className="util-card-content">
        {activities.length === 0 && <div className="empty-state">No activity yet.</div>}
        {activities.map((a, i) => (
          <div key={i} className="activity-item">
            <div className="activity-icon">{getIcon(a.type)}</div>
            <div style={{ flex: 1 }}>
              <div className="activity-desc">
                <strong>{a.user_name || 'Member'}</strong> {a.action} {a.type} {a.item_name && <strong>“{a.item_name}”</strong>}
              </div>
              <div className="activity-time">{getTimeAgo(a.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reminders({ gid }) {
  const { reminders, fetchReminders, addReminder, toggleReminder, deleteReminder, updateReminder } = useExpenseStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [pri, setPri] = useState("medium");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => { if (gid) fetchReminders(gid); }, [gid, fetchReminders]);

  const handleAdd = async () => {
    if (!title || !date) return;
    await addReminder({ group_id: gid, title, due_date: date, priority: pri });
    setTitle(""); setDate("");
  };

  const filtered = reminders.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">🔔 Smart Reminders</div>
        <span className="tag tag-violet">{reminders.filter(r=>!r.is_completed).length} Pending</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <input className="form-input sm" placeholder="Search reminders..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="util-card-content">
        {filtered.length === 0 && <div className="empty-state">All caught up!</div>}
        {filtered.map(r => (
          <div key={r._id} className={`rem-item ${r.is_completed ? 'completed' : ''}`}>
            <div className="rem-check" onClick={() => toggleReminder(r._id)}>{r.is_completed ? '✓' : ''}</div>
            <div className="rem-content">
              {editingId === r._id ? (
                <div style={{ display: 'flex', gap: 5 }}>
                  <input className="form-input sm" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus />
                  <button className="btn btn-primary btn-sm" onClick={async () => { await updateReminder(r._id, { title: editVal }); setEditingId(null); }}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div className="rem-title" onClick={() => { setEditingId(r._id); setEditVal(r.title); }}>{r.title}</div>
                  <div className="rem-meta">
                    {Math.max(0, Math.round((new Date(r.due_date) - new Date()) / 86400000))} days left
                  </div>
                </>
              )}
            </div>
            <button className="btn-del" onClick={() => deleteReminder(r._id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input sm" placeholder="Task..." value={title} onChange={e=>setTitle(e.target.value)} style={{ flex: 1 }} />
          <input className="form-input sm" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width: 110 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+</button>
        </div>
      </div>
    </div>
  );
}

function GroceryList({ gid }) {
  const { activeGroup } = useGroupStore();
  const { groceries, fetchGroceries, addGrocery, toggleGrocery, deleteGrocery } = useExpenseStore();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [est, setEst] = useState("");
  const [cat, setCat] = useState("Other");
  const [search, setSearch] = useState("");

  useEffect(() => { if (gid) fetchGroceries(gid); }, [gid, fetchGroceries]);

  const handleAdd = async () => {
    if (!name) return;
    await addGrocery({ group_id: gid, name, quantity: qty, estimated_price: parseFloat(est) || 0, category: cat });
    setName(""); setQty(""); setEst("");
  };

  const filtered = groceries.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const totalEst = filtered.reduce((s, g) => s + (g.estimated_price || 0), 0);
  const boughtCount = filtered.filter(g => g.is_checked).length;

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">🛒 Grocery List</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="tag tag-green">{boughtCount} Bought</span>
          <span className="tag tag-cyan">₹{totalEst.toLocaleString()} Est</span>
          <span className="tag tag-violet">₹{(activeGroup?.monthly_budget - totalEst).toLocaleString()} Left</span>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <input className="form-input sm" placeholder="Search items..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="util-card-content">
        {filtered.length === 0 && <div className="empty-state">Fridge is empty.</div>}
        {filtered.map(g => (
          <div key={g._id} className={`rem-item ${g.is_checked ? 'completed' : ''}`}>
            <div className="rem-check" onClick={() => toggleGrocery(g._id)}>{g.is_checked ? '✓' : ''}</div>
            <div style={{ flex: 1 }}>
              <div className="rem-title">{g.name} <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{g.quantity && `(${g.quantity})`}</span></div>
              <div className="rem-meta">{g.category} · ₹{g.estimated_price} est</div>
            </div>
            <button className="btn-del" onClick={() => deleteGrocery(g._id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input className="form-input sm" placeholder="Item name..." value={name} onChange={e=>setName(e.target.value)} style={{ flex: 2 }} />
          <input className="form-input sm" placeholder="Qty" value={qty} onChange={e=>setQty(e.target.value)} style={{ width: 70 }} />
          <div className="curr-wrapper" style={{ width: 90 }}>
            <span className="curr-symbol">₹</span>
            <input className="form-input sm curr-input" placeholder="Price" type="number" value={est} onChange={e=>setEst(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} style={{ width: 44 }}>+</button>
        </div>
      </div>
    </div>
  );
}

function ChoreManager({ gid, members }) {
  const { chores, fetchChores, addChore, updateChore, deleteChore, rotateChores } = useExpenseStore();
  const [name, setName] = useState("");
  const [who, setWho] = useState(members[0]?.user?._id || members[0]?.id || "");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => { if (gid) fetchChores(gid); }, [gid, fetchChores]);

  const handleAdd = async () => {
    if (!name || !who) return toast.error("Please fill chore name and assignee");
    await addChore({ group_id: gid, name, assigned_to: who, due_date: dueDate });
    setName(""); setDueDate("");
    toast.success("Chore assigned!");
  };

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">🧹 Advanced Chores</div>
        <button className="btn btn-ghost btn-sm" onClick={() => rotateChores(gid)}>Rotate ⟳</button>
      </div>
      <div className="util-card-content">
        {chores.length === 0 && <div className="empty-state">No chores assigned.</div>}
        {chores.map(c => (
          <div key={c._id} className="activity-item">
            <div className="activity-icon">🧹</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                Assigned: <strong style={{ color: 'var(--tx)' }}>{c.assigned_name}</strong> 
                {c.due_date && <span style={{ marginLeft: 8 }}>· Due: {new Date(c.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <select 
              className="form-select sm" 
              value={c.status} 
              onChange={e => updateChore(c._id, { status: e.target.value })} 
              style={{ width: 100, fontSize: 11 }}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">Active</option>
              <option value="done">Done</option>
            </select>
            <button className="btn-del" onClick={() => deleteChore(c._id)} style={{ marginLeft: 8 }}>✕</button>
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input className="form-input sm" placeholder="Task name..." value={name} onChange={e=>setName(e.target.value)} style={{ flex: 1.5 }} />
          <select className="form-select sm" value={who} onChange={e=>setWho(e.target.value)} style={{ width: 110 }}>
            {members.map(m => <option key={m.user?._id || m.id} value={m.user?._id || m.id}>{m.full_name || m.user?.full_name}</option>)}
          </select>
          <input className="form-input sm" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{ width: 120 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+</button>
        </div>
      </div>
    </div>
  );
}

function PaymentTracker({ gid }) {
  const { payments, fetchPayments, addPayment, updatePayment, deletePayment } = useExpenseStore();
  const [title, setTitle] = useState("");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => { if (gid) fetchPayments(gid); }, [gid, fetchPayments]);

  const handleAdd = async () => {
    const payload = {
      title: title?.trim() || "",
      amount: Number(amt) || 0,
      due_date: date || null,
      group_id: gid
    };

    if (!payload.title || payload.amount <= 0 || !payload.due_date) {
      return toast.error("Please fill all fields for Payment Due");
    }

    try {
      await addPayment(payload);
      setTitle(""); 
      setAmt(""); 
      setDate("");
      toast.success("Payment due added!");
      // The store should clear the error, but we can also do it here if needed.
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to add payment due");
    }
  };

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">💸 Payment Dues</div>
        <span className="tag tag-amber">{payments.filter(p=>p.status!=='paid').length} Bills</span>
      </div>
      <div className="util-card-content">
        {payments.length === 0 && <div className="empty-state">No bills tracked.</div>}
        {payments.map(p => (
          <div key={p._id} className="activity-item" style={{ alignItems: 'center' }}>
            <div className="activity-icon">📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Due: {new Date(p.due_date).toLocaleDateString()}</div>
            </div>
            <div style={{ textAlign: 'right', marginRight: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--lime)' }}>₹{p.amount.toLocaleString()}</div>
              <div className={`tag tag-${p.status==='paid'?'green': (new Date(p.due_date) < new Date() ? 'pink' : 'amber')}`} style={{ fontSize: 10 }}>
                {p.status}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {p.status !== 'paid' && <button className="btn btn-ghost btn-sm" onClick={() => updatePayment(p._id, { status: 'paid' })}>✓</button>}
              <button className="btn-del" onClick={() => deletePayment(p._id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input className="form-input sm" placeholder="Bill title..." value={title} onChange={e=>setTitle(e.target.value)} style={{ flex: 1.5 }} />
          <div className="curr-wrapper" style={{ width: 100 }}>
            <span className="curr-symbol">₹</span>
            <input className="form-input sm curr-input" placeholder="Amount" type="number" value={amt} onChange={e=>setAmt(e.target.value)} />
          </div>
          <input className="form-input sm" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width: 120 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+</button>
        </div>
      </div>
    </div>
  );
}

function SharedLinks({ gid }) {
  const { links, fetchLinks, addLink, deleteLink } = useExpenseStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => { if (gid) fetchLinks(gid); }, [gid, fetchLinks]);

  const handleAdd = async () => {
    if (!title || !url) return;
    await addLink({ group_id: gid, title, url });
    setTitle(""); setUrl("");
  };

  const getFavicon = (u) => {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(u).hostname}&sz=32`; }
    catch(e) { return '🔗'; }
  };

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">🔗 Shared Links</div>
      </div>
      <div className="util-card-content">
        {links.length === 0 && <div className="empty-state">No links shared.</div>}
        {links.map(l => (
          <div key={l._id} className="activity-item" style={{ alignItems: 'center' }}>
            <div className="activity-icon">
              {l.url.startsWith('http') ? <img src={getFavicon(l.url)} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} /> : '🔗'}
            </div>
            <div style={{ flex: 1 }}>
              <div className="activity-desc" style={{ fontWeight: 600, color: 'var(--tx)', cursor: 'pointer' }} onClick={() => window.open(l.url, '_blank')}>{l.title}</div>
              <div className="activity-time" style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(l.url); toast.success("Copied!"); }}>Copy URL 📋</div>
            </div>
            <button className="btn-del" onClick={() => deleteLink(l._id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input sm" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{ flex: 1 }} />
          <input className="form-input sm" placeholder="URL..." value={url} onChange={e=>setUrl(e.target.value)} style={{ flex: 2 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+</button>
        </div>
      </div>
    </div>
  );
}

function RoomNotes({ gid }) {
  const { notes, fetchNotes, addNote, updateNote, deleteNote } = useExpenseStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  useEffect(() => { if (gid) fetchNotes(gid); }, [gid, fetchNotes]);

  const handleAdd = async () => {
    if (!title || !body) return;
    await addNote({ group_id: gid, title, body });
    setTitle(""); setBody("");
  };

  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card util-card-v2">
      <div className="util-card-header">
        <div className="util-card-title">📌 Shared Notes</div>
        <input className="form-input sm" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width: 120 }} />
      </div>
      <div className="util-card-content">
        {filtered.length === 0 && <div className="empty-state">No notes found.</div>}
        {filtered.map(n => (
          <div key={n._id} className="card-sm" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', marginBottom: 12 }}>
            {editingId === n._id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="form-input sm" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                <textarea className="form-input sm" value={editBody} onChange={e => setEditBody(e.target.value)} />
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-primary btn-sm" onClick={async () => { await updateNote(n._id, { title: editTitle, body: editBody }); setEditingId(null); }}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✕</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditingId(n._id); setEditTitle(n.title); setEditBody(n.body); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                    <button onClick={() => deleteNote(n._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d' }}>✕</button>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginBottom: 8 }}>{n.body}</div>
                <div style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 700 }}>by {n.author} · {new Date(n.created_at).toLocaleDateString()}</div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="util-card-footer">
        <input className="form-input sm" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom: 6 }} />
        <textarea className="form-input sm" placeholder="Content..." value={body} onChange={e=>setBody(e.target.value)} style={{ height: 60, marginBottom: 6 }} />
        <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handleAdd}>Add Note</button>
      </div>
    </div>
  );
}


function Utilities() {
  const { groups, activeGroup, setActiveGroup } = useGroupStore();
  const { expenses, fetchExpenses } = useExpenseStore();

  useEffect(() => {
    if (!activeGroup && groups.length > 0) setActiveGroup(groups[0]);
  }, [activeGroup, groups, setActiveGroup]);

  useEffect(() => {
    if (activeGroup?._id) fetchExpenses(activeGroup._id);
  }, [activeGroup?._id, fetchExpenses]);

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = "0 0 30px var(--lime)";
      el.style.borderColor = "var(--lime)";
      setTimeout(() => {
        el.style.boxShadow = "";
        el.style.borderColor = "";
      }, 2000);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🏠</div>
        <h2 className="fd" style={{ fontSize: 28, marginBottom: 10 }}>No Groups Found</h2>
        <p style={{ color: "var(--tx3)", fontSize: 15 }}>Create or join a group to start using room utilities.</p>
      </div>
    );
  }

  return (
    <div className="util-dashboard">
      <div className="util-header-v2" style={{ marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <h1 className="fd" style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Room Utilities</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <select 
                className="form-select" 
                value={activeGroup?._id || ""} 
                onChange={e => setActiveGroup(groups.find(g => g._id === e.target.value))}
                style={{ 
                  height: 48, 
                  fontSize: 16, 
                  paddingLeft: 16, 
                  paddingRight: 40,
                  fontWeight: 600,
                  background: 'var(--bg-card)',
                  borderRadius: 16
                }}
              >
                {groups.map(g => <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>)}
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--tx3)' }}>▼</div>
            </div>
            {activeGroup && <div className="tag tag-lime" style={{ padding: '8px 16px', fontSize: 14, borderRadius: 12 }}>{activeGroup.members?.length || 0} Members</div>}
          </div>
        </div>
        <div className="util-stat-row">
          <div className="util-stat-pill">
            <span className="util-stat-label">Group Spend</span>
            <span className="util-stat-val">₹{(expenses.filter(e => (e.group?._id || e.group) === activeGroup?._id).reduce((s, e) => s + e.amount, 0)).toLocaleString()}</span>
          </div>
          <div className="util-stat-pill">
            <span className="util-stat-label">Budget Health</span>
            <span className="util-stat-val" style={{ color: 'var(--cyan)' }}>Good</span>
          </div>
        </div>
      </div>

      {activeGroup ? (
        <div className="utilities-grid">
          {/* ROW 1 */}
          <div id="budget-card" className="util-card-v2"><SmartBudget group={activeGroup} expenses={expenses} /></div>
          <div id="activity-card" className="util-card-v2"><ActivityFeed gid={activeGroup._id} /></div>
          <div id="reminder-card" className="util-card-v2"><Reminders gid={activeGroup._id} /></div>

          {/* ROW 2 */}
          <div id="payment-card" className="util-card-v2"><PaymentTracker gid={activeGroup._id} /></div>
          <div id="grocery-card" className="util-card-v2"><GroceryList gid={activeGroup._id} /></div>
          <div id="chore-card" className="util-card-v2"><ChoreManager gid={activeGroup._id} members={activeGroup.members} /></div>

          {/* ROW 3 */}
          <div id="link-card" className="util-card-v2"><SharedLinks gid={activeGroup._id} /></div>
          <div id="note-card" className="util-card-v2"><RoomNotes gid={activeGroup._id} /></div>
          <div className="util-card-v2 card"><QuickActionHub onNavigate={handleScrollTo} /></div>
        </div>
      ) : (
        <div className="empty-state" style={{ height: 400 }}>Initializing hub...</div>
      )}

    </div>
  );
}

function QuickActionHub({ onNavigate }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="util-card-header">
        <div className="util-card-title">⚡ Quick Actions</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
        {[
          { id: 'budget', icon: '📈', label: 'Budget' },
          { id: 'activity', icon: '🕒', label: 'Activity' },
          { id: 'reminder', icon: '🔔', label: 'Reminders' },
          { id: 'payment', icon: '💳', label: 'Payments' },
          { id: 'grocery', icon: '🛒', label: 'Groceries' },
          { id: 'chore', icon: '🧹', label: 'Chores' },
          { id: 'link', icon: '🔗', label: 'Links' },
          { id: 'note', icon: '📌', label: 'Notes' }
        ].map(a => (
          <button 
            key={a.id} 
            className="btn btn-ghost" 
            style={{ flexDirection: 'column', height: 'auto', padding: '15px 5px', gap: 5 }}
            onClick={() => onNavigate(`${a.id}-card`)}
          >
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AIAssistant() {
  return (
    <div className="card" style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:48,marginBottom:16}}>🤖</div>
      <div className="section-title">AI Assistant is currently disabled.</div>
      <div style={{color:"var(--tx3)",marginTop:8}}>We've removed external AI APIs to keep the app strictly MongoDB-based.</div>
    </div>
  );
}
function Settings({ nav }) {
  const { user, updateProfile } = useAuthStore();
  const { groups } = useGroupStore();
  const { allExpenses } = useExpenseStore();
  
  const totalAmount = allExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const formattedAmount = totalAmount >= 1000 ? `₹${(totalAmount / 1000).toFixed(1)}K` : `₹${totalAmount.toLocaleString()}`;

  console.log("Groups:", groups.length);
  console.log("Expenses:", allExpenses.length);
  console.log("Tracked:", totalAmount);

  const [userName, setUserName] = useState(user?.full_name || "User");
  const [userEmail, setUserEmail] = useState(user?.email || "user@example.com");
  const [upiId, setUpiId] = useState(user?.upi_id || "");
  const [editProfile, setEditProfile] = useState(false);
  const [editUpi, setEditUpi] = useState(false);
  const [darkMode, setDarkMode] = useState(user?.settings?.dark_mode ?? true);
  const [notifOn, setNotifOn] = useState(user?.settings?.notify_push ?? true);
  const [lang, setLang] = useState(user?.settings?.lang || "English");
  const [currency, setCurrency] = useState(user?.settings?.currency || "₹ INR");

  const saveProfile = async () => {
    try {
      await updateProfile({ full_name: userName, upi_id: upiId });
      setEditProfile(false);
    } catch (err) { toast.error(err.message); }
  };

  const saveUpi = async () => {
    try {
      await updateProfile({ upi_id: upiId });
      setEditUpi(false);
    } catch (err) { toast.error(err.message); }
  };

  const togglePref = async (key, val) => {
    try {
      await updateProfile({ [key]: val });
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="profile-banner">
        <div className="avatar lg">{userName[0]?.toUpperCase()}</div>
        <div style={{flex:1}}>
          {editProfile ? (<div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input className="form-input" value={userName} onChange={e => setUserName(e.target.value)} style={{ padding: "7px 10px", maxWidth: 220 }} />
            <input className="form-input" value={userEmail} disabled style={{ padding: "7px 10px", maxWidth: 280, opacity: 0.7 }} />
            <button className="btn btn-sm btn-primary" style={{ width: "fit-content" }} onClick={saveProfile}>Save</button>
          </div>) : (<>
            <div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:700}}>{userName}</div>
            <div style={{fontSize:13,color:"var(--tx3)"}}>@{userName.toLowerCase().replace(/\s/g,"")} · {userEmail}</div>
            <div style={{display:"flex",gap:18,marginTop:10}}>
              {[
                [String(groups.length), "Groups"],
                [formattedAmount, "Tracked"],
                [String(allExpenses.length), "Expenses"]
              ].map(([v,l])=>(
                <div key={l}><div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700}}>{v}</div><div style={{fontSize:11,color:"var(--tx3)"}}>{l}</div></div>
              ))}
            </div>
          </>)}
        </div>
        <button className="btn btn-ghost btn-sm" style={{alignSelf:"flex-start"}} onClick={()=>setEditProfile(!editProfile)}>{editProfile?"Cancel":"Edit"}</button>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:10.5,fontWeight:700,color:"var(--tx3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:11}}>Preferences</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
          <span style={{ fontSize: 17, width: 26 }}>🌙</span><span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Dark Mode</span>
          <div onClick={() => { setDarkMode(!darkMode); togglePref('dark_mode', !darkMode); }} style={{ width: 38, height: 21, borderRadius: 99, background: darkMode ? "var(--lime)" : "var(--bg-glass)", border: darkMode ? "none" : "1px solid var(--border)", position: "relative", cursor: "pointer", transition: "all .2s" }}>
            <div style={{ width: 17, height: 17, borderRadius: 50, background: darkMode ? "#000" : "var(--tx3)", position: "absolute", top: 2, right: darkMode ? 2 : "auto", left: darkMode ? "auto" : 2, transition: "all .2s" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
          <span style={{ fontSize: 17, width: 26 }}>🔔</span><span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Notifications</span>
          <div onClick={() => { setNotifOn(!notifOn); togglePref('notify_push', !notifOn); }} style={{ width: 38, height: 21, borderRadius: 99, background: notifOn ? "var(--lime)" : "var(--bg-glass)", border: notifOn ? "none" : "1px solid var(--border)", position: "relative", cursor: "pointer", transition: "all .2s" }}>
            <div style={{ width: 17, height: 17, borderRadius: 50, background: notifOn ? "#000" : "var(--tx3)", position: "absolute", top: 2, right: notifOn ? 2 : "auto", left: notifOn ? "auto" : 2, transition: "all .2s" }} />
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:17,width:26}}>🌐</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>Language</span>
          <select className="form-select" value={lang} onChange={e=>setLang(e.target.value)} style={{width:130,padding:"5px 8px",fontSize:12}}>
            <option>English</option><option>Hindi</option><option>English / Hindi</option>
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0"}}>
          <span style={{fontSize:17,width:26}}>💱</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>Currency</span>
          <select className="form-select" value={currency} onChange={e=>setCurrency(e.target.value)} style={{width:130,padding:"5px 8px",fontSize:12}}>
            <option>₹ INR</option><option>$ USD</option><option>€ EUR</option><option>£ GBP</option>
          </select>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:10.5,fontWeight:700,color:"var(--tx3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:11}}>Payment</div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:17,width:26}}>💳</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>UPI ID</span>
          {editUpi ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input className="form-input" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" style={{ width: 140, padding: "5px 8px", fontSize: 12 }} />
              <button className="btn btn-sm btn-primary" onClick={saveUpi}>Save</button>
            </div>
          ) : (
            <span onClick={()=>setEditUpi(true)} style={{fontSize:12.5,color:upiId?"var(--tx2)":"var(--lime)",cursor:"pointer"}}>{upiId||"Add UPI ›"}</span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0"}}>
          <span style={{fontSize:17,width:26}}>🏦</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>Bank Account</span>
          <span style={{fontSize:12.5,color:"var(--tx3)"}}>Coming soon ›</span>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:10.5,fontWeight:700,color:"var(--tx3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:11}}>Account</div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}}>
          <span style={{fontSize:17,width:26}}>🔒</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>Change Password</span>
          <span style={{fontSize:12.5,color:"var(--tx3)"}}>›</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}}>
          <span style={{fontSize:17,width:26}}>📤</span><span style={{flex:1,fontSize:13.5,fontWeight:500}}>Export All Data</span>
          <span style={{fontSize:12.5,color:"var(--tx3)"}}>›</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",cursor:"pointer"}}>
          <span style={{fontSize:17,width:26}}>🗑️</span><span style={{flex:1,fontSize:13.5,fontWeight:500,color:"#ff6060"}}>Delete Account</span>
          <span style={{fontSize:12.5,color:"var(--tx3)"}}>›</span>
        </div>
      </div>
      <button className="btn btn-danger" style={{width:"100%"}} onClick={()=>nav("landing")}>Sign Out</button>
    </div>
  );
}
// ── NAV CONFIG ──────────────────────────────────────────────────
const NAV_ITEMS = [
  {id:"dashboard",lbl:"Dashboard",icon:"📊"},
  {id:"groups",lbl:"Groups",icon:"👥"},
  {id:"expenses",lbl:"Expenses",icon:"💸"},
  {id:"settle",lbl:"Settle Up",icon:"✅"},
  {id:"reports",lbl:"Reports",icon:"📈"},
  {id:"utilities",lbl:"Utilities",icon:"🏠"},
  {id:"settings",lbl:"Settings",icon:"⚙️"},
];
const PAGE_TITLES = {dashboard:"Dashboard",groups:"My Groups",groupdetail:"Group Detail",expenses:"All Expenses",settle:"Settle Up",reports:"Reports & Analytics",utilities:"Room Utilities",ai:"AI Assistant",settings:"Settings"};


function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, deleteNotification } = useUIStore();
  
  const getIcon = (type) => {
    switch(type) {
      case 'expense': return '💰';
      case 'settle': return '🤝';
      case 'grocery': return '🛒';
      case 'chore': return '🧹';
      case 'reminder': return '🔔';
      case 'budget': return '📈';
      default: return '📢';
    }
  };

  const getTimeAgo = (d) => {
    const diff = new Date() - new Date(d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <div className="notif-title">🔔 Notifications {unreadCount > 0 && <span style={{color:'var(--lime)', fontSize:14}}>({unreadCount})</span>}</div>
        <div style={{display:'flex', gap:10}}>
          <button className="btn btn-ghost btn-sm" onClick={markAllAsRead} style={{fontSize:11}}>Mark all read</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <div style={{fontSize:40, marginBottom:15}}>✨</div>
            <div style={{fontWeight:700, fontSize:15}}>No notifications yet</div>
            <div style={{fontSize:12, color:'var(--tx3)', marginTop:5}}>When things happen in your groups, you'll see them here.</div>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n._id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markAsRead(n._id)}>
              <div className="notif-icon">{getIcon(n.type)}</div>
              <div className="notif-content">
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-body">{n.body}</div>
                <div className="notif-item-time">{getTimeAgo(n.created_at)}</div>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{padding:5, height:24, width:24, minWidth:24}}
                onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
              >✕</button>
            </div>
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="notif-footer">
          <button className="btn btn-ghost btn-sm" style={{width:'100%', color:'#ff6060'}} onClick={clearAll}>Clear all notifications</button>
        </div>
      )}
    </div>
  );
}

export default function SplitBuddy() {
  const [page, setPage] = useState("landing");
  const [groupData, setGroupData] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  
  const { isAuth, user, setAuth } = useAuthStore();
  const { fetchGroups, activeGroup } = useGroupStore();
  const { expenses } = useExpenseStore();
  const { unreadCount, fetchNotifications } = useUIStore();

  const nav = (p, data, replace = false) => {
    if (replace) {
      window.history.replaceState({ page: p, data }, "", "");
    } else {
      window.history.pushState({ page: p, data }, "", "");
    }
    setPage(p);
    if (data) setGroupData(data);
  };


  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.page) {
        setPage(e.state.page);
        if (e.state.data) setGroupData(e.state.data);
      } else {
        setPage(isAuth ? "dashboard" : "landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    
    // Set initial state
    if (!window.history.state) {
      window.history.replaceState({ page: isAuth ? "dashboard" : "landing" }, "", "");
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuth]);

  useEffect(() => {
    if (isAuth) {
      fetchGroups();
      fetchNotifications();
      nav("dashboard", null, true);
    } else {
      nav("landing", null, true);
    }
  }, [isAuth, fetchGroups, fetchNotifications]);

  const handleQuickAction = (type) => {
    if (type === 'expense') return setShowAdd(true);
    const el = document.getElementById(`${type}-card`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = "0 0 20px var(--lime)";
      setTimeout(() => el.style.boxShadow = "", 1500);
    }
  };

  const renderPage=()=>{
    switch(page){
      case "landing": return <Landing nav={nav}/>;
      case "login": return <Login nav={nav}/>;
      case "dashboard": return <Dashboard nav={nav} openModal={()=>setShowAdd(true)}/>;
      case "groups": return <Groups nav={nav}/>;
      case "groupdetail": return <GroupDetail group={groupData} nav={nav}/>;
      case "expenses": return <Expenses/>;
      case "settle": return <Settle/>;
      case "reports": return <Reports/>;
      case "utilities": return <Utilities/>;
      case "ai": return <AIAssistant/>;
      case "settings": return <Settings nav={nav}/>;
      default: return <Dashboard nav={nav}/>;
    }
  };

  if (!isAuth || page === "landing" || page === "login") return <>
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    {renderPage()}
    {showAdd&&<AddExpenseModal onClose={()=>setShowAdd(false)}/>}
  </>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <aside className="sidebar">
          <div className="sb-logo"><div className="logo-mark">S</div><span className="logo-text">Split<span>Buddy</span></span></div>
          <div className="nav-sec">
            <div className="nav-label">Main</div>
            {NAV_ITEMS.slice(0,4).map(n=>(
              <div key={n.id} className={`nav-item${page===n.id?" active":""}`} onClick={()=>nav(n.id)}>
                <span className="nav-icon">{n.icon}</span>{n.lbl}
                {n.id==="settle"&&expenses.length>0&&<span className="badge" style={{marginLeft:"auto"}}>{expenses.length}</span>}
              </div>
            ))}
          </div>
          <div className="nav-sec">
            <div className="nav-label">Tools</div>
            {NAV_ITEMS.slice(4).map(n=>(
              <div key={n.id} className={`nav-item${page===n.id?" active":""}`} onClick={()=>nav(n.id)}>
                <span className="nav-icon">{n.icon}</span>{n.lbl}
              </div>
            ))}
          </div>
          <div className="sb-bottom">
            <div className="user-pill" onClick={() => nav("settings")}>
              <div className="avatar">{(user?.full_name || "User")[0]?.toUpperCase()}</div>
              <div><div className="user-name">{user?.full_name || "User"}</div><div className="user-role">{user?.role || "Admin"}</div></div>
              <span style={{ color: "var(--tx3)", fontSize: 11, marginLeft: "auto" }}>⚙</span>
            </div>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[page]||"SplitBuddy"}</div>
            <div className="topbar-actions">
              {["dashboard","expenses","groups","groupdetail"].includes(page)&&<button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Expense</button>}
              <div className="notif-trigger">
                <button 
                  className={`btn btn-ghost ${showNotifs ? 'active' : ''}`} 
                  onClick={() => setShowNotifs(!showNotifs)}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '12px', 
                    fontSize: '20px',
                    minWidth: '44px',
                    height: '44px',
                    background: showNotifs ? 'rgba(77,255,136,0.1)' : 'transparent'
                  }}
                >
                  🔔
                </button>
                {unreadCount > 0 && <span className="notif-badge" style={{ top: '2px', right: '2px' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </div>
            </div>
          </div>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
          <div className="content">{renderPage()}</div>
        </main>
        <nav className="mob-nav">
          {NAV_ITEMS.slice(0,5).map(n=>(
            <div key={n.id} className={`mob-item${page===n.id?" active":""}`} onClick={()=>nav(n.id)}>
              <span className="micon">{n.icon}</span>{n.lbl}
            </div>
          ))}
        </nav>
        <button className="fab" onClick={()=>setShowAdd(true)}>+</button>
      </div>
      {showAdd&&<AddExpenseModal onClose={()=>setShowAdd(false)}/>}
    </>
  );
}
