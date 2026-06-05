import type { Transaction } from 'plaid';
import { withCache } from '$lib/server/cache';
import { personalSecrets } from '$lib/server/personal-secrets';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/integration-config';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/personal-info.types';
import type { TransactionIcon, TransactionItem } from '$lib/transactions';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function toDateString(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return d.toISOString().slice(0, 10);
}

function toTitleCase(value: string): string {
	return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCategoryLabel(transaction: Transaction): string {
	const primary = transaction.personal_finance_category?.primary;
	if (primary) {
		return toTitleCase(primary);
	}
	const legacy = transaction.category?.filter((c) => c !== 'Payment');
	return legacy?.[0] ? toTitleCase(legacy[0]) : 'Other';
}

function categoryIcon(category: string): TransactionIcon {
	const key = category.toLowerCase();
	if (key.includes('food') || key.includes('restaurant') || key.includes('coffee')) return 'coffee';
	if (key.includes('grocery') || key.includes('groceries') || key.includes('shops')) return 'cart';
	if (
		key.includes('income') ||
		key.includes('deposit') ||
		key.includes('payroll') ||
		key.includes('transfer in')
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

function mapTransaction(transaction: Transaction, sourceId: string): TransactionItem {
	const category = formatCategoryLabel(transaction);
	const isIncome = transaction.amount < 0;
	const amountLabel = isIncome
		? `+${money.format(Math.abs(transaction.amount))}`
		: `-${money.format(transaction.amount)}`;

	return {
		id: transaction.transaction_id,
		sourceId,
		merchant: transaction.merchant_name ?? transaction.name,
		category,
		dateLabel: formatTransactionDate(transaction.date, transaction.datetime),
		sortDate: transactionSortKey(transaction),
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

function mapTransactions(transactions: Transaction[], sourceId: string): TransactionItem[] {
	return transactions.map((transaction) => mapTransaction(transaction, sourceId));
}

function sortTransactionItems(transactions: TransactionItem[]): TransactionItem[] {
	return [...transactions].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

async function fetchTransactionsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	count: number
): Promise<{ transactions: TransactionItem[]; error: string | null }> {
	const client = createPlaidClient(plaid);
	const sourceId = item.itemId ?? item.accessToken;

	try {
		const transactionsResponse = await client.transactionsGet({
			access_token: item.accessToken,
			start_date: toDateString(90),
			end_date: toDateString(0),
			options: { count, offset: 0 }
		});

		const sorted = sortByRecency(transactionsResponse.data.transactions);

		return {
			transactions: mapTransactions(sorted, sourceId),
			error: null
		};
	} catch (error) {
		return {
			transactions: [],
			error: formatPlaidApiError(error)
		};
	}
}

export type FetchTransactionsResult = {
	transactions: TransactionItem[];
	error: string | null;
};

const TRANSACTIONS_CACHE_TTL_MS = 2 * 60 * 1000;

export async function fetchRecentTransactions(count = 12): Promise<FetchTransactionsResult> {
	if (!isPlaidLinked(personalSecrets)) {
		return {
			transactions: [],
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const { plaid } = personalSecrets;
	const cacheKey = `plaid-transactions:${plaid.environment}:${count}:${getPlaidLinkedItems(plaid)
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
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const results = await Promise.all(
		linkedItems.map((item) => fetchTransactionsForItem(plaid, item, count))
	);

	const transactions = sortTransactionItems(results.flatMap((result) => result.transactions));
	const errors = results
		.map((result) => result.error)
		.filter((message): message is string => !!message);

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
