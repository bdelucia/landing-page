import { addDaysToDayKey, formatChartDayLabel, iterDayKeysInRange } from '$lib/hooks/chart/chart-date';
import {
	cutoffDateForRange,
	type ChartTimeRange
} from '$lib/hooks/chart/chart-time-range';
import {
	accountSeriesKey,
	type AccountBalanceChartPoint
} from '$lib/hooks/finances/bank-accounts';
import type { InvestmentContributionTimeline } from '$lib/hooks/finances/investment-contribution-timeline';

function buildSyntheticInvestmentPoint(
	sortDate: string,
	baseline: number,
	accountIds: string[]
): AccountBalanceChartPoint {
	const point: AccountBalanceChartPoint = {
		date: formatChartDayLabel(sortDate),
		sortDate
	};

	for (const accountId of accountIds) {
		point[accountSeriesKey(accountId)] = baseline;
	}

	return point;
}

/**
 * Back-fills investing charts with synthetic days inside the selected range but before
 * the first Plaid snapshot. Balance and contributions both use the baseline amount
 * (earnings = 0 on those days).
 */
export function padInvestmentChartDataForRange(
	rangeFilteredData: AccountBalanceChartPoint[],
	fullChartData: AccountBalanceChartPoint[],
	range: ChartTimeRange,
	timeline: InvestmentContributionTimeline,
	accountIds: string[]
): AccountBalanceChartPoint[] {
	if (range === 'ALL') {
		return rangeFilteredData;
	}

	const referenceSource =
		rangeFilteredData.length > 0
			? rangeFilteredData
			: fullChartData.length > 0
				? fullChartData
				: null;

	if (!referenceSource) {
		return rangeFilteredData;
	}

	const referenceSortDate = referenceSource[referenceSource.length - 1].sortDate;
	const cutoff = cutoffDateForRange(range, referenceSortDate);
	if (!cutoff) {
		return rangeFilteredData;
	}

	const firstRealSortDate =
		rangeFilteredData.length > 0
			? rangeFilteredData[0].sortDate
			: fullChartData.length > 0
				? fullChartData[0].sortDate
				: null;

	if (!firstRealSortDate || firstRealSortDate <= cutoff) {
		return rangeFilteredData;
	}

	const padThroughDate = addDaysToDayKey(firstRealSortDate, -1);
	if (padThroughDate < cutoff) {
		return rangeFilteredData;
	}

	const existingDates = new Set([
		...fullChartData.map((point) => point.sortDate),
		...rangeFilteredData.map((point) => point.sortDate)
	]);

	const syntheticPoints = iterDayKeysInRange(cutoff, padThroughDate)
		.filter((sortDate) => !existingDates.has(sortDate))
		.map((sortDate) =>
			buildSyntheticInvestmentPoint(sortDate, timeline.baseline, accountIds)
		);

	if (syntheticPoints.length === 0) {
		return rangeFilteredData;
	}

	return [...syntheticPoints, ...rangeFilteredData].sort((left, right) =>
		left.sortDate.localeCompare(right.sortDate)
	);
}
