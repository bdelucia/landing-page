import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidLinked } from '$lib/server/config/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/balances/latest-balance-snapshots';
import { prepareBalanceSnapshots } from '$lib/server/balances/sandbox-balance-snapshots';
import type { AccountBalanceItem } from '$lib/hooks/finances/account-balances';

export type FetchAccountBalancesResult = {
	accounts: AccountBalanceItem[];
	error: string | null;
};

export async function fetchAccountBalances(): Promise<FetchAccountBalancesResult> {
	if (!isPlaidLinked(apiSecrets)) {
		return {
			accounts: [],
			error: 'Plaid access token is not set in secrets.local.ts'
		};
	}

	await prepareBalanceSnapshots(apiSecrets.plaid);
	const { accounts, error } = loadLatestBalancesFromDb(apiSecrets.plaid);

	return {
		accounts,
		error
	};
}
