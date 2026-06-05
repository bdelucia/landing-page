import type { AccountBalanceItem } from '$lib/account-balances';
import type { BankAccountDetailsByItem } from '$lib/bank-accounts';
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
	bankAccountDetails: BankAccountDetailsByItem;
	bankAccountDetailsError: string | null;
};
