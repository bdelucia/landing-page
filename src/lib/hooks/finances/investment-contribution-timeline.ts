export type InvestmentContributionTimeline = {
	/** Contributions from secrets — total before balance tracking began in SQLite. */
	baseline: number;
	/** First balance snapshot day; Plaid deltas apply on/after this date. */
	trackingStartDate: string | null;
	/** Cumulative contributions after each day with a deposit or withdrawal. */
	steps: Array<{ sortDate: string; contributions: number }>;
};

export function contributionsAsOf(
	sortDate: string,
	timeline: InvestmentContributionTimeline
): number {
	if (timeline.trackingStartDate && sortDate < timeline.trackingStartDate) {
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
	timeline: InvestmentContributionTimeline
): { contributions: number; earnings: number } {
	const contributions = contributionsAsOf(sortDate, timeline);
	const earnings = Math.round((balance - contributions) * 100) / 100;

	return { contributions, earnings };
}
