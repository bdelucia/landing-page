export type TransactionIcon =
	| 'coffee'
	| 'cart'
	| 'wallet'
	| 'car'
	| 'tv'
	| 'default';

export type TransactionItem = {
	id: string;
	/** Matches `AccountBalanceItem.id` for the linked Plaid Item */
	sourceId: string;
	merchant: string;
	category: string;
	dateLabel: string;
	/** ISO timestamp for sorting when merging multiple Plaid Items (not shown in UI) */
	sortDate: string;
	amountLabel: string;
	isIncome: boolean;
	icon: TransactionIcon;
};
