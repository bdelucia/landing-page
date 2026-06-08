import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_SQLITE_DB_PATH = 'data/finance.sqlite';

let database: DatabaseSync | null = null;

function resolveDatabasePath(): string {
	const configuredPath = process.env.SQLITE_DB_PATH?.trim();
	if (!configuredPath) {
		return resolve(process.cwd(), DEFAULT_SQLITE_DB_PATH);
	}

	return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
}

const ACCOUNT_BALANCE_SNAPSHOTS_DDL = `
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
`;

export const ACCOUNT_BALANCE_SNAPSHOTS_TABLE = 'account_balance_snapshots';
export const ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE = 'account_balance_snapshots_dummy';

function ensureBalanceSnapshotTable(
	db: DatabaseSync,
	tableName: string,
	indexPrefix: string
): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS ${tableName} (
			${ACCOUNT_BALANCE_SNAPSHOTS_DDL}
		);

		CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_time
			ON ${tableName} (snapshot_time);

		CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_account_time
			ON ${tableName} (plaid_account_id, snapshot_time);
	`);
}

function ensureSchema(db: DatabaseSync): void {
	ensureBalanceSnapshotTable(db, ACCOUNT_BALANCE_SNAPSHOTS_TABLE, 'account_balance_snapshots');
	ensureBalanceSnapshotTable(
		db,
		ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
		'account_balance_snapshots_dummy'
	);
}

export function getDatabase(): DatabaseSync {
	if (database) {
		return database;
	}

	const dbPath = resolveDatabasePath();
	mkdirSync(dirname(dbPath), { recursive: true });
	database = new DatabaseSync(dbPath);
	ensureSchema(database);

	return database;
}
