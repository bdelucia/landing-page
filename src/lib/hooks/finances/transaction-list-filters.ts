import type { TransactionItem } from '$lib/hooks/finances/transactions';

export type SpendingTransactionSort =
	| 'date-desc'
	| 'date-asc'
	| 'amount-desc'
	| 'amount-asc'
	| 'merchant-asc'
	| 'merchant-desc';

export const SPENDING_TRANSACTION_SORT_OPTIONS: {
	value: SpendingTransactionSort;
	label: string;
}[] = [
	{ value: 'date-desc', label: 'Date (newest)' },
	{ value: 'date-asc', label: 'Date (oldest)' },
	{ value: 'amount-desc', label: 'Amount (high to low)' },
	{ value: 'amount-asc', label: 'Amount (low to high)' },
	{ value: 'merchant-asc', label: 'Merchant (A–Z)' },
	{ value: 'merchant-desc', label: 'Merchant (Z–A)' }
];

export function matchesTransactionSearch(
	transaction: TransactionItem,
	query: string
): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return true;

	const haystack = [
		transaction.merchant,
		transaction.category,
		transaction.bankLabel,
		transaction.accountLabel,
		transaction.amountLabel,
		transaction.dateLabel
	]
		.join(' ')
		.toLowerCase();

	return haystack.includes(normalized);
}

export function filterTransactionsBySubAccounts(
	transactions: TransactionItem[],
	enabledAccountIds: readonly string[]
): TransactionItem[] {
	if (enabledAccountIds.length === 0) return [];

	const enabled = new Set(enabledAccountIds);
	return transactions.filter((transaction) => enabled.has(transaction.accountId));
}

export function sortTransactions(
	transactions: TransactionItem[],
	sort: SpendingTransactionSort
): TransactionItem[] {
	const sorted = [...transactions];

	switch (sort) {
		case 'date-desc':
			return sorted.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
		case 'date-asc':
			return sorted.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
		case 'amount-desc':
			return sorted.sort(
				(a, b) => b.amount - a.amount || b.sortDate.localeCompare(a.sortDate)
			);
		case 'amount-asc':
			return sorted.sort(
				(a, b) => a.amount - b.amount || b.sortDate.localeCompare(a.sortDate)
			);
		case 'merchant-asc':
			return sorted.sort(
				(a, b) =>
					a.merchant.localeCompare(b.merchant, undefined, { sensitivity: 'base' }) ||
					b.sortDate.localeCompare(a.sortDate)
			);
		case 'merchant-desc':
			return sorted.sort(
				(a, b) =>
					b.merchant.localeCompare(a.merchant, undefined, { sensitivity: 'base' }) ||
					b.sortDate.localeCompare(a.sortDate)
			);
	}
}
