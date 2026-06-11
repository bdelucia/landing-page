import {
	addDaysToDayKey,
	currentChartDayKey,
	formatChartDayKey,
	isoInstantToDayKey,
	parseChartDayKey
} from '$lib/hooks/chart/chart-date';
import type { TransactionItem } from '$lib/hooks/finances/transactions';

export type SpendingTimeRange = '1W' | '1M' | '1Q' | '1Y';

export const SPENDING_TIME_RANGE_OPTIONS: { key: SpendingTimeRange; label: string }[] = [
	{ key: '1W', label: '1W' },
	{ key: '1M', label: '1M' },
	{ key: '1Q', label: '1Q' },
	{ key: '1Y', label: '1Y' }
];

export function spendingRangeStartDayKey(
	range: SpendingTimeRange,
	todayKey = currentChartDayKey()
): string {
	switch (range) {
		case '1W':
			return addDaysToDayKey(todayKey, -7);
		case '1M': {
			const date = parseChartDayKey(todayKey);
			date.setMonth(date.getMonth() - 1);
			return formatChartDayKey(date);
		}
		case '1Q':
			return startOfCalendarQuarterDayKey(todayKey);
		case '1Y':
			return `${todayKey.slice(0, 4)}-01-01`;
	}
}

function startOfCalendarQuarterDayKey(todayKey: string): string {
	const [year, month] = todayKey.split('-').map((part) => Number.parseInt(part, 10));
	const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;

	return `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
}

export function transactionDayKey(transaction: TransactionItem): string {
	return isoInstantToDayKey(transaction.sortDate);
}

export function filterTransactionsBySpendingRange(
	transactions: TransactionItem[],
	range: SpendingTimeRange
): TransactionItem[] {
	const startDayKey = spendingRangeStartDayKey(range);

	return transactions.filter((transaction) => transactionDayKey(transaction) >= startDayKey);
}

/** Earliest day key needed when loading transactions for spending ranges. */
export function spendingTransactionFetchStartDayKey(): string {
	const todayKey = currentChartDayKey();
	return `${todayKey.slice(0, 4)}-01-01`;
}

function formatSpendingRangeMMDD(dayKey: string): string {
	const [, month, day] = dayKey.split('-');
	return `${month}/${day}`;
}

function calendarQuarterNumber(todayKey: string): number {
	const month = Number.parseInt(todayKey.split('-')[1] ?? '1', 10);
	return Math.floor((month - 1) / 3) + 1;
}

/** Human-readable label for the active spending period (shown under range controls). */
export function spendingTimeRangePeriodLabel(
	range: SpendingTimeRange,
	todayKey = currentChartDayKey()
): string {
	switch (range) {
		case '1W': {
			const startDayKey = spendingRangeStartDayKey('1W', todayKey);
			return `(${formatSpendingRangeMMDD(startDayKey)} - ${formatSpendingRangeMMDD(todayKey)})`;
		}
		case '1M':
			return parseChartDayKey(todayKey).toLocaleDateString('en-US', { month: 'long' });
		case '1Q':
			return `${todayKey.slice(0, 4)} Q${calendarQuarterNumber(todayKey)}`;
		case '1Y':
			return todayKey.slice(0, 4);
	}
}
