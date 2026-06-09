import {
	addDaysToDayKey,
	currentChartDayKey,
	formatChartDayKey,
	parseChartDayKey
} from '$lib/hooks/chart/chart-date';

export type ChartTimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD' | 'ALL';

export const CHART_TIME_RANGE_OPTIONS: { key: ChartTimeRange; label: string }[] = [
	{ key: '1D', label: '1D' },
	{ key: '1W', label: '1W' },
	{ key: '1M', label: '1M' },
	{ key: '3M', label: '3M' },
	{ key: '1Y', label: '1Y' },
	{ key: 'YTD', label: 'YTD' },
	{ key: 'ALL', label: 'ALL' }
];

function parseSortDate(sortDate: string): Date {
	return parseChartDayKey(sortDate);
}

function formatSortDate(date: Date): string {
	return formatChartDayKey(date);
}

function subtractDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() - days);
	return result;
}

function subtractMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() - months);
	return result;
}

function startOfYear(date: Date): Date {
	return new Date(date.getFullYear(), 0, 1);
}

export function cutoffDateForRange(
	range: ChartTimeRange,
	referenceSortDate: string
): string | null {
	if (range === 'ALL') return null;

	const reference = parseSortDate(referenceSortDate);

	switch (range) {
		case '1D':
			return formatSortDate(subtractDays(reference, 1));
		case '1W':
			return formatSortDate(subtractDays(reference, 7));
		case '1M':
			return formatSortDate(subtractMonths(reference, 1));
		case '3M':
			return formatSortDate(subtractMonths(reference, 3));
		case '1Y':
			return formatSortDate(subtractMonths(reference, 12));
		case 'YTD':
			return formatSortDate(startOfYear(reference));
	}
}

export function filterChartDataByRange<T extends { sortDate: string }>(
	data: T[],
	range: ChartTimeRange
): T[] {
	if (data.length === 0 || range === 'ALL') return data;

	if (range === '1D') {
		const today = currentChartDayKey();
		const yesterday = addDaysToDayKey(today, -1);
		const sorted = [...data].sort((left, right) => left.sortDate.localeCompare(right.sortDate));
		const todayPoint = sorted.find((point) => point.sortDate === today) ?? sorted.at(-1);
		if (!todayPoint) {
			return data.filter((point) => point.sortDate >= yesterday);
		}

		const yesterdayPoint =
			sorted.find((point) => point.sortDate === yesterday) ??
			sorted.filter((point) => point.sortDate < todayPoint.sortDate).at(-1);

		if (yesterdayPoint && yesterdayPoint.sortDate !== todayPoint.sortDate) {
			return [yesterdayPoint, todayPoint];
		}

		return [todayPoint];
	}

	const reference = data[data.length - 1].sortDate;
	const cutoff = cutoffDateForRange(range, reference);
	if (!cutoff) return data;

	return data.filter((point) => point.sortDate >= cutoff);
}

export type ChartBalanceChange = {
	amount: number;
	percent: number | null;
};

/** Compares the first value in a filtered chart series to an end point (last by default). */
export function chartBalanceChange<T>(
	data: T[],
	getValue: (point: T) => number,
	endIndex?: number
): ChartBalanceChange | null {
	if (data.length === 0) return null;

	const endIdx = endIndex ?? data.length - 1;
	if (endIndex == null && data.length < 2) return null;
	if (endIdx < 0 || endIdx >= data.length) return null;

	const start = getValue(data[0]);
	const end = getValue(data[endIdx]);
	const amount = end - start;
	const percent = start !== 0 ? (amount / Math.abs(start)) * 100 : null;

	return { amount, percent };
}
