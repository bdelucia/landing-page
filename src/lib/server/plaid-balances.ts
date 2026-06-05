import type { AccountBase } from 'plaid';
import { withCache } from '$lib/server/cache';
import { personalSecrets } from '$lib/server/personal-secrets';
import {
	accountBalanceDisplayOrder,
	type AccountBalanceItem
} from '$lib/account-balances';
import { accountBalanceIcon } from '$lib/account-balance-icons';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/integration-config';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/personal-info.types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function accountBalanceAmount(account: AccountBase): number {
	const { current, available } = account.balances;
	if (current != null) return current;
	if (available != null) return available;
	return 0;
}

function sumAccountBalances(accounts: AccountBase[]): number {
	return accounts.reduce((total, account) => total + accountBalanceAmount(account), 0);
}

function resolveLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() ?? 'Account';
}

async function fetchBalanceForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<AccountBalanceItem> {
	const label = resolveLabel(item);
	const icon = accountBalanceIcon(label);
	const id = item.itemId ?? item.accessToken;

	if (!icon) {
		return {
			id,
			label,
			icon: '',
			balanceLabel: '—',
			error: `No icon configured for "${label}"`
		};
	}

	const client = createPlaidClient(plaid);

	try {
		const response = await client.accountsBalanceGet({ access_token: item.accessToken });
		const total = sumAccountBalances(response.data.accounts);

		return {
			id,
			label,
			icon,
			balanceLabel: money.format(total)
		};
	} catch (error) {
		return {
			id,
			label,
			icon,
			balanceLabel: '—',
			error: formatPlaidApiError(error)
		};
	}
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

export type FetchAccountBalancesResult = {
	accounts: AccountBalanceItem[];
	error: string | null;
};

const BALANCES_CACHE_TTL_MS = 2 * 60 * 1000;
const BALANCES_STALE_CACHE_TTL_MS = 10 * 60 * 1000;

export async function fetchAccountBalances(): Promise<FetchAccountBalancesResult> {
	if (!isPlaidLinked(personalSecrets)) {
		return {
			accounts: [],
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const { plaid } = personalSecrets;
	const cacheKey = `plaid-balances:${plaid.environment}:${getPlaidLinkedItems(plaid)
		.map((item) => item.itemId ?? item.accessToken)
		.join(',')}`;

	return withCache(cacheKey, BALANCES_CACHE_TTL_MS, () => fetchAccountBalancesUncached(plaid), {
		allowStale: true,
		staleTtlMs: BALANCES_STALE_CACHE_TTL_MS
	});
}

async function fetchAccountBalancesUncached(plaid: PlaidConfig): Promise<FetchAccountBalancesResult> {
	const linkedItems = getPlaidLinkedItems(plaid);
	const accounts = sortByDisplayOrder(
		await Promise.all(linkedItems.map((item) => fetchBalanceForItem(plaid, item)))
	);

	const errors = accounts.map((account) => account.error).filter((message): message is string => !!message);

	if (accounts.length === 0 && errors.length > 0) {
		return { accounts: [], error: errors[0] };
	}

	if (errors.length > 0 && accounts.some((account) => account.balanceLabel !== '—')) {
		return {
			accounts,
			error: `Some balances could not be loaded: ${errors.join('; ')}`
		};
	}

	if (errors.length > 0) {
		return { accounts, error: errors[0] };
	}

	return { accounts, error: null };
}
