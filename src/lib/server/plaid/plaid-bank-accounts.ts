import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidLinked } from '$lib/server/config/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/balances/latest-balance-snapshots';
import type { BankAccountDetailsByItem } from '$lib/hooks/finances/bank-accounts';

export type FetchBankAccountDetailsResult = {
	byItemId: BankAccountDetailsByItem;
	error: string | null;
};

export async function fetchBankAccountDetails(): Promise<FetchBankAccountDetailsResult> {
	if (!isPlaidLinked(apiSecrets)) {
		return {
			byItemId: {},
			error: 'Plaid access token is not set in secrets.local.ts'
		};
	}

	const { byItemId, error } = loadLatestBalancesFromDb(apiSecrets.plaid);

	return {
		byItemId,
		error
	};
}
