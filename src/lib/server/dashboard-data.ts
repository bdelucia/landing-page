import { fetchAccountBalances } from '$lib/server/plaid-balances';
import { fetchCurrentWeather } from '$lib/server/open-weather';
import { fetchRecentTransactions } from '$lib/server/plaid-transactions';
import type { AccountBalanceItem } from '$lib/account-balances';
import type { TransactionItem } from '$lib/transactions';
import type { WeatherDisplay } from '$lib/weather';

export type DashboardWeather = {
	weather: WeatherDisplay | null;
	weatherError: string | null;
};

export type DashboardFinances = {
	transactions: TransactionItem[];
	transactionsError: string | null;
	accounts: AccountBalanceItem[];
	accountBalancesError: string | null;
};

export function loadDashboardWeather(): Promise<DashboardWeather> {
	return fetchCurrentWeather()
		.then(({ weather, error }) => ({ weather, weatherError: error }))
		.catch((error: unknown) => ({
			weather: null,
			weatherError: error instanceof Error ? error.message : 'Failed to load weather'
		}));
}

export function loadDashboardFinances(): Promise<DashboardFinances> {
	return Promise.all([fetchRecentTransactions(5), fetchAccountBalances()])
		.then(([transactionsResult, accountsResult]) => ({
			transactions: transactionsResult.transactions,
			transactionsError: transactionsResult.error,
			accounts: accountsResult.accounts,
			accountBalancesError: accountsResult.error
		}))
		.catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Failed to load account data';
			return {
				transactions: [],
				transactionsError: message,
				accounts: [],
				accountBalancesError: message
			};
		});
}
