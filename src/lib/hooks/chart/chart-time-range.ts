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
	return new Date(`${sortDate.slice(0, 10)}T12:00:00`);
}

function formatSortDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
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

	const reference = data[data.length - 1].sortDate;
	const cutoff = cutoffDateForRange(range, reference);
	if (!cutoff) return data;

	return data.filter((point) => point.sortDate >= cutoff);
}
