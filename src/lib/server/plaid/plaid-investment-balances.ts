import type { AccountBase, Holding, InvestmentAccount } from 'plaid';
import { isInvestingAccountLabel } from '$lib/hooks/finances/account-balances';
import { createPlaidClient } from '$lib/server/plaid/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

function sumHoldingsByAccount(holdings: Holding[]): Map<string, number> {
	const totals = new Map<string, number>();

	for (const holding of holdings) {
		const value = holding.institution_value;
		if (value == null || !Number.isFinite(value)) continue;

		totals.set(holding.account_id, (totals.get(holding.account_id) ?? 0) + value);
	}

	return totals;
}

function enrichInvestmentAccountBalances(
	accounts: InvestmentAccount[],
	holdings: Holding[]
): AccountBase[] {
	const holdingsByAccount = sumHoldingsByAccount(holdings);

	return accounts.map((account) => {
		const holdingsTotal = holdingsByAccount.get(account.account_id) ?? 0;
		const cash = account.balances.available ?? 0;
		const plaidCurrent = account.balances.current;

		let current: number | null;

		if (holdingsTotal > 0) {
			const computed = roundMoney(holdingsTotal + cash);
			current = plaidCurrent != null ? Math.max(computed, roundMoney(plaidCurrent)) : computed;
		} else {
			current = plaidCurrent ?? account.balances.available ?? null;
		}

		return {
			...account,
			balances: {
				...account.balances,
				current
			}
		} as AccountBase;
	});
}

export function shouldUseInvestmentsBalanceApi(
	label: string,
	environment: PlaidConfig['environment']
): boolean {
	return isInvestingAccountLabel(label) && environment !== 'sandbox';
}

/** Pull investment balances from holdings (crypto/stocks) and trigger a refresh when available. */
export async function fetchInvestmentAccountsWithBalances(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<AccountBase[]> {
	const client = createPlaidClient(plaid);

	try {
		await client.investmentsRefresh({ access_token: item.accessToken });
	} catch {
		// investmentsRefresh is optional; continue with the holdings read
	}

	const response = await client.investmentsHoldingsGet({ access_token: item.accessToken });
	return enrichInvestmentAccountBalances(response.data.accounts, response.data.holdings);
}
