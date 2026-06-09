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

/** First calendar day with a real Plaid balance snapshot in the chart history. */
export function firstRealPlaidSortDate(
	fullChartData: AccountBalanceChartPoint[]
): string | null {
	return fullChartData[0]?.sortDate ?? null;
}

function buildSyntheticInvestmentPoint(
	sortDate: string,
	baseline: number,
	accountIds: string[]
): AccountBalanceChartPoint {
	const point: AccountBalanceChartPoint = {
		date: formatChartDayLabel(sortDate),
		sortDate
	};

	if (accountIds.length === 0) {
		return point;
	}

	// Item-level baseline is split so series values sum to baseline (not baseline × accounts).
	const [primaryAccountId, ...otherAccountIds] = accountIds;
	point[accountSeriesKey(primaryAccountId)] = baseline;

	for (const accountId of otherAccountIds) {
		point[accountSeriesKey(accountId)] = 0;
	}

	return point;
}

function prependSyntheticDays(
	data: AccountBalanceChartPoint[],
	syntheticPoints: AccountBalanceChartPoint[]
): AccountBalanceChartPoint[] {
	if (syntheticPoints.length === 0) {
		return data;
	}

	return [...syntheticPoints, ...data].sort((left, right) =>
		left.sortDate.localeCompare(right.sortDate)
	);
}

/**
 * Back-fills investing charts with synthetic days before the first Plaid snapshot.
 * Balance total equals baseline with $0 earnings (contributions only).
 */
export function padInvestmentChartDataForRange(
	rangeFilteredData: AccountBalanceChartPoint[],
	fullChartData: AccountBalanceChartPoint[],
	range: ChartTimeRange,
	timeline: InvestmentContributionTimeline,
	accountIds: string[]
): AccountBalanceChartPoint[] {
	if (range === '1D') {
		return rangeFilteredData;
	}

	const earliestRealSortDate = firstRealPlaidSortDate(fullChartData);
	if (!earliestRealSortDate) {
		return rangeFilteredData;
	}

	const existingDates = new Set(fullChartData.map((point) => point.sortDate));

	if (range === 'ALL') {
		const syntheticDate = addDaysToDayKey(earliestRealSortDate, -1);
		if (existingDates.has(syntheticDate)) {
			return rangeFilteredData;
		}

		return prependSyntheticDays(rangeFilteredData, [
			buildSyntheticInvestmentPoint(syntheticDate, timeline.baseline, accountIds)
		]);
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

	const firstRealInRange =
		rangeFilteredData.find((point) => point.sortDate >= earliestRealSortDate)?.sortDate ??
		earliestRealSortDate;

	if (firstRealInRange <= cutoff) {
		return rangeFilteredData;
	}

	const padThroughDate = addDaysToDayKey(firstRealInRange, -1);
	if (padThroughDate < cutoff) {
		return rangeFilteredData;
	}

	const syntheticPoints = iterDayKeysInRange(cutoff, padThroughDate)
		.filter((sortDate) => !existingDates.has(sortDate))
		.map((sortDate) =>
			buildSyntheticInvestmentPoint(sortDate, timeline.baseline, accountIds)
		);

	return prependSyntheticDays(rangeFilteredData, syntheticPoints);
}
