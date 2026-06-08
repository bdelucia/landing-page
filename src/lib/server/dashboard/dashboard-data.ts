import type { DashboardFinances, DashboardWeather } from '$lib/hooks/dashboard/dashboard-data';
import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidLinked } from '$lib/server/config/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/balances/latest-balance-snapshots';
import { fetchCurrentWeather } from '$lib/server/weather/open-weather';
import { fetchRecentTransactions } from '$lib/server/plaid/plaid-transactions';

export type { DashboardFinances, DashboardWeather } from '$lib/hooks/dashboard/dashboard-data';

export function loadDashboardWeather(): Promise<DashboardWeather> {
	return fetchCurrentWeather()
		.then(({ weather, error }) => ({ weather, weatherError: error }))
		.catch((error: unknown) => ({
			weather: null,
			weatherError: error instanceof Error ? error.message : 'Failed to load weather'
		}));
}

export function loadDashboardFinances(): Promise<DashboardFinances> {
	return fetchRecentTransactions(5)
		.then((transactionsResult) => {
			if (!isPlaidLinked(apiSecrets)) {
				return {
					transactions: transactionsResult.transactions,
					transactionsError: transactionsResult.error,
					accounts: [],
					accountBalancesError: 'Plaid access token is not set in secrets.local.ts',
					bankAccountDetails: {},
					bankAccountDetailsError: 'Plaid access token is not set in secrets.local.ts'
				};
			}

			const balances = loadLatestBalancesFromDb(apiSecrets.plaid);

			return {
				transactions: transactionsResult.transactions,
				transactionsError: transactionsResult.error,
				accounts: balances.accounts,
				accountBalancesError: balances.error,
				bankAccountDetails: balances.byItemId,
				bankAccountDetailsError: balances.error
			};
		})
		.catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Failed to load account data';
			return {
				transactions: [],
				transactionsError: message,
				accounts: [],
				accountBalancesError: message,
				bankAccountDetails: {},
				bankAccountDetailsError: message
			};
		});
}
