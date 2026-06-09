import type { ChartBalanceChange } from '$lib/hooks/chart/chart-time-range';
import { chartBalanceChange } from '$lib/hooks/chart/chart-time-range';
import { addDaysToDayKey, currentChartDayKey } from '$lib/hooks/chart/chart-date';

export type InvestmentContributionTimeline = {
	/** Contributions from secrets — total before the earliest balance snapshot in SQLite. */
	baseline: number;
	/** Earliest balance snapshot day; the first chart point uses `baseline`. */
	trackingStartDate: string | null;
	/** Cumulative contributions after each day with a deposit. */
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

/** Net new contributions recorded on a single calendar day. */
export function contributionDeltaOnDay(
	sortDate: string,
	timeline: InvestmentContributionTimeline
): number {
	const priorSortDate = addDaysToDayKey(sortDate, -1);
	return (
		Math.round(
			(contributionsAsOf(sortDate, timeline) - contributionsAsOf(priorSortDate, timeline)) * 100
		) / 100
	);
}

/**
 * Balance to show for an investment account on a chart day.
 * Today uses the live Plaid balance. Historical days use the snapshot balance, plus
 * any same-day deposit when the snapshot has not caught up yet.
 */
export function investmentDisplayBalanceForDay(
	sortDate: string,
	snapshotChartTotal: number,
	timeline: InvestmentContributionTimeline,
	snapshotTotalByDay: ReadonlyMap<string, number>,
	liveBalance: number,
	todayKey: string = currentChartDayKey()
): number {
	if (sortDate === todayKey) {
		return liveBalance;
	}

	const priorSortDate = addDaysToDayKey(sortDate, -1);
	const priorSnapshotTotal = snapshotTotalByDay.get(priorSortDate);
	const contributionDelta = contributionDeltaOnDay(sortDate, timeline);

	if (
		contributionDelta > 0 &&
		priorSnapshotTotal != null &&
		Math.abs(snapshotChartTotal - priorSnapshotTotal) < 0.01
	) {
		return Math.round((snapshotChartTotal + contributionDelta) * 100) / 100;
	}

	return snapshotChartTotal;
}

/** Earnings (balance minus contributions) for a chart day. */
export function earningsAsOf(
	sortDate: string,
	displayBalance: number,
	timeline: InvestmentContributionTimeline,
	firstRealPlaidSortDate: string | null
): number {
	if (isPreSnapshotSyntheticDay(sortDate, firstRealPlaidSortDate)) {
		return 0;
	}

	return Math.round((displayBalance - contributionsAsOf(sortDate, timeline)) * 100) / 100;
}

export function investmentStatsFromTimeline(
	balance: number,
	sortDate: string,
	timeline: InvestmentContributionTimeline,
	firstRealPlaidSortDate: string | null = null,
	isHistoricalHover = false
): { contributions: number; earnings: number } {
	const contributions = isHistoricalHover
		? contributionsAsOf(sortDate, timeline)
		: latestContributionsFromTimeline(timeline);

	if (isPreSnapshotSyntheticDay(sortDate, firstRealPlaidSortDate)) {
		return {
			contributions: timeline.baseline,
			earnings: 0
		};
	}

	const earnings = earningsAsOf(sortDate, balance, timeline, firstRealPlaidSortDate);

	return { contributions, earnings };
}

/** Balance change for an investment chart range — contributions excluded, earnings only. */
export function investmentEarningsChange<T extends { sortDate: string }>(
	data: T[],
	getDisplayBalance: (point: T) => number,
	timeline: InvestmentContributionTimeline,
	firstRealPlaidSortDate: string | null,
	endIndex?: number
): ChartBalanceChange | null {
	const getEarnings = (point: T) =>
		earningsAsOf(point.sortDate, getDisplayBalance(point), timeline, firstRealPlaidSortDate);

	const change = chartBalanceChange(data, getEarnings, endIndex);
	if (!change) return null;

	const startBalance = getDisplayBalance(data[0]);
	const percent =
		startBalance !== 0 ? (change.amount / Math.abs(startBalance)) * 100 : null;

	return { ...change, percent };
}

export function initialContributionAmount(timeline: InvestmentContributionTimeline): number {
	return timeline.baseline;
}

export function preSnapshotSyntheticBalance(timeline: InvestmentContributionTimeline): number {
	return timeline.baseline;
}
