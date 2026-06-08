import {
	accountCategories,
	accountCategoryForLabel,
	type AccountCategoryKey
} from '$lib/hooks/finances/account-balances';
import type { ChartConfig } from '$lib/components/ui/chart/chart-utils';
import type { InvestmentContributionTimeline } from '$lib/hooks/finances/investment-contribution-timeline';

/** Individual Plaid account under a linked Item (bank). */
export type BankAccountItem = {
	id: string;
	itemId: string;
	typeLabel: string;
	mask: string | null;
	balanceLabel: string;
	balance: number;
	/** Liability accounts store negative balances for net-worth math. */
	isDebt?: boolean;
	/** Show in chart header even when account_mask is null in SQLite. */
	forceChartHeader?: boolean;
};

export type AccountBalanceChartPoint = {
	date: string;
	sortDate: string;
} & Record<string, number | string>;

export type BankAccountDetail = {
	accounts: BankAccountItem[];
	/** Subset of accounts shown in the chart header (excludes DB rows with null account_mask). */
	headerAccounts: BankAccountItem[];
	chartData: AccountBalanceChartPoint[];
	chartConfig: ChartConfig;
	isDummyData: boolean;
	/** Deposit/withdrawal history for hoverable contributions on investment charts. */
	investmentContributionTimeline?: InvestmentContributionTimeline;
};

export type BankAccountDetailsByItem = Record<string, BankAccountDetail>;

/** Stable series key for chart columns derived from a Plaid account id. */
export function accountSeriesKey(accountId: string): string {
	return `acct_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/** Sums every account series value stored on a chart point. */
export function chartPointTotal(point: AccountBalanceChartPoint): number {
	return Object.entries(point).reduce((sum, [key, value]) => {
		if (key === 'date' || key === 'sortDate') return sum;
		return sum + (typeof value === 'number' ? value : 0);
	}, 0);
}

/** Sums each category's accounts for a single chart point. */
export function categoryTotalsFromChartPoint(
	accounts: BankAccountItem[],
	itemLabelByItemId: Record<string, string>,
	point: AccountBalanceChartPoint
): Record<AccountCategoryKey, number> {
	const totals = Object.fromEntries(
		accountCategories.map((category) => [category.key, 0])
	) as Record<AccountCategoryKey, number>;

	for (const account of accounts) {
		const key = accountSeriesKey(account.id);
		const value = point[key];

		if (typeof value !== 'number') continue;

		const bankLabel = itemLabelByItemId[account.itemId];
		const categoryKey = bankLabel ? accountCategoryForLabel(bankLabel) : null;
		if (!categoryKey) continue;

		totals[categoryKey] += value;
	}

	return totals;
}

/** Sums each bank item's accounts for a single chart point (keyed by item id). */
export function bankTotalsFromChartPoint(
	accounts: BankAccountItem[],
	point: AccountBalanceChartPoint
): Record<string, number> {
	const totals: Record<string, number> = {};

	for (const account of accounts) {
		const key = accountSeriesKey(account.id);
		const value = point[key];

		if (typeof value === 'number') {
			totals[account.itemId] = (totals[account.itemId] ?? 0) + value;
		}
	}

	return totals;
}

/** Merges per-bank history into one detail for an all-banks total chart. */
export function buildAggregatedBankAccountDetail(
	byItemId: BankAccountDetailsByItem
): BankAccountDetail | null {
	const details = Object.values(byItemId);
	if (details.length === 0) return null;

	const accounts = details.flatMap((detail) => detail.accounts);
	if (accounts.length === 0) return null;

	const chartConfig: ChartConfig = {};
	for (const detail of details) {
		Object.assign(chartConfig, detail.chartConfig);
	}

	const byDay = new Map<string, AccountBalanceChartPoint>();

	for (const detail of details) {
		for (const point of detail.chartData) {
			const dayKey = point.sortDate;
			const merged = byDay.get(dayKey) ?? {
				date: point.date,
				sortDate: point.sortDate
			};

			for (const account of detail.accounts) {
				const key = accountSeriesKey(account.id);
				const value = point[key];

				if (typeof value === 'number') {
					const existing = merged[key];
					merged[key] = typeof existing === 'number' ? existing + value : value;
				}
			}

			byDay.set(dayKey, merged);
		}
	}

	const chartData = [...byDay.values()].sort((a, b) => a.sortDate.localeCompare(b.sortDate));

	const headerAccounts = details.flatMap((detail) => detail.headerAccounts);

	return {
		accounts,
		headerAccounts,
		chartData,
		chartConfig,
		isDummyData: details.some((detail) => detail.isDummyData)
	};
}
