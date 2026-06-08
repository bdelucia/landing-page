import { personalSecrets } from '$lib/server/personal-secrets';
import { isPlaidLinked } from '$lib/server/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/latest-balance-snapshots';
import type { AccountBalanceItem } from '$lib/account-balances';

export type FetchAccountBalancesResult = {
	accounts: AccountBalanceItem[];
	error: string | null;
};

export async function fetchAccountBalances(): Promise<FetchAccountBalancesResult> {
	if (!isPlaidLinked(personalSecrets)) {
		return {
			accounts: [],
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const { accounts, error } = loadLatestBalancesFromDb(personalSecrets.plaid);

	return {
		accounts,
		error
	};
}
