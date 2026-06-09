/** Matches greeting timezone — Arizona (no DST). */
export const CHART_TIME_ZONE = 'America/Phoenix';

/** Parses snapshot timestamps stored as ISO, date-only, or SQLite datetime strings. */
export function parseSnapshotInstant(snapshotTime: string): Date {
	const trimmed = snapshotTime.trim();
	if (!trimmed) return new Date(Number.NaN);

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return new Date(`${trimmed}T12:00:00`);
	}

	if (/^\d{4}-\d{2}-\d{2} /.test(trimmed)) {
		const normalized = trimmed.replace(' ', 'T');
		return new Date(normalized.includes('Z') ? normalized : `${normalized}Z`);
	}

	return new Date(trimmed);
}

/** Calendar day (YYYY-MM-DD) for an ISO instant in the chart timezone. */
export function isoInstantToDayKey(isoInstant: string, timeZone = CHART_TIME_ZONE): string {
	const instant = parseSnapshotInstant(isoInstant);
	if (Number.isNaN(instant.getTime())) {
		return isoInstant.slice(0, 10);
	}

	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instant);
}

/** Today's calendar day (YYYY-MM-DD) in the chart timezone. */
export function currentChartDayKey(timeZone = CHART_TIME_ZONE): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

/** Short label for a chart day key, e.g. "Jun 7". */
export function formatChartDayLabel(dayKey: string, includeYear = false): string {
	const [year, month, day] = dayKey.split('-').map((part) => Number.parseInt(part, 10));
	const date = new Date(year, month - 1, day);

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(includeYear ? { year: 'numeric' } : {})
	});
}

/** Parses a chart day key to a Date at local noon (for range math). */
export function parseChartDayKey(dayKey: string): Date {
	const [year, month, day] = dayKey.split('-').map((part) => Number.parseInt(part, 10));
	return new Date(year, month - 1, day, 12, 0, 0);
}

/** Formats a Date as a chart day key (YYYY-MM-DD) in local calendar terms. */
export function formatChartDayKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function addDaysToDayKey(dayKey: string, days: number): string {
	const date = parseChartDayKey(dayKey);
	date.setDate(date.getDate() + days);
	return formatChartDayKey(date);
}

export function iterDayKeysInRange(startDayKey: string, endDayKey: string): string[] {
	const days: string[] = [];
	let cursor = startDayKey;

	while (cursor <= endDayKey) {
		days.push(cursor);
		cursor = addDaysToDayKey(cursor, 1);
	}

	return days;
}
