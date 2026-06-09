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

/** Latest day with a real Plaid balance snapshot on or before `sortDate`. */
export function latestSnapshotSortDateOnOrBefore(
	sortDate: string,
	snapshotSortDates: readonly string[]
): string | null {
	let latest: string | null = null;

	for (const snapshotDate of snapshotSortDates) {
		if (snapshotDate <= sortDate && (latest == null || snapshotDate > latest)) {
			latest = snapshotDate;
		}
	}

	return latest;
}

/**
 * When scrubbing the chart, only advance contributions through `sortDate` if that
 * day has a real balance snapshot. Forward-filled days keep the last snapshot's
 * contribution total so market-only days do not shift contributions.
 */
export function contributionsDateForHover(
	sortDate: string,
	snapshotSortDates: readonly string[]
): string {
	if (snapshotSortDates.length === 0) {
		return sortDate;
	}

	if (snapshotSortDates.includes(sortDate)) {
		return sortDate;
	}

	return latestSnapshotSortDateOnOrBefore(sortDate, snapshotSortDates) ?? sortDate;
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

export function investmentStatsFromTimeline(
	balance: number,
	sortDate: string,
	timeline: InvestmentContributionTimeline,
	firstRealPlaidSortDate: string | null = null,
	snapshotSortDates: readonly string[] = [],
	isHistoricalHover = false
): { contributions: number; earnings: number } {
	if (isPreSnapshotSyntheticDay(sortDate, firstRealPlaidSortDate)) {
		return {
			contributions: timeline.baseline,
			earnings: 0
		};
	}

	const contributions = isHistoricalHover
		? contributionsAsOf(contributionsDateForHover(sortDate, snapshotSortDates), timeline)
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
