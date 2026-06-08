import type { DashboardFinances, DashboardWeather } from '$lib/dashboard-data';
import { personalSecrets } from '$lib/server/personal-secrets';
import { isPlaidLinked } from '$lib/server/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/latest-balance-snapshots';
import { fetchCurrentWeather } from '$lib/server/open-weather';
import { fetchRecentTransactions } from '$lib/server/plaid-transactions';

export type { DashboardFinances, DashboardWeather } from '$lib/dashboard-data';

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
			if (!isPlaidLinked(personalSecrets)) {
				return {
					transactions: transactionsResult.transactions,
					transactionsError: transactionsResult.error,
					accounts: [],
					accountBalancesError: 'Plaid access token is not set in personal-info.local.ts',
					bankAccountDetails: {},
					bankAccountDetailsError: 'Plaid access token is not set in personal-info.local.ts'
				};
			}

			const balances = loadLatestBalancesFromDb(personalSecrets.plaid);

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
