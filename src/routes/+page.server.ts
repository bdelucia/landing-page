import { fetchRecentTransactions } from '$lib/server/plaid-transactions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { transactions, error } = await fetchRecentTransactions(5);
	return {
		transactions,
		transactionsError: error
	};
};
