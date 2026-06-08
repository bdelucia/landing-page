import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';

type SnapshotTableName =
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE;

/** Earliest balance snapshot day (YYYY-MM-DD) stored for a linked item label. */
export function fetchEarliestSnapshotDate(
	itemLabel: string,
	tableName: SnapshotTableName = ACCOUNT_BALANCE_SNAPSHOTS_TABLE
): string | null {
	const db = getDatabase();
	const row = db
		.prepare(
			`
			SELECT MIN(substr(snapshot_time, 1, 10)) AS earliestDate
			FROM ${tableName}
			WHERE plaid_item_label = ?
		`
		)
		.get(itemLabel.trim()) as { earliestDate: string | null } | undefined;

	const earliestDate = row?.earliestDate?.trim();
	return earliestDate && /^\d{4}-\d{2}-\d{2}$/.test(earliestDate) ? earliestDate : null;
}

export function snapshotTableForEnvironment(useDummyData: boolean): SnapshotTableName {
	return useDummyData ? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE : ACCOUNT_BALANCE_SNAPSHOTS_TABLE;
}
