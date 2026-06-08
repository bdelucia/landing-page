import type { AccountBase } from 'plaid';
import {
	accountBalanceDisplayOrder,
	debtBalanceFromRaw,
	formatDebtBalanceLabel,
	isDebtAccountLabel,
	type AccountBalanceItem
} from '$lib/hooks/finances/account-balances';
import { accountBalanceIcon } from '$lib/hooks/finances/account-balance-icons';
import {
	type BankAccountDetailsByItem,
	type BankAccountItem
} from '$lib/hooks/finances/bank-accounts';
import { buildAccountBalanceHistory } from '$lib/server/balances/account-balance-history';
import {
	buildSnapshotItemScope,
	countSnapshotRows,
	resolveSnapshotItemId,
	snapshotRowsForItem
} from '$lib/server/balances/snapshot-item-scope';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';
import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import {
	formatChartAccountTypeLabel,
	hasChartLabelOverride
} from '$lib/server/plaid/plaid-account-label';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type SnapshotTableName =
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE
	| typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE;

export type LatestSnapshotRow = {
	snapshotTime: string;
	itemLabel: string;
	itemId: string | null;
	accountId: string;
	accountName: string;
	accountMask: string | null;
	accountType: string | null;
	accountSubtype: string | null;
	balanceCurrent: number | null;
	balanceAvailable: number | null;
};

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

function resolveItemKey(item: PlaidLinkedItem): string {
	return item.itemId ?? item.accessToken;
}

export function snapshotBalanceAmount(row: LatestSnapshotRow): number {
	if (row.balanceCurrent != null) return row.balanceCurrent;
	if (row.balanceAvailable != null) return row.balanceAvailable;
	return 0;
}

function toAccountBaseLike(row: LatestSnapshotRow): AccountBase {
	return {
		account_id: row.accountId,
		name: row.accountName,
		mask: row.accountMask ?? undefined,
		type: row.accountType as AccountBase['type'],
		subtype: row.accountSubtype as AccountBase['subtype'],
		balances: {
			current: row.balanceCurrent ?? undefined,
			available: row.balanceAvailable ?? undefined
		}
	} as AccountBase;
}

const LATEST_SNAPSHOT_ROW_SQL = `
	SELECT
		snapshot.snapshot_time AS snapshotTime,
		snapshot.plaid_item_label AS itemLabel,
		snapshot.plaid_item_id AS itemId,
		snapshot.plaid_account_id AS accountId,
		snapshot.account_name AS accountName,
		snapshot.account_mask AS accountMask,
		snapshot.account_type AS accountType,
		snapshot.account_subtype AS accountSubtype,
		snapshot.balance_current AS balanceCurrent,
		snapshot.balance_available AS balanceAvailable
	FROM {{tableName}} AS snapshot
	INNER JOIN (
		SELECT plaid_account_id, MAX(snapshot_time) AS max_snapshot_time
		FROM {{tableName}}
		{{accountFilter}}
		GROUP BY plaid_account_id
	) AS latest
		ON snapshot.plaid_account_id = latest.plaid_account_id
		AND snapshot.snapshot_time = latest.max_snapshot_time
	WHERE snapshot.id = (
		SELECT candidate.id
		FROM {{tableName}} AS candidate
		WHERE candidate.plaid_account_id = snapshot.plaid_account_id
			AND candidate.snapshot_time = snapshot.snapshot_time
		ORDER BY candidate.id DESC
		LIMIT 1
	)
`;

function latestSnapshotQuery(tableName: SnapshotTableName, accountIds: string[] = []): string {
	const accountFilter =
		accountIds.length > 0
			? `WHERE plaid_account_id IN (${accountIds.map(() => '?').join(', ')})`
			: '';

	return LATEST_SNAPSHOT_ROW_SQL.replaceAll('{{tableName}}', tableName).replace(
		'{{accountFilter}}',
		accountFilter
	);
}

export function fetchLatestSnapshotRows(
	tableName: SnapshotTableName = ACCOUNT_BALANCE_SNAPSHOTS_TABLE
): LatestSnapshotRow[] {
	const db = getDatabase();
	const statement = db.prepare(latestSnapshotQuery(tableName));
	return statement.all() as LatestSnapshotRow[];
}

