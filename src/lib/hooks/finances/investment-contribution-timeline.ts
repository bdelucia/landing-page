import { addDaysToDayKey } from '$lib/hooks/chart/chart-date';

export type InvestmentContributionTimeline = {
	/** Contributions from secrets — total before the earliest balance snapshot in SQLite. */
	baseline: number;
	/** Earliest balance snapshot day; the first chart point uses `baseline`. */
	trackingStartDate: string | null;
	/** Cumulative contributions after each day with a deposit or withdrawal. */
	steps: Array<{ sortDate: string; contributions: number }>;
};

/** Synthetic chart days inserted before the first Plaid snapshot. */
export function isPreSnapshotSyntheticDay(
	sortDate: string,
	firstRealPlaidSortDate: string | null
): boolean {
	return firstRealPlaidSortDate != null && sortDate < firstRealPlaidSortDate;
}

export function latestContributionsFromTimeline(
	timeline: InvestmentContributionTimeline
): number {
	return timeline.steps.at(-1)?.contributions ?? timeline.baseline;
}

export function contributionsAsOf(
	sortDate: string,
	timeline: InvestmentContributionTimeline
): number {
	if (timeline.trackingStartDate && sortDate <= timeline.trackingStartDate) {
		return timeline.baseline;
	}

	let contributions = timeline.baseline;

	for (const step of timeline.steps) {
		if (step.sortDate <= sortDate) {
			contributions = step.contributions;
			continue;
		}

		break;
	}

	return contributions;
}

/**
 * When a deposit posts in Plaid transactions before the balance snapshot catches up,
 * the chart forward-fills a flat balance. Bump the displayed total by the deposit delta
 * so earnings do not drop artificially on that day.
 */
export function balanceAdjustingForPendingDeposit(
	chartBalance: number,
	sortDate: string,
	timeline: InvestmentContributionTimeline,
	chartTotalBySortDate: ReadonlyMap<string, number>
): number {
	const priorSortDate = addDaysToDayKey(sortDate, -1);
	const priorChartBalance = chartTotalBySortDate.get(priorSortDate);
	if (priorChartBalance == null) {
		return chartBalance;
	}

	const contributionDelta =
		Math.round(
			(contributionsAsOf(sortDate, timeline) - contributionsAsOf(priorSortDate, timeline)) * 100
		) / 100;

	if (contributionDelta <= 0) {
		return chartBalance;
	}

	if (Math.abs(chartBalance - priorChartBalance) >= 0.01) {
		return chartBalance;
	}

	return Math.round((chartBalance + contributionDelta) * 100) / 100;
}

export function investmentStatsFromTimeline(
	balance: number,
	sortDate: string,
	timeline: InvestmentContributionTimeline,
	firstRealPlaidSortDate: string | null = null,
	isHistoricalHover = false
): { contributions: number; earnings: number } {
	if (isPreSnapshotSyntheticDay(sortDate, firstRealPlaidSortDate)) {
		return {
			contributions: timeline.baseline,
			earnings: 0
		};
	}

	const contributions = isHistoricalHover
		? contributionsAsOf(sortDate, timeline)
		: latestContributionsFromTimeline(timeline);
	const earnings = Math.round((balance - contributions) * 100) / 100;

	return { contributions, earnings };
}

export function initialContributionAmount(timeline: InvestmentContributionTimeline): number {
	return timeline.baseline;
}

export function preSnapshotSyntheticBalance(timeline: InvestmentContributionTimeline): number {
	return timeline.baseline;
}
