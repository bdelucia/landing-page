import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_SQLITE_DB_PATH = 'database/finance.sqlite';

let database: DatabaseSync | null = null;
let resolvedDatabasePath: string | null = null;

function resolveDatabasePath(): string {
	if (resolvedDatabasePath) {
		return resolvedDatabasePath;
	}

	const configuredPath = process.env.SQLITE_DB_PATH?.trim();
	let dbPath = configuredPath
		? isAbsolute(configuredPath)
			? configuredPath
			: resolve(process.cwd(), configuredPath)
		: resolve(process.cwd(), DEFAULT_SQLITE_DB_PATH);

	const mountedDockerPath = toMountedDockerDatabasePath(dbPath);
	if (mountedDockerPath && mountedDockerPath !== dbPath) {
		console.warn(
			`SQLITE_DB_PATH points to ${dbPath}, which is outside the docker-compose database volume. ` +
				`Using ${mountedDockerPath} instead. Update .env to SQLITE_DB_PATH=${mountedDockerPath}`
		);
		dbPath = mountedDockerPath;
	}

	resolvedDatabasePath = dbPath;
	return dbPath;
}

/** Maps legacy `/app/data/finance.sqlite` to the mounted `/app/database/finance.sqlite` path. */
function toMountedDockerDatabasePath(dbPath: string): string | null {
	const normalized = dbPath.replace(/\\/g, '/');
	if (!normalized.endsWith('/data/finance.sqlite')) {
		return null;
	}

	return normalized.replace(/\/data\/finance\.sqlite$/, '/database/finance.sqlite');
}

function alternateDatabasePath(dbPath: string): string | null {
	const toDatabase = toMountedDockerDatabasePath(dbPath);
	if (toDatabase) return toDatabase;

	const normalized = dbPath.replace(/\\/g, '/');
	if (!normalized.endsWith('/database/finance.sqlite')) {
		return null;
	}

	return normalized.replace(/\/database\/finance\.sqlite$/, '/data/finance.sqlite');
}

function legacyDatabasePath(dbPath: string): string {
	const alternate = alternateDatabasePath(dbPath);
	if (alternate) return alternate;

	const directory = dirname(dbPath);
	const fileName = dbPath.slice(directory.length + 1);

	if (directory.endsWith('/database') || directory.endsWith('\\database')) {
		return join(dirname(directory), 'data', fileName);
	}

	return resolve(directory, '../data', fileName);
}

function migrateLegacyDatabaseIfNeeded(dbPath: string): void {
	if (existsSync(dbPath)) return;

	const legacyPath = legacyDatabasePath(dbPath);
	if (!existsSync(legacyPath)) return;

	mkdirSync(dirname(dbPath), { recursive: true });
	copyFileSync(legacyPath, dbPath);
	console.warn(
		`Migrated SQLite database from ${legacyPath} to ${dbPath}. You can remove the old file after verifying balances.`
	);
}

function countDistinctSnapshotDays(db: DatabaseSync, tableName: string): number {
	try {
		const row = db
			.prepare(`SELECT COUNT(DISTINCT substr(snapshot_time, 1, 10)) AS dayCount FROM ${tableName}`)
			.get() as { dayCount: number };

		return row.dayCount ?? 0;
	} catch {
		return 0;
	}
}

