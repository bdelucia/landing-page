import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import { fetchLiveBalancesForItem } from '$lib/server/plaid/plaid-balance-snapshots';
import { formatPlaidApiError } from '$lib/server/plaid/plaid';
import { plaidItemSlug, resolvePlaidItemLabel } from '$lib/plaid/plaid-item-slug';
import type { PlaidConfig } from '$data/api-config.types';

export type BalanceTestAccount = {
	accountId: string;
	name: string;
	mask: string | null;
	type: string | null;
	subtype: string | null;
	balanceCurrent: number | null;
	balanceAvailable: number | null;
	currency: string | null;
};

export type BalanceTestItemResult = {
	label: string;
	slug: string;
	ok: boolean;
	itemId: string | null;
	accounts: BalanceTestAccount[];
	error: string | null;
};

export type BalanceTestResult = {
	fetchedAt: string;
	items: BalanceTestItemResult[];
	summary: {
		total: number;
		passed: number;
		failed: number;
		accountCount: number;
	};
};

export async function testAllPlaidBalances(plaid: PlaidConfig): Promise<BalanceTestResult> {
	const fetchedAt = new Date().toISOString();
	const items: BalanceTestItemResult[] = [];

	for (const item of getPlaidLinkedItems(plaid)) {
		const label = resolvePlaidItemLabel(item);
		const slug = plaidItemSlug(label);

		try {
			const { itemId, accounts } = await fetchLiveBalancesForItem(plaid, item);

			if (accounts.length === 0) {
				items.push({
					label,
					slug,
					ok: false,
					itemId,
					accounts: [],
					error: 'Plaid returned no accounts for this item'
				});
				continue;
			}

			items.push({
				label,
				slug,
				ok: true,
				itemId,
				accounts,
				error: null
			});
		} catch (error) {
			items.push({
				label,
				slug,
				ok: false,
				itemId: item.itemId ?? null,
				accounts: [],
				error: formatPlaidApiError(error)
			});
		}
	}

	const passed = items.filter((item) => item.ok).length;

	return {
		fetchedAt,
		items,
		summary: {
			total: items.length,
			passed,
			failed: items.length - passed,
			accountCount: items.reduce((count, item) => count + item.accounts.length, 0)
		}
	};
}
