/** Client-safe account balance row (loaded in +page.server.ts). */
export type AccountBalanceItem = {
	id: string;
	label: string;
	icon: string;
	balanceLabel: string;
	error?: string;
};

export const accountBalanceDisplayOrder = ['AZFCU', 'Robinhood', 'Fidelity'] as const;

export type AccountBalanceKey = (typeof accountBalanceDisplayOrder)[number];
