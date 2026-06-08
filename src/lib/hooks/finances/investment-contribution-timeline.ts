export type InvestmentContributionTimeline = {
	/** Contributions from secrets — total before the earliest balance snapshot in SQLite. */
	baseline: number;
	/** Earliest balance snapshot day; the first chart point uses `baseline`. */
	trackingStartDate: string | null;
	/** Cumulative contributions after each day with a deposit or withdrawal. */
	steps: Array<{ sortDate: string; contributions: number }>;
};

/** Resolve which timeline date to use for contribution lookup on the chart. */
export function resolveContributionSortDate(
	sortDate: string,
	timeline: InvestmentContributionTimeline,
	firstFilteredSortDate: string | null = null
): string {
	if (timeline.trackingStartDate && sortDate <= timeline.trackingStartDate) {
		return timeline.trackingStartDate;
	}

	if (
		firstFilteredSortDate &&
		sortDate === firstFilteredSortDate &&
		timeline.trackingStartDate &&
		firstFilteredSortDate <= timeline.trackingStartDate
	) {
		return timeline.trackingStartDate;
	}

	return sortDate;
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
	firstFilteredSortDate: string | null = null
): { contributions: number; earnings: number } {
	const resolvedSortDate = resolveContributionSortDate(
		sortDate,
		timeline,
		firstFilteredSortDate
	);
	const contributions = contributionsAsOf(resolvedSortDate, timeline);
	const earnings = Math.round((balance - contributions) * 100) / 100;

	return { contributions, earnings };
}

export function initialContributionAmount(timeline: InvestmentContributionTimeline): number {
	return timeline.baseline;
}