function mergeSnapshotsFromAlternatePath(dbPath: string): void {
	const alternatePath = alternateDatabasePath(dbPath);
	if (!alternatePath || !existsSync(dbPath) || !existsSync(alternatePath)) return;

	const db = new DatabaseSync(dbPath);
	try {
		const currentDays = countDistinctSnapshotDays(db, ACCOUNT_BALANCE_SNAPSHOTS_TABLE);
		const escapedAlternatePath = alternatePath.replace(/'/g, "''");
		db.exec(`ATTACH DATABASE '${escapedAlternatePath}' AS alternate_db`);

		const alternateDays = countDistinctSnapshotDays(db, 'alternate_db.account_balance_snapshots');
		if (alternateDays <= currentDays) {
			db.exec('DETACH DATABASE alternate_db');
			return;
		}

		const beforeCount = db
			.prepare(`SELECT COUNT(*) AS rowCount FROM ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE}`)
			.get() as { rowCount: number };

		db.exec(`
			INSERT INTO ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE} (
				snapshot_time,
				plaid_item_label,
				plaid_item_id,
				plaid_account_id,
				account_name,
				account_mask,
				account_type,
				account_subtype,
				balance_current,
				balance_available,
				balance_limit,
				iso_currency_code,
				unofficial_currency_code,
				source
			)
			SELECT
				alternate.snapshot_time,
				alternate.plaid_item_label,
				alternate.plaid_item_id,
				alternate.plaid_account_id,
				alternate.account_name,
				alternate.account_mask,
				alternate.account_type,
				alternate.account_subtype,
				alternate.balance_current,
				alternate.balance_available,
				alternate.balance_limit,
				alternate.iso_currency_code,
				alternate.unofficial_currency_code,
				alternate.source
			FROM alternate_db.account_balance_snapshots AS alternate
			WHERE NOT EXISTS (
				SELECT 1
				FROM ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE} AS current
				WHERE current.snapshot_time = alternate.snapshot_time
					AND current.plaid_account_id = alternate.plaid_account_id
			)
		`);

		const afterCount = db
			.prepare(`SELECT COUNT(*) AS rowCount FROM ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE}`)
			.get() as { rowCount: number };

		db.exec('DETACH DATABASE alternate_db');

		const inserted = afterCount.rowCount - beforeCount.rowCount;
		if (inserted > 0) {
			console.warn(
				`Merged ${inserted} balance snapshot row(s) from ${alternatePath} into ${dbPath}.`
			);
		}
	} catch (error) {
		try {
			db.exec('DETACH DATABASE alternate_db');
		} catch {
			// Ignore detach failures during error recovery.
		}

		const message = error instanceof Error ? error.message : 'unknown error';
		console.warn(`Failed to merge balance snapshots from ${alternatePath}: ${message}`);
	} finally {
		db.close();
	}
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

function ensureInvestmentTables(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS investment_contribution_totals (
			plaid_item_label TEXT PRIMARY KEY,
			total_contributions REAL NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS investment_processed_transactions (
			investment_transaction_id TEXT PRIMARY KEY,
			plaid_item_label TEXT NOT NULL,
			contribution_delta REAL NOT NULL,
			processed_at TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_investment_processed_transactions_item
			ON investment_processed_transactions (plaid_item_label);

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
	`);

	ensureProcessedTransactionDateColumn(db);
}

function ensureProcessedTransactionDateColumn(db: DatabaseSync): void {
	const columns = db
		.prepare(`PRAGMA table_info(investment_processed_transactions)`)
		.all() as Array<{ name: string }>;

	if (columns.some((column) => column.name === 'transaction_date')) {
		return;
	}

	db.exec(`ALTER TABLE investment_processed_transactions ADD COLUMN transaction_date TEXT`);
}

export const NEWS_ARTICLES_TABLE = 'news_articles';

function ensureNewsTable(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS ${NEWS_ARTICLES_TABLE} (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			category TEXT NOT NULL,
			external_id TEXT NOT NULL,
			title TEXT NOT NULL,
			url TEXT NOT NULL,
			source TEXT,
			summary TEXT,
			image_url TEXT,
			published_at TEXT NOT NULL,
			extra TEXT,
			fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE (category, external_id)
		);

		CREATE INDEX IF NOT EXISTS idx_news_articles_category_published
			ON ${NEWS_ARTICLES_TABLE} (category, published_at);
	`);
}

function ensureSchema(db: DatabaseSync): void {
	ensureBalanceSnapshotTable(db, ACCOUNT_BALANCE_SNAPSHOTS_TABLE, 'account_balance_snapshots');
	ensureBalanceSnapshotTable(
		db,
		ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
		'account_balance_snapshots_dummy'
	);
	ensureInvestmentTables(db);
	ensureNewsTable(db);
}

export function getDatabase(): DatabaseSync {
	if (database) {
		return database;
	}

	const dbPath = resolveDatabasePath();
	migrateLegacyDatabaseIfNeeded(dbPath);
	mergeSnapshotsFromAlternatePath(dbPath);
	mkdirSync(dirname(dbPath), { recursive: true });
	database = new DatabaseSync(dbPath);
	ensureSchema(database);

	return database;
}
