import type { DashboardFinances, DashboardWeather } from '$lib/dashboard-data';
import { fetchAccountBalances } from '$lib/server/plaid-balances';
import { fetchBankAccountDetails } from '$lib/server/plaid-bank-accounts';
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
	return Promise.all([fetchRecentTransactions(5), fetchAccountBalances(), fetchBankAccountDetails()])
		.then(([transactionsResult, accountsResult, bankAccountsResult]) => ({
			transactions: transactionsResult.transactions,
			transactionsError: transactionsResult.error,
			accounts: accountsResult.accounts,
			accountBalancesError: accountsResult.error,
			bankAccountDetails: bankAccountsResult.byItemId,
			bankAccountDetailsError: bankAccountsResult.error
		}))
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
