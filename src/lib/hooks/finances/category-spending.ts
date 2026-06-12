import { formatUsdBalance } from '$lib/hooks/finances/account-balances';
import { filterTransactionsBySubAccounts } from '$lib/hooks/finances/transaction-list-filters';
import { isSpendingTransaction, type TransactionItem } from '$lib/hooks/finances/transactions';

export type CategorySpendingSlice = {
	category: string;
	categoryKey: string;
	amount: number;
	color: string;
};

const SPENDING_CATEGORY_COLORS = [
	'#00ffff',
	'#3584e4',
	'#39ff14',
	'#f59e0b',
	'#a78bfa',
	'#ef4444',
	'#ec4899',
	'#14b8a6',
	'#fb923c',
	'#818cf8'
] as const;

function categoryKey(category: string): string {
	return (
		category
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'other'
	);
}

function spendingAmount(transaction: TransactionItem): number {
	if (!isSpendingTransaction(transaction)) return 0;

	if (typeof transaction.amount === 'number' && Number.isFinite(transaction.amount)) {
		return Math.abs(transaction.amount);
	}

	const parsed = Number(transaction.amountLabel.replace(/[^0-9.-]+/g, ''));
	return !Number.isFinite(parsed) ? 0 : Math.abs(parsed);
}

export function buildCategorySpending(
	transactions: TransactionItem[],
	selectedAccountId: string | null = null,
	enabledSubAccountIds: readonly string[] = [],
	allSubAccountIds: readonly string[] = []
): CategorySpendingSlice[] {
	let pool = selectedAccountId
		? transactions.filter((transaction) => transaction.sourceId === selectedAccountId)
		: transactions;

	if (selectedAccountId && allSubAccountIds.length > 1) {
		pool = filterTransactionsBySubAccounts(pool, enabledSubAccountIds);
	}

	const totals = new Map<string, number>();

	for (const transaction of pool) {
		const amount = spendingAmount(transaction);
		if (amount <= 0) continue;

		totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + amount);
	}

	return [...totals.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([category, amount], index) => ({
			category,
			categoryKey: categoryKey(category),
			amount,
			color: SPENDING_CATEGORY_COLORS[index % SPENDING_CATEGORY_COLORS.length]
		}));
}

export function totalCategorySpending(slices: CategorySpendingSlice[]): number {
	return slices.reduce((sum, slice) => sum + slice.amount, 0);
}

export function formatSpendingAmount(amount: number): string {
	return formatUsdBalance(amount);
}
