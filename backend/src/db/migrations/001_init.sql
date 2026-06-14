-- =========================================================
-- 001_init.sql
-- Initial normalized schema for Splitwise-inspired app
-- =========================================================

-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ---------------------------------------------------------
-- GROUPS
-- ---------------------------------------------------------
CREATE TABLE groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_created_by ON groups(created_by);

-- ---------------------------------------------------------
-- GROUP_MEMBERS (many-to-many users <-> groups)
-- ---------------------------------------------------------
CREATE TABLE group_members (
    id        SERIAL PRIMARY KEY,
    group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role      VARCHAR(20) NOT NULL DEFAULT 'member', -- 'creator' | 'member'
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- ---------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------
CREATE TABLE expenses (
    id          SERIAL PRIMARY KEY,
    group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency    VARCHAR(10) NOT NULL DEFAULT 'INR',
    split_type  VARCHAR(20) NOT NULL DEFAULT 'equal', -- 'equal' | 'unequal' | 'percentage' | 'share'
    expense_date DATE NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

-- ---------------------------------------------------------
-- EXPENSE_SPLITS
-- One row per (expense, user). Stores normalized owed_amount
-- regardless of split_type, plus raw input (percentage/shares)
-- for audit/display purposes.
-- ---------------------------------------------------------
CREATE TABLE expense_splits (
    id          SERIAL PRIMARY KEY,
    expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owed_amount NUMERIC(12,2) NOT NULL CHECK (owed_amount >= 0),
    percentage  NUMERIC(5,2),   -- only for split_type = 'percentage'
    shares      NUMERIC(8,2),   -- only for split_type = 'share'
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);

-- ---------------------------------------------------------
-- SETTLEMENTS
-- Records a payment from one user to another within a group.
-- ---------------------------------------------------------
CREATE TABLE settlements (
    id          SERIAL PRIMARY KEY,
    group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    paid_to     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency    VARCHAR(10) NOT NULL DEFAULT 'INR',
    note        TEXT,
    settled_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (paid_by <> paid_to)
);

CREATE INDEX idx_settlements_group_id ON settlements(group_id);
CREATE INDEX idx_settlements_paid_by ON settlements(paid_by);
CREATE INDEX idx_settlements_paid_to ON settlements(paid_to);

-- ---------------------------------------------------------
-- EXPENSE_COMMENTS (chat thread per expense)
-- ---------------------------------------------------------
CREATE TABLE expense_comments (
    id         SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_comments_expense_id ON expense_comments(expense_id);

-- ---------------------------------------------------------
-- IMPORT_LOGS (CSV import runs)
-- ---------------------------------------------------------
CREATE TABLE import_logs (
    id              SERIAL PRIMARY KEY,
    group_id        INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    uploaded_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    total_rows      INTEGER NOT NULL DEFAULT 0,
    imported_rows   INTEGER NOT NULL DEFAULT 0,
    skipped_rows    INTEGER NOT NULL DEFAULT 0,
    anomalies       JSONB NOT NULL DEFAULT '[]', -- array of {row, issue, severity, action}
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_logs_group_id ON import_logs(group_id);
CREATE INDEX idx_import_logs_uploaded_by ON import_logs(uploaded_by);
