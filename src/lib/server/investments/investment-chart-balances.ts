import {
	chartPointTotal,
	type AccountBalanceChartPoint
} from '$lib/hooks/finances/bank-accounts';
import {
	contributionsAsOf,
	type InvestmentContributionTimeline
} from '$lib/hooks/finances/investment-contribution-timeline';

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

function bumpPointTotal(point: AccountBalanceChartPoint, delta: number): AccountBalanceChartPoint {
	if (delta === 0) {
		return point;
	}

	const bumped: AccountBalanceChartPoint = { ...point };

	for (const key of Object.keys(bumped)) {
		if (key === 'date' || key === 'sortDate') {
			continue;
		}

		const value = bumped[key];
		if (typeof value === 'number') {
			bumped[key] = roundMoney(value + delta);
			return bumped;
		}
	}

	return bumped;
}

/**
 * When Plaid posts deposit transactions before balance snapshots update, forward-filled
 * chart days keep an old balance. Adjust totals so deposits are reflected on the chart.
 */
export function adjustInvestmentChartBalances(
	points: AccountBalanceChartPoint[],
	timeline: InvestmentContributionTimeline
): AccountBalanceChartPoint[] {
	if (points.length === 0) {
		return points;
	}

	const adjusted: AccountBalanceChartPoint[] = [{ ...points[0]! }];

	for (let index = 1; index < points.length; index += 1) {
		const prior = adjusted[index - 1]!;
		const raw = { ...points[index]! };
		const priorTotal = chartPointTotal(prior);
		const rawTotal = chartPointTotal(raw);
		const contributionDelta = roundMoney(
			contributionsAsOf(raw.sortDate, timeline) - contributionsAsOf(prior.sortDate, timeline)
		);

		let targetTotal = rawTotal;

		if (contributionDelta > 0 && rawTotal <= priorTotal + 0.01) {
			targetTotal = roundMoney(priorTotal + contributionDelta);
		} else if (contributionDelta === 0 && rawTotal + 0.01 < priorTotal) {
			// Stale forward-fill after a prior-day deposit bump — carry the higher balance forward.
			targetTotal = priorTotal;
		}

		const delta = roundMoney(targetTotal - rawTotal);
		adjusted.push(delta !== 0 ? bumpPointTotal(raw, delta) : raw);
	}

	return adjusted;
}
