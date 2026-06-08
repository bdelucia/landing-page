import type { AccountBase } from 'plaid';
import {
	accountBalanceDisplayOrder,
	debtBalanceFromRaw,
	formatDebtBalanceLabel,
	isDebtAccountLabel,
	type AccountBalanceItem
} from '$lib/account-balances';
import { accountBalanceIcon } from '$lib/account-balance-icons';
import { type BankAccountDetailsByItem, type BankAccountItem } from '$lib/bank-accounts';
import { buildAccountBalanceHistory } from '$lib/server/account-balance-history';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/database';
import {
	dummySnapshotAccountFromBankItem,
	ensureDummyBalanceSnapshots
} from '$lib/server/dummy-balance-snapshots';
import { getPlaidLinkedItems } from '$lib/server/integration-config';
import {
	formatChartAccountTypeLabel,
	hasChartLabelOverride
} from '$lib/server/plaid-account-label';
import type { PlaidConfig, PlaidLinkedItem } from '$data/personal-info.types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

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

export function fetchLatestSnapshotRows(
	tableName:
		| typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE
		| typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE = ACCOUNT_BALANCE_SNAPSHOTS_TABLE
): LatestSnapshotRow[] {
	const db = getDatabase();
	const statement = db.prepare(`
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
		INNER JOIN (
			SELECT plaid_account_id, MAX(snapshot_time) AS max_snapshot_time
			FROM ${tableName}
			GROUP BY plaid_account_id
		) AS latest
			ON snapshot.plaid_account_id = latest.plaid_account_id
			AND snapshot.snapshot_time = latest.max_snapshot_time
		WHERE snapshot.id = (
			SELECT candidate.id
			FROM ${tableName} AS candidate
			WHERE candidate.plaid_account_id = snapshot.plaid_account_id
				AND candidate.snapshot_time = snapshot.snapshot_time
			ORDER BY candidate.id DESC
			LIMIT 1
		)
	`);

	return statement.all() as LatestSnapshotRow[];
}

function rowsForItem(rows: LatestSnapshotRow[], item: PlaidLinkedItem): LatestSnapshotRow[] {
	const itemKey = resolveItemKey(item);
	const itemLabel = resolveItemLabel(item);

	return rows.filter(
		(row) => row.itemId === itemKey || row.itemId === item.itemId || row.itemLabel === itemLabel
	);
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

export type LatestBalancesFromDbResult = {
	accounts: AccountBalanceItem[];
	byItemId: BankAccountDetailsByItem;
	error: string | null;
	hasData: boolean;
};

export function loadLatestBalancesFromDb(plaid: PlaidConfig): LatestBalancesFromDbResult {
	const linkedItems = getPlaidLinkedItems(plaid);
	const useDummyHistory = plaid.environment === 'sandbox';
	const snapshotRows = fetchLatestSnapshotRows();
	const byItemId: BankAccountDetailsByItem = {};
	const accounts: AccountBalanceItem[] = [];
	const missingItems: string[] = [];

	for (const item of linkedItems) {
		const itemKey = resolveItemKey(item);
		const itemLabel = resolveItemLabel(item);
		const isDebt = isDebtAccountLabel(itemLabel);
		const icon = accountBalanceIcon(itemLabel);
		const itemRows = rowsForItem(snapshotRows, item);

		if (itemRows.length === 0) {
			missingItems.push(itemLabel);
			accounts.push({
				id: itemKey,
				label: itemLabel,
				icon: icon ?? '',
				balanceLabel: '—',
				balance: null,
				isDebt,
				error: `No balance snapshots yet for "${itemLabel}". Waiting for Plaid webhook or cron sync.`
			});
			byItemId[itemKey] = buildAccountBalanceHistory({
				accounts: [],
				bankLabel: itemLabel,
				useDummyData: useDummyHistory
			});
			continue;
		}

		const bankAccounts = itemRows
			.map((row) => mapSnapshotRowToBankAccount(row, itemKey, itemLabel, isDebt))
			.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

		if (useDummyHistory && bankAccounts.length > 0) {
			ensureDummyBalanceSnapshots(
				bankAccounts.map((account) => {
					const row = itemRows.find((entry) => entry.accountId === account.id);

					return dummySnapshotAccountFromBankItem(
						account,
						row?.accountName ?? account.typeLabel,
						row?.accountType ?? null,
						row?.accountSubtype ?? null
					);
				}),
				itemLabel,
				item.itemId ?? null
			);
		}

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
			useDummyData: useDummyHistory
		});
	}

	const sortedAccounts = sortByDisplayOrder(accounts);
	const hasData = missingItems.length < linkedItems.length;

	if (!hasData) {
		return {
			accounts: sortedAccounts,
			byItemId,
			error:
				'No balance snapshots in SQLite yet. Configure the Plaid webhook or run `pnpm update-balances` once.',
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
