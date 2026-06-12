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

-- Running contribution totals per linked investment item (seeded from secrets baselines)
CREATE TABLE IF NOT EXISTS investment_contribution_totals (
	plaid_item_label TEXT PRIMARY KEY,
	total_contributions REAL NOT NULL,
	updated_at TEXT NOT NULL
);

-- Plaid investment transactions already applied to contribution totals
CREATE TABLE IF NOT EXISTS investment_processed_transactions (
	investment_transaction_id TEXT PRIMARY KEY,
	plaid_item_label TEXT NOT NULL,
	contribution_delta REAL NOT NULL,
	transaction_date TEXT,
	processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investment_processed_transactions_item
	ON investment_processed_transactions (plaid_item_label);

-- Daily balance / contributions / earnings snapshots for investment accounts
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

-- News articles synced by the news cron job (AI / gaming releases / local)
CREATE TABLE IF NOT EXISTS news_articles (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	category TEXT NOT NULL, -- 'ai' | 'gaming' | 'local'
	external_id TEXT NOT NULL, -- stable id from the source API, used for dedupe
	title TEXT NOT NULL,
	url TEXT NOT NULL,
	source TEXT,
	summary TEXT,
	image_url TEXT,
	published_at TEXT NOT NULL, -- ISO timestamp (release date for games, may be in the future)
	extra TEXT, -- JSON blob for category-specific fields (platforms, release date, …)
	fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (category, external_id)
);

CREATE INDEX IF NOT EXISTS idx_news_articles_category_published
	ON news_articles (category, published_at);
