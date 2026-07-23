/** URL-safe slug for a linked Plaid item label (e.g. "AZFCU" → "azfcu"). */
export function plaidItemSlug(label: string): string {
	return label
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

export function resolvePlaidItemLabel(item: { label?: string }): string {
	return item.label?.trim() || 'Account';
}
