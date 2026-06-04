export type TransactionIcon =
	| 'coffee'
	| 'cart'
	| 'wallet'
	| 'car'
	| 'tv'
	| 'default';

export type TransactionItem = {
	id: string;
	merchant: string;
	category: string;
	/** Institution label from Plaid config or Plaid institution name */
	bankLabel: string;
	dateLabel: string;
	/** ISO timestamp for sorting when merging multiple Plaid Items (not shown in UI) */
	sortDate: string;
	amountLabel: string;
	isIncome: boolean;
	icon: TransactionIcon;
};
