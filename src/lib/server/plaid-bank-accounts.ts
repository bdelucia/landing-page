import type { AccountBase } from 'plaid';
import { withCache } from '$lib/server/cache';
import {
	debtBalanceFromRaw,
	formatDebtBalanceLabel,
	isDebtAccountLabel
} from '$lib/account-balances';
import {
	type BankAccountDetailsByItem,
	type BankAccountItem
} from '$lib/bank-accounts';
import { personalSecrets } from '$lib/server/personal-secrets';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/integration-config';
import { buildAccountBalanceHistory } from '$lib/server/account-balance-history';
import {
	dummySnapshotAccountFromBankItem,
	ensureDummyBalanceSnapshots,
	type DummySnapshotAccount
} from '$lib/server/dummy-balance-snapshots';
import { formatAccountTypeLabel } from '$lib/server/plaid-account-label';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/personal-info.types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function accountBalanceAmount(account: AccountBase): number {
	const { current, available } = account.balances;
	if (current != null) return current;
	if (available != null) return available;
	return 0;
}

function mapAccount(account: AccountBase, itemId: string, isDebt: boolean): BankAccountItem {
	const rawBalance = accountBalanceAmount(account);
	const balance = isDebt ? debtBalanceFromRaw(rawBalance) : rawBalance;

	return {
		id: account.account_id,
		itemId,
		typeLabel: formatAccountTypeLabel(account),
		mask: account.mask?.trim() ?? null,
		balanceLabel: isDebt ? formatDebtBalanceLabel(rawBalance) : money.format(rawBalance),
		balance,
		isDebt
	};
}

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

function toDummySnapshotAccount(account: AccountBase): DummySnapshotAccount {
	const rawBalance = accountBalanceAmount(account);

	return {
		accountId: account.account_id,
		accountName: account.name ?? 'Account',
		accountMask: account.mask?.trim() ?? null,
		accountType: account.type ?? null,
		accountSubtype: account.subtype ?? null,
		balance: rawBalance
	};
}

async function fetchAccountsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<{
	itemKey: string;
	plaidItemId: string | null;
	itemLabel: string;
	accounts: BankAccountItem[];
	seedAccounts: DummySnapshotAccount[];
	error: string | null;
}> {
	const itemKey = item.itemId ?? item.accessToken;
	const itemLabel = resolveItemLabel(item);
	const isDebt = isDebtAccountLabel(itemLabel);
	const client = createPlaidClient(plaid);

	try {
		const response = await client.accountsBalanceGet({ access_token: item.accessToken });
		const paired = response.data.accounts.map((account) => ({
			raw: account,
			mapped: mapAccount(account, itemKey, isDebt)
		}));
		const accounts = paired
			.map(({ mapped }) => mapped)
			.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));
		const seedAccounts = paired.map(({ raw }) => toDummySnapshotAccount(raw));

		return {
			itemKey,
			plaidItemId: item.itemId ?? null,
			itemLabel,
			accounts,
			seedAccounts,
			error: null
		};
	} catch (error) {
		return {
			itemKey,
			plaidItemId: item.itemId ?? null,
			itemLabel,
			accounts: [],
			seedAccounts: [],
			error: formatPlaidApiError(error)
		};
	}
}

const BANK_ACCOUNTS_CACHE_TTL_MS = 2 * 60 * 1000;

export type FetchBankAccountDetailsResult = {
	byItemId: BankAccountDetailsByItem;
	error: string | null;
};

export async function fetchBankAccountDetails(): Promise<FetchBankAccountDetailsResult> {
	if (!isPlaidLinked(personalSecrets)) {
		return {
			byItemId: {},
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const { plaid } = personalSecrets;
	const cacheKey = `plaid-bank-accounts:v10:${plaid.environment}:${getPlaidLinkedItems(plaid)
		.map((item) => item.itemId ?? item.accessToken)
		.join(',')}`;

	return withCache(cacheKey, BANK_ACCOUNTS_CACHE_TTL_MS, () =>
		fetchBankAccountDetailsUncached(plaid)
	);
}

async function fetchBankAccountDetailsUncached(
	plaid: PlaidConfig
): Promise<FetchBankAccountDetailsResult> {
	const linkedItems = getPlaidLinkedItems(plaid);
	const results = await Promise.all(linkedItems.map((item) => fetchAccountsForItem(plaid, item)));
	const useDummyHistory = plaid.environment === 'sandbox';

	const byItemId: BankAccountDetailsByItem = {};
	const errors = results
		.map((result) => result.error)
		.filter((message): message is string => !!message);

	for (const result of results) {
		if (useDummyHistory && result.seedAccounts.length > 0) {
			ensureDummyBalanceSnapshots(result.seedAccounts, result.itemLabel, result.plaidItemId);
		}

		const history = buildAccountBalanceHistory({
			accounts: result.accounts,
			bankLabel: result.itemLabel,
			useDummyData: useDummyHistory
		});

		byItemId[result.itemKey] = history;
	}

	if (Object.keys(byItemId).length === 0 && errors.length > 0) {
		return { byItemId: {}, error: errors[0] };
	}

	if (errors.length > 0) {
		return {
			byItemId,
			error: `Some account details could not be loaded: ${errors.join('; ')}`
		};
	}

	return { byItemId, error: null };
}
