import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_SQLITE_DB_PATH = 'database/finance.sqlite';

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

function legacyDatabasePath(dbPath: string): string {
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
			.prepare(
				`SELECT COUNT(DISTINCT substr(snapshot_time, 1, 10)) AS dayCount FROM ${tableName}`
			)
			.get() as { dayCount: number };

		return row.dayCount ?? 0;
	} catch {
		return 0;
	}
}

function mergeLegacySnapshotsIfNeeded(dbPath: string): void {
	const legacyPath = legacyDatabasePath(dbPath);
	if (!existsSync(dbPath) || !existsSync(legacyPath)) return;

	const db = new DatabaseSync(dbPath);
	try {
		const currentDays = countDistinctSnapshotDays(db, ACCOUNT_BALANCE_SNAPSHOTS_TABLE);
		const escapedLegacyPath = legacyPath.replace(/'/g, "''");
		db.exec(`ATTACH DATABASE '${escapedLegacyPath}' AS legacy_db`);

		const legacyDays = countDistinctSnapshotDays(db, 'legacy_db.account_balance_snapshots');
		if (legacyDays <= currentDays) {
			db.exec('DETACH DATABASE legacy_db');
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
				legacy.snapshot_time,
				legacy.plaid_item_label,
				legacy.plaid_item_id,
				legacy.plaid_account_id,
				legacy.account_name,
				legacy.account_mask,
				legacy.account_type,
				legacy.account_subtype,
				legacy.balance_current,
				legacy.balance_available,
				legacy.balance_limit,
				legacy.iso_currency_code,
				legacy.unofficial_currency_code,
				legacy.source
			FROM legacy_db.account_balance_snapshots AS legacy
			WHERE NOT EXISTS (
				SELECT 1
				FROM ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE} AS current
				WHERE current.snapshot_time = legacy.snapshot_time
					AND current.plaid_account_id = legacy.plaid_account_id
			)
		`);

		const afterCount = db
			.prepare(`SELECT COUNT(*) AS rowCount FROM ${ACCOUNT_BALANCE_SNAPSHOTS_TABLE}`)
			.get() as { rowCount: number };

		db.exec('DETACH DATABASE legacy_db');

		const inserted = afterCount.rowCount - beforeCount.rowCount;
		if (inserted > 0) {
			console.warn(
				`Merged ${inserted} balance snapshot row(s) from legacy database ${legacyPath} into ${dbPath}.`
			);
		}
	} catch (error) {
		try {
			db.exec('DETACH DATABASE legacy_db');
		} catch {
			// Ignore detach failures during error recovery.
		}

		const message = error instanceof Error ? error.message : 'unknown error';
		console.warn(`Failed to merge legacy balance snapshots from ${legacyPath}: ${message}`);
	} finally {
		db.close();
	}
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
	migrateLegacyDatabaseIfNeeded(dbPath);
	mergeLegacySnapshotsIfNeeded(dbPath);
	mkdirSync(dirname(dbPath), { recursive: true });
	database = new DatabaseSync(dbPath);
	ensureSchema(database);

	return database;
}
