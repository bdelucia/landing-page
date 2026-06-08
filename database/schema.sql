-- Finance SQLite schema for landing-page
--
-- Replicate locally:
--   mkdir -p database
--   sqlite3 database/finance.sqlite < database/schema.sql
--
-- The app also creates these tables automatically on first run (see src/lib/server/db/database.ts).

-- Plaid balance snapshots (production data)
CREATE TABLE IF NOT EXISTS account_balance_snapshots (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	snapshot_time TEXT NOT NULL,
	plaid_item_label TEXT NOT NULL,
	plaid_item_id TEXT,
	plaid_account_id TEXT NOT NULL,
	account_name TEXT NOT NULL,
	account_mask TEXT,
	account_type TEXT,
	account_subtype TEXT,
	balance_current REAL,
	balance_available REAL,
	balance_limit REAL,
	iso_currency_code TEXT,
	unofficial_currency_code TEXT,
	source TEXT NOT NULL DEFAULT 'plaid',
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_time
	ON account_balance_snapshots (snapshot_time);

CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_account_time
	ON account_balance_snapshots (plaid_account_id, snapshot_time);

-- Dummy balance snapshots (demo / offline mode)
CREATE TABLE IF NOT EXISTS account_balance_snapshots_dummy (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	snapshot_time TEXT NOT NULL,
	plaid_item_label TEXT NOT NULL,
	plaid_item_id TEXT,
	plaid_account_id TEXT NOT NULL,
	account_name TEXT NOT NULL,
	account_mask TEXT,
	account_type TEXT,
	account_subtype TEXT,
	balance_current REAL,
	balance_available REAL,
	balance_limit REAL,
	iso_currency_code TEXT,
	unofficial_currency_code TEXT,
	source TEXT NOT NULL DEFAULT 'plaid',
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_dummy_time
	ON account_balance_snapshots_dummy (snapshot_time);

CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_dummy_account_time
	ON account_balance_snapshots_dummy (plaid_account_id, snapshot_time);

-- Investment account history (legacy; not written by current app code)
CREATE TABLE IF NOT EXISTS investment_account_history (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	history_date TEXT NOT NULL,
	plaid_item_label TEXT NOT NULL,
	plaid_item_id TEXT,
	plaid_account_id TEXT NOT NULL,
	balance REAL NOT NULL,
	contributions REAL NOT NULL,
	earnings REAL NOT NULL,
	source TEXT NOT NULL DEFAULT 'plaid',
	synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_history_unique
	ON investment_account_history (plaid_item_label, plaid_account_id, history_date);

CREATE INDEX IF NOT EXISTS idx_investment_history_item_date
	ON investment_account_history (plaid_item_label, history_date);

-- App metadata (e.g. dummy snapshot seed state; created on first dummy-data use)
CREATE TABLE IF NOT EXISTS app_metadata (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
