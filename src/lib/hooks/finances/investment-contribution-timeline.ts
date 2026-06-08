export type InvestmentContributionTimeline = {
	/** Starting contributions from secrets before any tracked deposits/withdrawals. */
	baseline: number;
	/** Cumulative contributions after each day with a deposit or withdrawal. */
	steps: Array<{ sortDate: string; contributions: number }>;
};

export function contributionsAsOf(
	sortDate: string,
	timeline: InvestmentContributionTimeline
): number {
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
