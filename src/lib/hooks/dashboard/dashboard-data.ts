import type { AccountBalanceItem } from '$lib/hooks/finances/account-balances';
import type { BankAccountDetailsByItem } from '$lib/hooks/finances/bank-accounts';
import type { TransactionItem } from '$lib/hooks/finances/transactions';
import type { WeatherDisplay } from '$lib/hooks/weather/weather';

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
