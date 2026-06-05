import type { AccountBase } from 'plaid';
import { getDatabase } from '$lib/server/database';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/integration-config';
import { personalSecrets } from '$lib/server/personal-secrets';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/personal-info.types';

type SnapshotRow = {
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
	balanceLimit: number | null;
	isoCurrencyCode: string | null;
	unofficialCurrencyCode: string | null;
};

export type RecordPlaidBalanceSnapshotResult = {
	snapshotTime: string;
	inserted: number;
	failures: Array<{ itemLabel: string; error: string }>;
	skipped: boolean;
	message: string | null;
};

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

function toSnapshotRow(
	account: AccountBase,
	item: PlaidLinkedItem,
	snapshotTime: string
): SnapshotRow {
	return {
		snapshotTime,
		itemLabel: resolveItemLabel(item),
		itemId: item.itemId ?? null,
		accountId: account.account_id,
		accountName: account.name,
		accountMask: account.mask ?? null,
		accountType: account.type ?? null,
		accountSubtype: account.subtype ?? null,
		balanceCurrent: account.balances.current ?? null,
		balanceAvailable: account.balances.available ?? null,
		balanceLimit: account.balances.limit ?? null,
		isoCurrencyCode: account.balances.iso_currency_code ?? null,
		unofficialCurrencyCode: account.balances.unofficial_currency_code ?? null
	};
}

async function fetchRowsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	snapshotTime: string
): Promise<SnapshotRow[]> {
	const client = createPlaidClient(plaid);
	const response = await client.accountsBalanceGet({ access_token: item.accessToken });
	return response.data.accounts.map((account) => toSnapshotRow(account, item, snapshotTime));
}

function insertSnapshotRows(rows: SnapshotRow[]): number {
	if (rows.length === 0) return 0;

	const db = getDatabase();
	const insert = db.prepare(`
		INSERT INTO account_balance_snapshots (
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
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'plaid')
	`);

	db.exec('BEGIN');
	try {
		for (const row of rows) {
			insert.run(
				row.snapshotTime,
				row.itemLabel,
				row.itemId,
				row.accountId,
				row.accountName,
				row.accountMask,
				row.accountType,
				row.accountSubtype,
				row.balanceCurrent,
				row.balanceAvailable,
				row.balanceLimit,
				row.isoCurrencyCode,
				row.unofficialCurrencyCode
			);
		}
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return rows.length;
}

export async function recordPlaidBalanceSnapshot(
	now: Date = new Date()
): Promise<RecordPlaidBalanceSnapshotResult> {
	const snapshotTime = now.toISOString();

	if (!isPlaidLinked(personalSecrets)) {
		return {
			snapshotTime,
			inserted: 0,
			failures: [],
			skipped: true,
			message: 'Plaid is not fully configured or linked in personal-info.local.ts'
		};
	}

	const { plaid } = personalSecrets;
	const linkedItems = getPlaidLinkedItems(plaid);
	const failures: Array<{ itemLabel: string; error: string }> = [];
	const rows: SnapshotRow[] = [];

	for (const item of linkedItems) {
		try {
			const itemRows = await fetchRowsForItem(plaid, item, snapshotTime);
			rows.push(...itemRows);
		} catch (error) {
			failures.push({
				itemLabel: resolveItemLabel(item),
				error: formatPlaidApiError(error)
			});
		}
	}

	const inserted = insertSnapshotRows(rows);

	return {
		snapshotTime,
		inserted,
		failures,
		skipped: false,
		message: null
	};
}
