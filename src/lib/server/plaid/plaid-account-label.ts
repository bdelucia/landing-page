import type { AccountBase } from 'plaid';
import type { AccountBalanceKey } from '$lib/hooks/finances/account-balances';

function titleCase(value: string): string {
	return value
		.toLowerCase()
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

type ChartLabelOverride = {
	bankLabel: AccountBalanceKey;
	matches: (account: AccountBase) => boolean;
	label: string;
};

const chartLabelOverrides: ChartLabelOverride[] = [
	{
		bankLabel: 'AZFCU',
		matches: (account) => /membership/i.test(account.name ?? ''),
		label: 'Shared'
	},
	{
		bankLabel: 'Fidelity',
		matches: (account) => account.subtype === '401k',
		label: 'GCE Roth 401k'
	},
	{
		bankLabel: 'Robinhood',
		matches: (account) => account.subtype === 'roth',
		label: 'Roth IRA'
	},
	{
		bankLabel: 'Capital One',
		matches: (account) => account.type === 'credit',
		label: 'Savor Card'
	},
	{
		bankLabel: 'PayPal',
		matches: (account) => account.type === 'credit',
		label: 'PayPal Credit'
	}
];

const nameTypePatterns: Array<[pattern: string, label: string]> = [
	['roth ira', 'Roth IRA'],
	['401k', '401k'],
	['403b', '403b'],
	['hsa', 'HSA'],
	['ira', 'IRA'],
	['checking', 'Checking'],
	['savings', 'Savings'],
	['brokerage', 'Brokerage'],
	['credit card', 'Credit Card'],
	['money market', 'Money Market'],
	['cd', 'CD']
];

function inferTypeFromName(name: string | null | undefined): string | null {
	if (!name?.trim()) return null;

	const lower = name.toLowerCase();
	for (const [pattern, label] of nameTypePatterns) {
		if (lower.includes(pattern)) return label;
	}

	return null;
}

type AccountLabelInput = Pick<AccountBase, 'name' | 'type' | 'subtype'>;

export function formatAccountTypeLabel(account: AccountLabelInput): string {
	const fromSubtype = account.subtype?.trim();
	if (fromSubtype) return titleCase(fromSubtype);

	const fromName = inferTypeFromName(account.name);
	if (fromName) return fromName;

	const fromType = account.type?.trim();
	if (fromType) return titleCase(fromType);

	return 'Account';
}

function resolveChartLabelOverride(
	account: AccountBase,
	bankLabel: string
): ChartLabelOverride | null {
	const normalizedBank = bankLabel.trim() as AccountBalanceKey;

	for (const override of chartLabelOverrides) {
		if (override.bankLabel === normalizedBank && override.matches(account)) {
			return override;
		}
	}

	return null;
}

/** Chart header label for a Plaid account, with per-bank overrides applied. */
export function formatChartAccountTypeLabel(account: AccountBase, bankLabel: string): string {
	return resolveChartLabelOverride(account, bankLabel)?.label ?? formatAccountTypeLabel(account);
}

/** True when this account uses a custom chart header label (e.g. Membership Share). */
export function hasChartLabelOverride(account: AccountBase, bankLabel: string): boolean {
	return resolveChartLabelOverride(account, bankLabel) != null;
}