function fetchLatestSnapshotRowsForAccounts(
	accountIds: string[],
	tableName: SnapshotTableName
): LatestSnapshotRow[] {
	if (accountIds.length === 0) return [];

	const db = getDatabase();
	const statement = db.prepare(latestSnapshotQuery(tableName, accountIds));
	return statement.all(...accountIds) as LatestSnapshotRow[];
}

function sortByDisplayOrder(accounts: AccountBalanceItem[]): AccountBalanceItem[] {
	const order = new Map(accountBalanceDisplayOrder.map((label, index) => [label, index]));

	return [...accounts].sort((a, b) => {
		const aIndex = order.get(a.label as (typeof accountBalanceDisplayOrder)[number]);
		const bIndex = order.get(b.label as (typeof accountBalanceDisplayOrder)[number]);
		if (aIndex == null && bIndex == null) return a.label.localeCompare(b.label);
		if (aIndex == null) return 1;
		if (bIndex == null) return -1;
		return aIndex - bIndex;
	});
}

function mapSnapshotRowToBankAccount(
	row: LatestSnapshotRow,
	itemKey: string,
	itemLabel: string,
	isDebt: boolean
): BankAccountItem {
	const account = toAccountBaseLike(row);
	const rawBalance = snapshotBalanceAmount(row);
	const balance = isDebt ? debtBalanceFromRaw(rawBalance) : rawBalance;

	return {
		id: row.accountId,
		itemId: itemKey,
		typeLabel: formatChartAccountTypeLabel(account, itemLabel),
		mask: row.accountMask?.trim() ?? null,
		balanceLabel: isDebt ? formatDebtBalanceLabel(rawBalance) : money.format(rawBalance),
		balance,
		isDebt,
		forceChartHeader: hasChartLabelOverride(account, itemLabel)
	};
}

function fetchLatestBatchRowsForItem(
	item: PlaidLinkedItem,
	tableName: SnapshotTableName
): LatestSnapshotRow[] {
	const itemLabel = resolveItemLabel(item);
	const itemId = resolveSnapshotItemId(item, itemLabel);
	const db = getDatabase();

	const scopeClauses = ['plaid_item_label = ?'];
	const scopeParams: string[] = [itemLabel];

	if (itemId) {
		scopeClauses.push('plaid_item_id = ?');
		scopeParams.push(itemId);
	}

	const maxRow = db
		.prepare(
			`
		SELECT MAX(snapshot_time) AS maxTime
		FROM ${tableName}
		WHERE ${scopeClauses.join(' OR ')}
	`
		)
		.get(...scopeParams) as { maxTime: string | null } | undefined;

	if (!maxRow?.maxTime) {
		return [];
	}

	const batchStatement = db.prepare(`
		SELECT
			snapshot.snapshot_time AS snapshotTime,
			snapshot.plaid_item_label AS itemLabel,
			snapshot.plaid_item_id AS itemId,
			snapshot.plaid_account_id AS accountId,
			snapshot.account_name AS accountName,
			snapshot.account_mask AS accountMask,
			snapshot.account_type AS accountType,
			snapshot.account_subtype AS accountSubtype,
			snapshot.balance_current AS balanceCurrent,
			snapshot.balance_available AS balanceAvailable
		FROM ${tableName} AS snapshot
		WHERE snapshot.snapshot_time = ?
			AND (${scopeClauses.map((clause) => `snapshot.${clause}`).join(' OR ')})
		ORDER BY snapshot.plaid_account_id ASC
	`);

	return batchStatement.all(maxRow.maxTime, ...scopeParams) as LatestSnapshotRow[];
}

function latestRowsForItem(
	item: PlaidLinkedItem,
	allLatestRows: LatestSnapshotRow[],
	tableName: SnapshotTableName
): LatestSnapshotRow[] {
	const latestBatchRows = fetchLatestBatchRowsForItem(item, tableName);
	if (latestBatchRows.length > 0) {
		return latestBatchRows;
	}

	const scope = buildSnapshotItemScope(item, tableName);
	const matchedRows = snapshotRowsForItem(allLatestRows, scope);

	if (matchedRows.length > 0) {
		return matchedRows;
	}

	return fetchLatestSnapshotRowsForAccounts([...scope.scopedAccountIds], tableName);
}

