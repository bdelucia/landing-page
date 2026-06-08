import { getPersistedPlaidItemIdForLabel } from '$lib/server/plaid/plaid-item-registry';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';
import type { PlaidLinkedItem } from '$data/api-config.types';
import type { LatestSnapshotRow } from '$lib/server/balances/latest-balance-snapshots';

type SnapshotTableName =
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE;

export type SnapshotItemScope = {
	itemLabel: string;
	itemId: string | null;
	scopedAccountIds: Set<string>;
};

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

export function resolveSnapshotItemId(
	item: PlaidLinkedItem,
	itemLabel = resolveItemLabel(item)
): string | null {
	return item.itemId ?? getPersistedPlaidItemIdForLabel(itemLabel);
}

export function resolveScopedAccountIdsForItem({
	itemLabel,
	itemId,
	tableName,
	accountIds = []
}: {
	itemLabel: string;
	itemId?: string | null;
	tableName: SnapshotTableName;
	accountIds?: string[];
}): string[] {
	const scopeClauses: string[] = [];
	const params: Array<string> = [];

	if (itemLabel) {
		scopeClauses.push('plaid_item_label = ?');
		params.push(itemLabel);
	}

	if (itemId) {
		scopeClauses.push('plaid_item_id = ?');
		params.push(itemId);
	}

	if (accountIds.length > 0) {
		const placeholders = accountIds.map(() => '?').join(', ');
		scopeClauses.push(`plaid_account_id IN (${placeholders})`);
		params.push(...accountIds);
	}

	if (scopeClauses.length === 0) return [];

	const db = getDatabase();
	const statement = db.prepare(`
		SELECT DISTINCT plaid_account_id AS accountId
		FROM ${tableName}
		WHERE (${scopeClauses.join(' OR ')})
	`);

	const rows = statement.all(...params) as Array<{ accountId: string }>;
	return rows.map((row) => row.accountId);
}

export function buildSnapshotItemScope(
	item: PlaidLinkedItem,
	tableName: SnapshotTableName,
	knownAccountIds: string[] = []
): SnapshotItemScope {
	const itemLabel = resolveItemLabel(item);
	const itemId = resolveSnapshotItemId(item, itemLabel);
	const scopedAccountIds = new Set(
		resolveScopedAccountIdsForItem({
			itemLabel,
			itemId,
			tableName,
			accountIds: knownAccountIds
		})
	);

	return {
		itemLabel,
		itemId,
		scopedAccountIds
	};
}

export function snapshotRowMatchesItem(
	row: LatestSnapshotRow,
	scope: SnapshotItemScope
): boolean {
	if (row.itemLabel === scope.itemLabel) return true;
	if (scope.itemId && row.itemId === scope.itemId) return true;
	if (scope.scopedAccountIds.has(row.accountId)) return true;
	return false;
}

export function snapshotRowsForItem(
	rows: LatestSnapshotRow[],
	scope: SnapshotItemScope
): LatestSnapshotRow[] {
	return rows.filter((row) => snapshotRowMatchesItem(row, scope));
}

export function countSnapshotRows(tableName: SnapshotTableName): number {
	const db = getDatabase();
	const row = db.prepare(`SELECT COUNT(*) AS rowCount FROM ${tableName}`).get() as {
		rowCount: number;
	};

	return row.rowCount ?? 0;
}
