import type { AccountBase } from 'plaid';
import { getDatabase } from '$lib/server/db/database';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/config/integration-config';
import { apiSecrets } from '$lib/server/config/secrets';
import {
	fetchInvestmentAccountsWithBalances,
	shouldUseInvestmentsBalanceApi
} from '$lib/server/plaid/plaid-investment-balances';
import {
	findLinkedItemByPlaidItemId,
	resolvePlaidItemIdForItem
} from '$lib/server/plaid/plaid-item-registry';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';

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
	snapshotTime: string,
	plaidItemId: string | null = item.itemId ?? null
): SnapshotRow {
	return {
		snapshotTime,
		itemLabel: resolveItemLabel(item),
		itemId: plaidItemId,
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

async function fetchRowsViaBalanceGet(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	snapshotTime: string,
	resolvedItemId: string | null
): Promise<SnapshotRow[]> {
	const client = createPlaidClient(plaid);
	const response = await client.accountsBalanceGet({ access_token: item.accessToken });
	return response.data.accounts.map((account) =>
		toSnapshotRow(account, item, snapshotTime, resolvedItemId)
	);
}

async function fetchRowsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	snapshotTime: string,
	plaidItemId: string | null = null
): Promise<SnapshotRow[]> {
	const resolvedItemId = plaidItemId ?? (await resolvePlaidItemIdForItem(plaid, item));
	const itemLabel = resolveItemLabel(item);

	if (shouldUseInvestmentsBalanceApi(itemLabel, plaid.environment)) {
		try {
			const accounts = await fetchInvestmentAccountsWithBalances(plaid, item);
			return accounts.map((account) =>
				toSnapshotRow(account, item, snapshotTime, resolvedItemId)
			);
		} catch (investmentsError) {
			console.warn(
				`[balance-sync] Investments holdings fetch failed for "${itemLabel}", falling back to /accounts/balance/get: ${formatPlaidApiError(investmentsError)}`
			);
		}
	}

	return fetchRowsViaBalanceGet(plaid, item, snapshotTime, resolvedItemId);
}

export type RecordPlaidBalanceSnapshotForItemResult = {
	snapshotTime: string;
	inserted: number;
	itemLabel: string | null;
	skipped: boolean;
	message: string | null;
};

export async function recordPlaidBalanceSnapshotForItem(
	plaidItemId: string,
	now: Date = new Date()
): Promise<RecordPlaidBalanceSnapshotForItemResult> {
	const snapshotTime = now.toISOString();

	if (!isPlaidLinked(apiSecrets)) {
		return {
			snapshotTime,
			inserted: 0,
			itemLabel: null,
			skipped: true,
			message: 'Plaid is not fully configured or linked in secrets.local.ts'
		};
	}

	const { plaid } = apiSecrets;
	const item = await findLinkedItemByPlaidItemId(plaid, plaidItemId);

	if (!item) {
		return {
			snapshotTime,
			inserted: 0,
			itemLabel: null,
			skipped: true,
			message: `No linked Plaid item matches item_id "${plaidItemId}"`
		};
	}

	try {
		const rows = await fetchRowsForItem(plaid, item, snapshotTime, plaidItemId);
		const inserted = insertSnapshotRows(rows);

		return {
			snapshotTime,
			inserted,
			itemLabel: resolveItemLabel(item),
			skipped: false,
			message: inserted > 0 ? null : 'Plaid returned no accounts for this item'
		};
	} catch (error) {
		return {
			snapshotTime,
			inserted: 0,
			itemLabel: resolveItemLabel(item),
			skipped: false,
			message: formatPlaidApiError(error)
		};
	}
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

	if (!isPlaidLinked(apiSecrets)) {
		return {
			snapshotTime,
			inserted: 0,
			failures: [],
			skipped: true,
			message: 'Plaid is not fully configured or linked in secrets.local.ts'
		};
	}

	const { plaid } = apiSecrets;
	const linkedItems = getPlaidLinkedItems(plaid);
	const failures: Array<{ itemLabel: string; error: string }> = [];
	const rows: SnapshotRow[] = [];

	for (const item of linkedItems) {
		const itemLabel = resolveItemLabel(item);

		try {
			const itemRows = await fetchRowsForItem(plaid, item, snapshotTime);
			rows.push(...itemRows);
		} catch (error) {
			const message = formatPlaidApiError(error);
			failures.push({
				itemLabel,
				error: message
			});
			console.error(`[balance-sync] Failed to sync "${itemLabel}": ${message}`);
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
