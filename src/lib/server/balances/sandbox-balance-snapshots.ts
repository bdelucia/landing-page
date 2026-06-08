import {
	dummySnapshotAccountFromPlaidAccount,
	ensureDummyBalanceSnapshots
} from '$lib/server/balances/dummy-balance-snapshots';
import {
	fetchLatestSnapshotRows,
	snapshotRowsForItem
} from '$lib/server/balances/latest-balance-snapshots';
import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid/plaid';
import { ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE } from '$lib/server/db/database';
import type { PlaidConfig } from '$data/api-config.types';

function resolveItemLabel(item: { label?: string }): string {
	return item.label?.trim() || 'Account';
}

export async function ensureSandboxBalanceSnapshots(plaid: PlaidConfig): Promise<void> {
	if (plaid.environment !== 'sandbox') {
		return;
	}

	const linkedItems = getPlaidLinkedItems(plaid);
	let snapshotRows = fetchLatestSnapshotRows(ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE);
	const client = createPlaidClient(plaid);

	for (const item of linkedItems) {
		const itemLabel = resolveItemLabel(item);

		if (snapshotRowsForItem(snapshotRows, item).length > 0) {
			continue;
		}

		try {
			const response = await client.accountsBalanceGet({ access_token: item.accessToken });
			const accounts = response.data.accounts.map(dummySnapshotAccountFromPlaidAccount);

			if (accounts.length === 0) {
				continue;
			}

			ensureDummyBalanceSnapshots(accounts, itemLabel, item.itemId ?? null);
			snapshotRows = fetchLatestSnapshotRows(ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE);
		} catch (error) {
			console.warn(
				`Failed to seed sandbox dummy balances for "${itemLabel}": ${formatPlaidApiError(error)}`
			);
		}
	}
}

export async function prepareBalanceSnapshots(plaid: PlaidConfig): Promise<void> {
	await ensureSandboxBalanceSnapshots(plaid);
}
