import type { InvestmentTransaction, Security, Transaction } from 'plaid';
import { withCache } from '$lib/server/db/cache';
import { isInvestingAccountLabel } from '$lib/hooks/finances/account-balances';
import { apiSecrets } from '$lib/server/config/secrets';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/config/integration-config';
import { formatAccountTypeLabel } from '$lib/server/plaid/plaid-account-label';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';
import type { TransactionIcon, TransactionItem } from '$lib/hooks/finances/transactions';
import { spendingTransactionFetchStartDayKey } from '$lib/hooks/finances/spending-time-range';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Max transactions pulled per linked item (calendar year window). */
export const DASHBOARD_TRANSACTION_FETCH_COUNT = 500;

function transactionFetchStartDate(): string {
	return spendingTransactionFetchStartDayKey();
}

function toDateString(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return d.toISOString().slice(0, 10);
}

function toTitleCase(value: string): string {
	return value
		.toLowerCase()
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCategoryLabel(transaction: Transaction): string {
	const primary = transaction.personal_finance_category?.primary;
	if (primary) {
		return toTitleCase(primary);
	}
	const legacy = transaction.category?.filter((c) => c !== 'Payment');
	return legacy?.[0] ? toTitleCase(legacy[0]) : 'Other';
}

function formatInvestmentCategory(transaction: InvestmentTransaction): string {
	const subtype = transaction.subtype?.trim();
	if (subtype) {
		return toTitleCase(subtype);
	}

	return toTitleCase(transaction.type);
}

function categoryIcon(category: string): TransactionIcon {
	const key = category.toLowerCase();
	if (key.includes('food') || key.includes('restaurant') || key.includes('coffee')) return 'coffee';
	if (key.includes('grocery') || key.includes('groceries') || key.includes('shops')) return 'cart';
	if (
		key.includes('income') ||
		key.includes('deposit') ||
		key.includes('payroll') ||
		key.includes('transfer in') ||
		key.includes('dividend') ||
		key.includes('interest')
	)
		return 'wallet';
	if (
		key.includes('transport') ||
		key.includes('travel') ||
		key.includes('gas') ||
		key.includes('automotive')
	)
		return 'car';
	if (key.includes('entertain') || key.includes('recreation') || key.includes('subscription'))
		return 'tv';
	return 'default';
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTransactionDate(dateStr: string, datetimeStr?: string | null): string {
	const posted = startOfDay(new Date(`${dateStr}T12:00:00`));
	const today = startOfDay(new Date());
	const diffDays = Math.round((today.getTime() - posted.getTime()) / 86_400_000);

	if (diffDays === 0) {
		if (datetimeStr) {
			const time = new Date(datetimeStr).toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit'
			});
			return `Today, ${time}`;
		}
		return 'Today';
	}
	if (diffDays === 1) return 'Yesterday';

	return posted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function transactionSortKey(transaction: Transaction): string {
	return transaction.datetime ?? `${transaction.date}T12:00:00`;
}

function investmentTransactionSortKey(transaction: InvestmentTransaction): string {
	return transaction.transaction_datetime ?? `${transaction.date}T12:00:00`;
}

function formatAmountLabel(amount: number): { amountLabel: string; isIncome: boolean } {
	const isIncome = amount < 0;
	const amountLabel = isIncome ? `+${money.format(Math.abs(amount))}` : `-${money.format(amount)}`;

	return { amountLabel, isIncome };
}

function resolveInvestmentMerchant(
	transaction: InvestmentTransaction,
	securitiesById: Map<string, Security>
): string {
	const security = transaction.security_id
		? securitiesById.get(transaction.security_id)
		: undefined;

	if (security?.ticker_symbol && security.name) {
		return `${security.ticker_symbol} · ${security.name}`;
	}

	return security?.ticker_symbol ?? security?.name ?? transaction.name;
}

function mapTransaction(
	transaction: Transaction,
	sourceId: string,
	bankLabel: string,
	accountLabels: Map<string, string>
): TransactionItem {
	const category = formatCategoryLabel(transaction);
	const amount = transaction.amount;
	const { amountLabel, isIncome } = formatAmountLabel(amount);

	return {
		id: transaction.transaction_id,
		sourceId,
		accountId: transaction.account_id,
		bankLabel,
		accountLabel: accountLabels.get(transaction.account_id) ?? 'Account',
		merchant: transaction.merchant_name ?? transaction.name,
		category,
		dateLabel: formatTransactionDate(transaction.date, transaction.datetime),
		sortDate: transactionSortKey(transaction),
		amount,
		amountLabel,
		isIncome,
		icon: categoryIcon(category)
	};
}

function mapInvestmentTransaction(
	transaction: InvestmentTransaction,
	sourceId: string,
	bankLabel: string,
	accountLabels: Map<string, string>,
	securitiesById: Map<string, Security>
): TransactionItem {
	const category = formatInvestmentCategory(transaction);
	const amount = transaction.amount;
	const { amountLabel, isIncome } = formatAmountLabel(amount);

	return {
		id: transaction.investment_transaction_id,
		sourceId,
		accountId: transaction.account_id,
		bankLabel,
		accountLabel: accountLabels.get(transaction.account_id) ?? 'Account',
		merchant: resolveInvestmentMerchant(transaction, securitiesById),
		category,
		dateLabel: formatTransactionDate(transaction.date, transaction.transaction_datetime),
		sortDate: investmentTransactionSortKey(transaction),
		amount,
		amountLabel,
		isIncome,
		icon: categoryIcon(category)
	};
}

function sortByRecency(transactions: Transaction[]): Transaction[] {
	return [...transactions].sort((a, b) =>
		transactionSortKey(b).localeCompare(transactionSortKey(a))
	);
}

function sortInvestmentsByRecency(transactions: InvestmentTransaction[]): InvestmentTransaction[] {
	return [...transactions].sort((a, b) =>
		investmentTransactionSortKey(b).localeCompare(investmentTransactionSortKey(a))
	);
}

function mapTransactions(
	transactions: Transaction[],
	sourceId: string,
	bankLabel: string,
	accountLabels: Map<string, string>
): TransactionItem[] {
	return transactions.map((transaction) =>
		mapTransaction(transaction, sourceId, bankLabel, accountLabels)
	);
}

function mapInvestmentTransactions(
	transactions: InvestmentTransaction[],
	sourceId: string,
	bankLabel: string,
	accountLabels: Map<string, string>,
	securitiesById: Map<string, Security>
): TransactionItem[] {
	return transactions.map((transaction) =>
		mapInvestmentTransaction(transaction, sourceId, bankLabel, accountLabels, securitiesById)
	);
}

function sortTransactionItems(transactions: TransactionItem[]): TransactionItem[] {
	return [...transactions].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() ?? 'Account';
}

async function fetchBankingTransactionsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	count: number
): Promise<{ transactions: TransactionItem[]; error: string | null }> {
	const client = createPlaidClient(plaid);
	const sourceId = item.itemId ?? item.accessToken;
	const bankLabel = resolveItemLabel(item);

	try {
		const transactionsResponse = await client.transactionsGet({
			access_token: item.accessToken,
			start_date: transactionFetchStartDate(),
			end_date: toDateString(0),
			options: { count, offset: 0 }
		});

		const { transactions, accounts } = transactionsResponse.data;
		const accountLabels = new Map(
			accounts.map((account) => [account.account_id, formatAccountTypeLabel(account)])
		);
		const sorted = sortByRecency(transactions);

		return {
			transactions: mapTransactions(sorted, sourceId, bankLabel, accountLabels),
			error: null
		};
	} catch (error) {
		return {
			transactions: [],
			error: formatPlaidApiError(error)
		};
	}
}

async function fetchInvestmentTransactionsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	count: number
): Promise<{ transactions: TransactionItem[]; error: string | null }> {
	const client = createPlaidClient(plaid);
	const sourceId = item.itemId ?? item.accessToken;
	const bankLabel = resolveItemLabel(item);

	try {
		const response = await client.investmentsTransactionsGet({
			access_token: item.accessToken,
			start_date: transactionFetchStartDate(),
			end_date: toDateString(0),
			options: { count, offset: 0 }
		});

		const { investment_transactions, accounts, securities } = response.data;
		const accountLabels = new Map(
			accounts.map((account) => [account.account_id, formatAccountTypeLabel(account)])
		);
		const securitiesById = new Map(securities.map((security) => [security.security_id, security]));
		const sorted = sortInvestmentsByRecency(investment_transactions);

		return {
			transactions: mapInvestmentTransactions(
				sorted,
				sourceId,
				bankLabel,
				accountLabels,
				securitiesById
			),
			error: null
		};
	} catch (error) {
		return {
			transactions: [],
			error: formatPlaidApiError(error)
		};
	}
}

async function fetchTransactionsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	count: number
): Promise<{ transactions: TransactionItem[]; error: string | null }> {
	const label = resolveItemLabel(item);
	const preferInvestmentsApi =
		isInvestingAccountLabel(label) && plaid.environment !== 'sandbox';

	if (preferInvestmentsApi) {
		const investmentResult = await fetchInvestmentTransactionsForItem(plaid, item, count);

		if (!investmentResult.error) {
			return investmentResult;
		}

		const bankingResult = await fetchBankingTransactionsForItem(plaid, item, count);

		if (!bankingResult.error || bankingResult.transactions.length > 0) {
			return bankingResult;
		}

		return investmentResult;
	}

	return fetchBankingTransactionsForItem(plaid, item, count);
}

export type FetchTransactionsResult = {
	transactions: TransactionItem[];
	error: string | null;
};

const TRANSACTIONS_CACHE_TTL_MS = 2 * 60 * 1000;

export async function fetchRecentTransactions(count = 12): Promise<FetchTransactionsResult> {
	if (!isPlaidLinked(apiSecrets)) {
		return {
			transactions: [],
			error: 'Plaid access token is not set in secrets.local.ts'
		};
	}

	const { plaid } = apiSecrets;
	const cacheKey = `plaid-transactions:v7:${plaid.environment}:${count}:${getPlaidLinkedItems(plaid)
		.map((item) => item.itemId ?? item.accessToken)
		.join(',')}`;

	return withCache(cacheKey, TRANSACTIONS_CACHE_TTL_MS, () =>
		fetchRecentTransactionsUncached(plaid, count)
	);
}

async function fetchRecentTransactionsUncached(
	plaid: PlaidConfig,
	count: number
): Promise<FetchTransactionsResult> {
	const linkedItems = getPlaidLinkedItems(plaid);

	if (linkedItems.length === 0) {
		return {
			transactions: [],
			error: 'Plaid access token is not set in secrets.local.ts'
		};
	}

	const results = await Promise.all(
		linkedItems.map((item) => fetchTransactionsForItem(plaid, item, count))
	);

	const transactions = sortTransactionItems(results.flatMap((result) => result.transactions));
	const errors = [
		...new Set(
			results.map((result) => result.error).filter((message): message is string => !!message)
		)
	];

	if (transactions.length === 0 && errors.length > 0) {
		return { transactions: [], error: errors[0] };
	}

	if (errors.length > 0) {
		return {
			transactions,
			error: `Some transactions could not be loaded: ${errors.join('; ')}`
		};
	}

	return { transactions, error: null };
}
