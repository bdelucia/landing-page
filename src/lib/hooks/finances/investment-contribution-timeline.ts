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
