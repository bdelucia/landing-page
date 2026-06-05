import type { AccountBase } from 'plaid';

function titleCase(value: string): string {
	return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

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

export function formatAccountTypeLabel(account: AccountBase): string {
	const fromSubtype = account.subtype?.trim();
	if (fromSubtype) return titleCase(fromSubtype);

	const fromName = inferTypeFromName(account.name);
	if (fromName) return fromName;

	const fromType = account.type?.trim();
	if (fromType) return titleCase(fromType);

	return 'Account';
}