export type LatestBalancesFromDbResult = {
	accounts: AccountBalanceItem[];
	byItemId: BankAccountDetailsByItem;
	error: string | null;
	hasData: boolean;
};

export function loadLatestBalancesFromDb(plaid: PlaidConfig): LatestBalancesFromDbResult {
	const linkedItems = getPlaidLinkedItems(plaid);
	const useDummyData = plaid.environment === 'sandbox';
	const snapshotTable = useDummyData
		? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE
		: ACCOUNT_BALANCE_SNAPSHOTS_TABLE;
	const snapshotRows = fetchLatestSnapshotRows(snapshotTable);
	const totalSnapshotRows = countSnapshotRows(snapshotTable);
	const byItemId: BankAccountDetailsByItem = {};
	const accounts: AccountBalanceItem[] = [];
	const missingItems: string[] = [];

	for (const item of linkedItems) {
		const itemKey = resolveItemKey(item);
		const itemLabel = resolveItemLabel(item);
		const isDebt = isDebtAccountLabel(itemLabel);
		const icon = accountBalanceIcon(itemLabel);
		const itemRows = latestRowsForItem(item, snapshotRows, snapshotTable);

		if (itemRows.length === 0) {
			missingItems.push(itemLabel);
			accounts.push({
				id: itemKey,
				label: itemLabel,
				icon: icon ?? '',
				balanceLabel: '—',
				balance: null,
				isDebt,
				error: useDummyData
					? `No dummy balance snapshots yet for "${itemLabel}".`
					: `No balance snapshots yet for "${itemLabel}". Waiting for Plaid webhook or cron sync.`
			});
			byItemId[itemKey] = buildAccountBalanceHistory({
				accounts: [],
				bankLabel: itemLabel,
				useDummyData
			});
			continue;
		}

		const bankAccounts = itemRows
			.map((row) => mapSnapshotRowToBankAccount(row, itemKey, itemLabel, isDebt))
			.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

		const rawTotal = itemRows.reduce((total, row) => total + snapshotBalanceAmount(row), 0);

		accounts.push({
			id: itemKey,
			label: itemLabel,
			icon: icon ?? '',
			balanceLabel: isDebt ? formatDebtBalanceLabel(rawTotal) : money.format(rawTotal),
			balance: isDebt ? debtBalanceFromRaw(rawTotal) : rawTotal,
			isDebt
		});

		byItemId[itemKey] = buildAccountBalanceHistory({
			accounts: bankAccounts,
			bankLabel: itemLabel,
			itemId: resolveSnapshotItemId(item, itemLabel),
			itemIsDebt: isDebt,
			useDummyData
		});
	}

	const sortedAccounts = sortByDisplayOrder(accounts);
	const hasData = missingItems.length < linkedItems.length;

	if (!hasData) {
		const sqlitePath = process.env.SQLITE_DB_PATH?.trim() || 'database/finance.sqlite';
		const error = useDummyData
			? 'No balance snapshots in the dummy SQLite table yet. Sandbox mode seeds from Plaid automatically when tokens are valid.'
			: totalSnapshotRows > 0
				? `Found ${totalSnapshotRows} balance snapshots in SQLite at ${sqlitePath}, but none match the linked Plaid items in secrets.local.ts. Check item labels and redeploy after the next webhook.`
				: 'No balance snapshots in SQLite yet. Configure the Plaid webhook or run `pnpm update-balances` once.';

		return {
			accounts: sortedAccounts,
			byItemId,
			error,
			hasData: false
		};
	}

	if (missingItems.length > 0) {
		return {
			accounts: sortedAccounts,
			byItemId,
			error: `Some balances are missing recent snapshots: ${missingItems.join(', ')}`,
			hasData: true
		};
	}

	return {
		accounts: sortedAccounts,
		byItemId,
		error: null,
		hasData: true
	};
}
