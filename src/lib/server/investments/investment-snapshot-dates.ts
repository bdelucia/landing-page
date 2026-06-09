import { isoInstantToDayKey } from '$lib/hooks/chart/chart-date';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';

type SnapshotTableName =
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE;

/** Earliest balance snapshot day (YYYY-MM-DD, Phoenix) stored for a linked item label. */
export function fetchEarliestSnapshotDate(
	itemLabel: string,
	tableName: SnapshotTableName = ACCOUNT_BALANCE_SNAPSHOTS_TABLE
): string | null {
	const db = getDatabase();
	const rows = db
		.prepare(
			`
			SELECT snapshot_time AS snapshotTime
			FROM ${tableName}
			WHERE plaid_item_label = ?
			ORDER BY snapshot_time ASC
			LIMIT 1
		`
		)
		.all(itemLabel.trim()) as Array<{ snapshotTime: string }>;

	const snapshotTime = rows[0]?.snapshotTime?.trim();
	if (!snapshotTime) {
		return null;
	}

	return isoInstantToDayKey(snapshotTime);
}

export function snapshotTableForEnvironment(useDummyData: boolean): SnapshotTableName {
	return useDummyData ? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE : ACCOUNT_BALANCE_SNAPSHOTS_TABLE;
}
