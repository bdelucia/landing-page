const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Client-safe account balance row (loaded in +page.server.ts). */
export type AccountBalanceItem = {
	id: string;
	label: string;
	icon: string;
	balanceLabel: string;
	/** Net-worth contribution; negative for credit/debt accounts. */
	balance: number | null;
	/** Credit card and other liability accounts. */
	isDebt?: boolean;
	error?: string;
};

export function formatUsdBalance(amount: number): string {
	return usd.format(amount);
}

function accountBalanceAmount(account: AccountBalanceItem): number | null {
	if (account.balance != null) {
		return account.balance;
	}

	if (account.error || account.balanceLabel === '—') {
		return null;
	}

	const parsed = Number(account.balanceLabel.replace(/[^0-9.-]+/g, ''));
	return Number.isFinite(parsed) ? parsed : null;
}

export function netWorthBalanceLabel(accounts: AccountBalanceItem[]): string {
	const amounts = accounts
		.map(accountBalanceAmount)
		.filter((amount): amount is number => amount != null);

	if (amounts.length === 0) {
		return '—';
	}

	return formatUsdBalance(amounts.reduce((sum, amount) => sum + amount, 0));
}

export const accountBalanceDisplayOrder = [
	'AZFCU',
	'Robinhood',
	'Fidelity',
	'Capital One',
	'PayPal'
] as const;

export type AccountCategoryKey = 'cash' | 'investing' | 'debt';

export type AccountCategory = {
	key: AccountCategoryKey;
	label: string;
	accounts: readonly AccountBalanceKey[];
};

export const accountCategories: readonly AccountCategory[] = [
	{ key: 'cash', label: 'Cash & Checking', accounts: ['AZFCU'] },
	{ key: 'investing', label: 'Investing', accounts: ['Fidelity', 'Robinhood'] },
	{ key: 'debt', label: 'Debts & Credit', accounts: ['Capital One', 'PayPal'] }
];

export type CategoryBalanceSummary = {
	key: AccountCategoryKey;
	label: string;
	balance: number;
	balanceLabel: string;
};

export function accountCategoryForLabel(label: string): AccountCategoryKey | null {
	const key = label.trim() as AccountBalanceKey;

	for (const category of accountCategories) {
		if (category.accounts.includes(key)) {
			return category.key;
		}
	}

	return null;
}

export function categoryBalanceSummaries(accounts: AccountBalanceItem[]): CategoryBalanceSummary[] {
	const totals = new Map<AccountCategoryKey, number>(
		accountCategories.map((category) => [category.key, 0])
	);

	for (const account of accounts) {
		const categoryKey = accountCategoryForLabel(account.label);
		if (!categoryKey) continue;

		const amount = accountBalanceAmount(account);
		if (amount == null) continue;

		totals.set(categoryKey, (totals.get(categoryKey) ?? 0) + amount);
	}

	return accountCategories.map((category) => {
		const balance = totals.get(category.key) ?? 0;

		return {
			key: category.key,
			label: category.label,
			balance,
			balanceLabel: formatUsdBalance(balance)
		};
	});
}

export type AccountBalanceKey = (typeof accountBalanceDisplayOrder)[number];

export const debtAccountLabels: ReadonlySet<AccountBalanceKey> = new Set([
	'Capital One',
	'PayPal'
]);

export function isDebtAccountLabel(label: string): boolean {
	return debtAccountLabels.has(label.trim() as AccountBalanceKey);
}

export const bankAccountDescriptions: Record<AccountBalanceKey, string> = {
	AZFCU: 'Main bank account',
	Robinhood: 'Personal investments',
	Fidelity: 'Company investment account',
	'Capital One': 'Credit card',
	PayPal: 'Credit card'
};

export function bankAccountDescription(label: string): string | null {
	const key = label.trim() as AccountBalanceKey;
	return bankAccountDescriptions[key] ?? null;
}

export const bankBrandColors: Record<AccountBalanceKey, string> = {
	AZFCU: '#f8b42a',
	Robinhood: '#ccff00',
	Fidelity: '#328841',
	'Capital One': '#cc2427',
	PayPal: '#099edf'
};

export function formatDebtBalanceLabel(amountOwed: number): string {
	return `-${formatUsdBalance(Math.abs(amountOwed))}`;
}

export function debtBalanceFromRaw(rawBalance: number): number {
	return -Math.abs(rawBalance);
}

export function bankBrandColor(label: string): string {
	const key = label.trim() as AccountBalanceKey;
	return bankBrandColors[key] ?? 'var(--color-muted-foreground)';
}
