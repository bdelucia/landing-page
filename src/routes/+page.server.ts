import { fetchCurrentWeather } from '$lib/server/open-weather';
import { fetchRecentTransactions } from '$lib/server/plaid-transactions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [{ transactions, error: transactionsError }, { weather, error: weatherError }] =
		await Promise.all([fetchRecentTransactions(5), fetchCurrentWeather()]);

	return {
		transactions,
		transactionsError,
		weather,
		weatherError
	};
};
