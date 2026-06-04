import { fetchAccountBalances } from '$lib/server/plaid-balances';
import { fetchCurrentWeather } from '$lib/server/open-weather';
import { fetchRecentTransactions } from '$lib/server/plaid-transactions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [
		{ transactions, error: transactionsError },
		{ weather, error: weatherError },
		{ accounts, error: accountBalancesError }
	] = await Promise.all([
		fetchRecentTransactions(5),
		fetchCurrentWeather(),
		fetchAccountBalances()
	]);

	return {
		transactions,
		transactionsError,
		accounts,
		accountBalancesError,
		weather,
		weatherError
	};
};
