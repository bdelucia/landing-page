export type TransactionIcon = 'coffee' | 'cart' | 'wallet' | 'car' | 'tv' | 'default';

export type TransactionItem = {
	id: string;
	/** Matches `AccountBalanceItem.id` for the linked Plaid Item */
	sourceId: string;
	/** Plaid account_id for the sub-account within the linked Item */
	accountId: string;
	bankLabel: string;
	accountLabel: string;
	merchant: string;
	category: string;
	dateLabel: string;
	/** ISO timestamp for sorting when merging multiple Plaid Items (not shown in UI) */
	sortDate: string;
	/** Raw Plaid amount — positive for spending, negative for income. */
	amount: number;
	amountLabel: string;
	isIncome: boolean;
	icon: TransactionIcon;
};

function isTransferOutCategory(category: string): boolean {
	const key = category.toLowerCase();
	return key.includes('transfer out') || key === 'transfer';
}

/** Spending excludes income and outbound transfers between accounts. */
export function isSpendingTransaction(transaction: TransactionItem): boolean {
	return !transaction.isIncome && !isTransferOutCategory(transaction.category);
}
