import type { Transaction } from 'plaid';
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

function mapTransaction(transaction: Transaction): TransactionItem {
	const category = formatCategoryLabel(transaction);
	const isIncome = transaction.amount < 0;
	const amountLabel = isIncome
		? `+${money.format(Math.abs(transaction.amount))}`
		: `-${money.format(transaction.amount)}`;

	return {
		id: transaction.transaction_id,
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

function mapTransactions(transactions: Transaction[]): TransactionItem[] {
	return transactions.map((transaction) => mapTransaction(transaction));
}

async function fetchTransactionsForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem,
	count: number
): Promise<{ transactions: TransactionItem[]; error: string | null }> {
	const client = createPlaidClient(plaid);

	try {
		const transactionsResponse = await client.transactionsGet({
			access_token: item.accessToken,
			start_date: toDateString(90),
			end_date: toDateString(0),
			options: { count, offset: 0 }
		});

		const sorted = sortByRecency(transactionsResponse.data.transactions);

		return {
			transactions: mapTransactions(sorted),
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

export async function fetchRecentTransactions(count = 12): Promise<FetchTransactionsResult> {
	if (!isPlaidLinked(personalSecrets)) {
		return {
			transactions: [],
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	const { plaid } = personalSecrets;
	const [primaryItem] = getPlaidLinkedItems(plaid);

	if (!primaryItem) {
		return {
			transactions: [],
			error: 'Plaid access token is not set in personal-info.local.ts'
		};
	}

	return fetchTransactionsForItem(plaid, primaryItem, count);
}
