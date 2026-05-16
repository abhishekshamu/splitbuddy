-- ============================================================
--  SplitBuddy – Full Database Schema (PostgreSQL / Supabase)
--  Run once against your database to initialise everything.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUM types ────────────────────────────────────────────────────
CREATE TYPE split_type      AS ENUM ('equal', 'custom', 'percent', 'share');
CREATE TYPE expense_category AS ENUM (
  'rent', 'electricity', 'wifi', 'grocery', 'food',
  'gas', 'cleaning', 'water', 'travel', 'entertainment', 'other'
);
CREATE TYPE settle_status    AS ENUM ('pending', 'confirmed', 'disputed');
CREATE TYPE chore_status     AS ENUM ('pending', 'done', 'skipped');
CREATE TYPE reminder_type    AS ENUM ('rent', 'electricity', 'gas', 'custom');

-- ================================================================
--  USERS
-- ================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT UNIQUE,
  full_name     TEXT NOT NULL,
  username      TEXT UNIQUE,
  avatar_url    TEXT,
  upi_id        TEXT,
  -- Supabase Auth links
  auth_id       UUID UNIQUE,                  -- maps to auth.users.id
  google_id     TEXT UNIQUE,
  -- Preferences
  lang          TEXT    NOT NULL DEFAULT 'en', -- 'en' | 'hi'
  currency      TEXT    NOT NULL DEFAULT 'INR',
  notify_push   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_email  BOOLEAN NOT NULL DEFAULT TRUE,
  dark_mode     BOOLEAN NOT NULL DEFAULT TRUE,
  -- Meta
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  GROUPS
-- ================================================================
CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  emoji         TEXT NOT NULL DEFAULT '🏠',
  type          TEXT NOT NULL DEFAULT 'flatmates', -- flatmates | trip | hostel | office | custom
  invite_code   TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  monthly_budget NUMERIC(12,2),
  currency      TEXT NOT NULL DEFAULT 'INR',
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  GROUP MEMBERS
-- ================================================================
CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',       -- 'admin' | 'member'
  nickname   TEXT,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (group_id, user_id)
);

-- ================================================================
--  EXPENSES
-- ================================================================
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
  paid_by       UUID NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  description   TEXT,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category      expense_category NOT NULL DEFAULT 'other',
  split_type    split_type NOT NULL DEFAULT 'equal',
  receipt_url   TEXT,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  EXPENSE SPLITS  (who owes what for each expense)
-- ================================================================
CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  owed_amount NUMERIC(12,2) NOT NULL CHECK (owed_amount >= 0),
  percent     NUMERIC(5,2),      -- filled when split_type = 'percent'
  shares      INTEGER,           -- filled when split_type = 'share'
  is_settled  BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at  TIMESTAMPTZ,
  UNIQUE (expense_id, user_id)
);

-- ================================================================
--  SETTLEMENTS  (payment transactions between two members)
-- ================================================================
CREATE TABLE settlements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user      UUID NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  to_user        UUID NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method         TEXT DEFAULT 'upi',  -- 'upi' | 'cash' | 'bank'
  upi_ref        TEXT,
  screenshot_url TEXT,
  status         settle_status NOT NULL DEFAULT 'pending',
  note           TEXT,
  settled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  GROCERY LIST
-- ================================================================
CREATE TABLE grocery_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  added_by    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    TEXT,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by  UUID REFERENCES users(id),
  checked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  CHORES
-- ================================================================
CREATE TABLE chores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🧹',
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date    DATE,
  status      chore_status NOT NULL DEFAULT 'pending',
  recurrence  TEXT DEFAULT 'weekly',  -- 'daily' | 'weekly' | 'custom'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  REMINDERS
-- ================================================================
CREATE TABLE reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  type          reminder_type NOT NULL DEFAULT 'custom',
  title         TEXT NOT NULL,
  amount        NUMERIC(12,2),
  due_day       INTEGER CHECK (due_day BETWEEN 1 AND 31),  -- day of month
  due_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  ROOM NOTES
-- ================================================================
CREATE TABLE room_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  NOTIFICATIONS
-- ================================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- 'expense_added' | 'settled' | 'reminder' | 'chore' etc.
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  INDEXES
-- ================================================================
CREATE INDEX idx_group_members_group   ON group_members(group_id);
CREATE INDEX idx_group_members_user    ON group_members(user_id);
CREATE INDEX idx_expenses_group        ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by      ON expenses(paid_by);
CREATE INDEX idx_expenses_date         ON expenses(expense_date DESC);
CREATE INDEX idx_expense_splits_exp    ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user   ON expense_splits(user_id);
CREATE INDEX idx_settlements_group     ON settlements(group_id);
CREATE INDEX idx_settlements_from      ON settlements(from_user);
CREATE INDEX idx_settlements_to        ON settlements(to_user);
CREATE INDEX idx_grocery_group         ON grocery_items(group_id);
CREATE INDEX idx_chores_group          ON chores(group_id);
CREATE INDEX idx_notifications_user    ON notifications(user_id, is_read);

-- ================================================================
--  UPDATED_AT trigger
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at       BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_groups_updated_at      BEFORE UPDATE ON groups          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at    BEFORE UPDATE ON expenses        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chores_updated_at      BEFORE UPDATE ON chores          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated_at       BEFORE UPDATE ON room_notes      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
--  ROW LEVEL SECURITY (Supabase)
-- ================================================================
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profile
CREATE POLICY "users_self" ON users FOR ALL USING (auth.uid() = auth_id);

-- Group members can see their groups
CREATE POLICY "group_member_select" ON groups FOR SELECT
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())));
CREATE POLICY "group_member_insert" ON groups FOR INSERT WITH CHECK (TRUE);

-- Members can see fellow member records
CREATE POLICY "gm_select" ON group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members gm2 JOIN users u ON u.id = gm2.user_id WHERE u.auth_id = auth.uid()));

-- Expenses visible to group members
CREATE POLICY "expense_select" ON expenses FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE u.auth_id = auth.uid()));
CREATE POLICY "expense_insert" ON expenses FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "expense_update" ON expenses FOR UPDATE
  USING (created_by = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Notifications only for owner
CREATE POLICY "notif_owner" ON notifications FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- ================================================================
--  HELPER VIEWS
-- ================================================================

-- net balance per user per group
CREATE OR REPLACE VIEW vw_balances AS
SELECT
  gm.group_id,
  gm.user_id,
  COALESCE(paid.total, 0)   AS total_paid,
  COALESCE(owed.total, 0)   AS total_owed,
  COALESCE(paid.total, 0) - COALESCE(owed.total, 0) AS net_balance
FROM group_members gm
LEFT JOIN (
  SELECT paid_by AS user_id, group_id, SUM(amount) AS total
  FROM expenses WHERE is_deleted = FALSE
  GROUP BY paid_by, group_id
) paid ON paid.user_id = gm.user_id AND paid.group_id = gm.group_id
LEFT JOIN (
  SELECT es.user_id, e.group_id, SUM(es.owed_amount) AS total
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.is_deleted = FALSE
  GROUP BY es.user_id, e.group_id
) owed ON owed.user_id = gm.user_id AND owed.group_id = gm.group_id;

-- monthly spend per group
CREATE OR REPLACE VIEW vw_monthly_spend AS
SELECT
  group_id,
  DATE_TRUNC('month', expense_date) AS month,
  SUM(amount)  AS total,
  COUNT(*)     AS num_expenses,
  category,
  SUM(amount) AS category_total
FROM expenses
WHERE is_deleted = FALSE
GROUP BY group_id, DATE_TRUNC('month', expense_date), category;
