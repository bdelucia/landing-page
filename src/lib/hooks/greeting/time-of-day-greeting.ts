export const DISPLAY_NAME = 'Bobbeh';

/** US Mountain Standard Time (Arizona; no DST). Use `America/Denver` for MST/MDT elsewhere. */
const MOUNTAIN_TIME_ZONE = 'America/Phoenix';

export type TimeOfDayGreeting = 'morning' | 'afternoon' | 'evening' | 'late';

/** Hour in Mountain Time (0–23) for `date`, defaulting to now. */
export function getMountainHour(date: Date = new Date()): number {
	const hour = new Intl.DateTimeFormat('en-US', {
		timeZone: MOUNTAIN_TIME_ZONE,
		hour: 'numeric',
		hour12: false
	})
		.formatToParts(date)
		.find((part) => part.type === 'hour')?.value;

	return hour ? Number.parseInt(hour, 10) : 0;
}

export function getTimeOfDayGreeting(hour: number): TimeOfDayGreeting {
	if (hour >= 5 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 17) return 'afternoon';
	if (hour >= 17 && hour < 22) return 'evening';
	return 'late';
}

export function formatTimeOfDayGreeting(
	displayName: string = DISPLAY_NAME,
	date: Date = new Date()
): string {
	const period = getTimeOfDayGreeting(getMountainHour(date));

	switch (period) {
		case 'morning':
			return `mornin' ${displayName}`;
		case 'afternoon':
			return `good afternoon ${displayName}`;
		case 'evening':
			return `evenin' ${displayName}`;
		case 'late':
			return `up late ${displayName}?`;
	}
}

export function getWelcomeMessage(date: Date = new Date()): string {
	return formatTimeOfDayGreeting(DISPLAY_NAME, date);
}
