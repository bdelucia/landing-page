import { personalSecrets } from '$lib/server/personal-secrets';
import { isPlaidLinked } from '$lib/server/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/latest-balance-snapshots';
import type { BankAccountDetailsByItem } from '$lib/bank-accounts';

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

	const { byItemId, error } = loadLatestBalancesFromDb(personalSecrets.plaid);

	return {
		byItemId,
		error
	};
}
