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
	dateLabel: string;
	amountLabel: string;
	isIncome: boolean;
	icon: TransactionIcon;
};
