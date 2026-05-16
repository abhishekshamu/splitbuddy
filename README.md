# 💸 SplitBuddy

> **The smartest expense splitting app for Indian bachelors, roommates & hostel students.**
> No more awkward money conversations.

![SplitBuddy Banner](https://placehold.co/1200x400/0a0a0f/b5ff4d?text=SplitBuddy+%E2%80%94+Split+Bills.+Not+Friendships.)

---

## ✨ Features

| Feature | Description |
|---|---|
| 👥 **Group Management** | Create private groups with invite codes/links |
| 💸 **Smart Split Engine** | Equal, custom, percent, or share-based splits |
| 🧮 **Debt Minimizer** | Minimize transactions using optimal algorithm |
| ✅ **Settle Up** | UPI screenshot upload, payment confirmation |
| 📊 **Rich Dashboard** | Donut charts, bar trends, balance overview |
| 🤖 **BuddyAI** | Claude-powered spending tips & summaries |
| 🛒 **Grocery List** | Shared checklist with real-time sync |
| 🔄 **Chore Rotation** | Auto-rotate cleaning/dishwashing duties |
| 🔔 **Reminders** | Rent, electricity, gas due-date alerts |
| 📌 **Room Notes** | WiFi passwords, landlord contacts, rules |
| 📈 **Reports** | PDF/Excel export, monthly trends |
| 🌐 **Hindi + English** | Regional language AI responses |

---

## 🏗️ Architecture

```
splitbuddy/
├── backend/                    # Node.js + Express API
│   ├── server.js               # Entry point
│   ├── config/
│   │   ├── database.js         # Supabase + pg pool
│   │   └── schema.sql          # Full PostgreSQL schema
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   └── errorHandler.js     # Global error handler
│   ├── routes/
│   │   ├── auth.js             # Register, login, OTP, Google
│   │   ├── groups.js           # CRUD + invite + join
│   │   ├── expenses.js         # CRUD + smart split engine
│   │   ├── settle.js           # Payments + confirmation
│   │   ├── reports.js          # Analytics queries
│   │   ├── utilities.js        # Grocery, chores, notes
│   │   ├── ai.js               # Claude AI integration
│   │   └── members.js          # User search
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Next.js 14 + React
│   ├── src/
│   │   ├── lib/api.js          # Typed API client
│   │   └── store/index.js      # Zustand state management
│   ├── SplitBuddy.jsx          # Complete UI (all pages)
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml          # Full local dev stack
```

---

## 🗄️ Database Schema

```
users           — profiles, preferences, UPI ID
groups          — rooms/trips/hostels with invite codes
group_members   — role-based membership (admin/member)
expenses        — all bills with category & receipt URL
expense_splits  — per-user owed amounts (equal/custom/%)
settlements     — payment records with UPI ref + screenshots
grocery_items   — shared checklist per group
chores          — rotation assignments per group
reminders       — rent/bill due-date alerts
room_notes      — WiFi password, landlord contacts etc.
notifications   — in-app notification feed
```

**Views:**
- `vw_balances` — net balance per user per group
- `vw_monthly_spend` — monthly category breakdown

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional)
- Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/yourname/splitbuddy.git
cd splitbuddy

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, ANTHROPIC_API_KEY
```

### 3. Initialize Database

```bash
# If using Supabase: paste schema.sql into Supabase SQL editor and run
# Or directly:
psql $DATABASE_URL -f backend/config/schema.sql
```

### 4. Start Development

```bash
# Option A: Docker Compose (recommended)
docker-compose up

# Option B: Manual
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

App runs at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Health**: http://localhost:5000/health

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register       — Email + password signup
POST /api/auth/login          — Email login → session
POST /api/auth/otp/send       — Send SMS OTP (phone)
POST /api/auth/otp/verify     — Verify OTP → session
POST /api/auth/google         — Google OAuth
GET  /api/auth/me             — Current user profile
PATCH /api/auth/me            — Update profile/preferences
```

### Groups
```
GET    /api/groups                         — List my groups
POST   /api/groups                         — Create group
GET    /api/groups/:id                     — Group detail + members
PATCH  /api/groups/:id                     — Update group
DELETE /api/groups/:id                     — Archive group
POST   /api/groups/:id/invite              — Regenerate invite link
POST   /api/groups/join/:code              — Join via invite code
DELETE /api/groups/:id/leave               — Leave group
GET    /api/groups/:id/members             — List members + balances
```

### Expenses
```
GET    /api/expenses/group/:id             — List expenses (paginated, filtered)
GET    /api/expenses/group/:id/settle-plan — Smart settlement plan
POST   /api/expenses                       — Add expense (auto-splits)
GET    /api/expenses/:id                   — Expense detail
PATCH  /api/expenses/:id                   — Edit expense
DELETE /api/expenses/:id                   — Soft delete
```

### Settlements
```
POST   /api/settle                         — Record payment
GET    /api/settle/group/:id               — Group history
PATCH  /api/settle/:id/confirm             — Confirm (receiver)
PATCH  /api/settle/:id/dispute             — Dispute payment
GET    /api/settle/user/history            — My payment history
```

### AI
```
POST   /api/ai/chat                        — BuddyAI conversation
GET    /api/ai/summary/:group_id           — Monthly AI summary
GET    /api/ai/tips/:group_id              — Personalized saving tips
GET    /api/ai/anomalies/:group_id         — Unusual spending detection
```

### Utilities
```
GET/POST/PATCH/DELETE  /api/utility/grocery/*   — Grocery list
GET/POST/PATCH         /api/utility/chores/*    — Chore rotation
GET/POST/DELETE        /api/utility/reminders/* — Bill reminders
GET/POST/PATCH/DELETE  /api/utility/notes/*     — Room notes
GET/PATCH              /api/utility/notifications — In-app alerts
```

---

## 🧮 Smart Split Algorithm

SplitBuddy uses a **greedy debt minimization** algorithm:

```
Input:  net balances for all group members
Output: minimum set of transactions to settle all debts

Steps:
1. Separate creditors (net > 0) and debtors (net < 0)
2. Match largest creditor with largest debtor
3. Transfer min(credit, debt) — one pointer advances
4. Repeat until all balanced

Example (5 members → 3 payments instead of 10):
  Dev → Aryan:  ₹4,200
  Rahul → Priya: ₹2,100
  Sneha → Aryan: ₹1,800
```

---

## ☁️ Deployment

### Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
# Set env: NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
```

### Railway (Backend)
```bash
# Connect GitHub repo, set root to /backend
# Add environment variables from .env.example
```

### Supabase (Database)
1. Create project at supabase.com
2. Run `schema.sql` in SQL editor
3. Copy connection strings to `.env`

---

## 🛣️ Roadmap

- [ ] Voice expense entry (Hindi/English)
- [ ] Nearby roommate finder
- [ ] Rent agreement PDF storage
- [ ] Razorpay payment links
- [ ] WhatsApp integration for dues
- [ ] Offline mode (PWA)
- [ ] React Native mobile app

---

## 📄 License

MIT © 2025 SplitBuddy

---

*Built with ❤️ for Indian roommates. BhaiKhata pe khata saaf karo! 🇮🇳*
