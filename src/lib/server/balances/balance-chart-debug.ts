import { diagnoseBalanceChartForItem } from '$lib/server/balances/account-balance-history';
import { fetchLatestSnapshotRows } from '$lib/server/balances/latest-balance-snapshots';
import {
	buildSnapshotItemScope,
	countSnapshotRows,
	snapshotRowsForItem
} from '$lib/server/balances/snapshot-item-scope';
import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase,
	getResolvedDatabasePath
} from '$lib/server/db/database';
import type { PlaidConfig } from '$data/api-config.types';

function resolveItemLabel(item: { label?: string }): string {
	return item.label?.trim() || 'Account';
}

export function buildBalanceChartDebugReport(plaid: PlaidConfig) {
	const useDummyData = plaid.environment === 'sandbox';
	const tableName = useDummyData
		? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE
		: ACCOUNT_BALANCE_SNAPSHOTS_TABLE;
	const db = getDatabase();

	const global = db
		.prepare(
			`
			SELECT
				COUNT(*) AS rowCount,
				COUNT(DISTINCT substr(snapshot_time, 1, 10)) AS snapshotUtcDays,
				COUNT(DISTINCT substr(created_at, 1, 10)) AS createdUtcDays,
				MIN(snapshot_time) AS earliestSnapshotTime,
				MAX(snapshot_time) AS latestSnapshotTime
			FROM ${tableName}
		`
		)
		.get() as {
		rowCount: number;
		snapshotUtcDays: number;
		createdUtcDays: number;
		earliestSnapshotTime: string | null;
		latestSnapshotTime: string | null;
	};

	const latestSnapshotRows = fetchLatestSnapshotRows(tableName);
	const items = getPlaidLinkedItems(plaid).map((item) => {
		const itemLabel = resolveItemLabel(item);
		const scope = buildSnapshotItemScope(item, tableName);
		const itemRows = snapshotRowsForItem(latestSnapshotRows, scope);

		return {
			...diagnoseBalanceChartForItem({
				accounts: itemRows.map((row) => ({
					id: row.accountId,
					itemId: item.itemId ?? item.accessToken,
					typeLabel: row.accountName,
					mask: row.accountMask,
					balanceLabel: '',
					balance: row.balanceCurrent ?? row.balanceAvailable ?? 0
				})),
				bankLabel: itemLabel,
				itemId: scope.itemId,
				useDummyData
			}),
			scopedAccountIds: [...scope.scopedAccountIds],
			matchedLatestRows: itemRows.length
		};
	});

	return {
		environment: plaid.environment,
		tableName,
		configuredSqliteDbPath: process.env.SQLITE_DB_PATH?.trim() || 'database/finance.sqlite',
		sqliteDbPath: getResolvedDatabasePath(),
		totalSnapshotRows: countSnapshotRows(tableName),
		global,
		items
	};
}
