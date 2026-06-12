export type NewsCategory = 'ai' | 'gaming' | 'local';

export const NEWS_CATEGORIES: readonly NewsCategory[] = ['ai', 'gaming', 'local'];

export type NewsArticleItem = {
	id: string;
	category: NewsCategory;
	title: string;
	url: string;
	source: string;
	/** Short blurb under the headline (HN points/comments, article description, …) */
	summary: string | null;
	imageUrl: string | null;
	dateLabel: string;
	/** ISO timestamp for sorting; release date for games (may be in the future) */
	sortDate: string;
	/** Gaming only — true while the release date is still ahead of us */
	isUpcoming: boolean;
	/** Gaming only — platform names, e.g. ["PC", "PlayStation 5"] */
	platforms: string[];
};

export type DashboardNews = {
	articles: NewsArticleItem[];
	/** Per-category sync errors surfaced in the UI */
	errors: Partial<Record<NewsCategory, string>>;
	lastSyncedAt: string | null;
};

export const NEWS_CATEGORY_META: Record<
	NewsCategory,
	{ label: string; tabLabel: string; accentVar: string }
> = {
	ai: { label: 'AI', tabLabel: 'AI', accentVar: 'var(--chart-5)' },
	gaming: { label: 'Gaming', tabLabel: 'Gaming', accentVar: 'var(--color-secondary)' },
	local: { label: 'Arizona', tabLabel: 'Arizona', accentVar: 'var(--chart-4)' }
};

/** "Today", "Yesterday", "Tomorrow", or "Jun 24" (with year when not the current one). */
export function newsDateLabel(isoDate: string, now: Date = new Date()): string {
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return '';

	const startOfDay = (value: Date) =>
		new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
	const dayMs = 24 * 60 * 60 * 1000;
	const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / dayMs);

	if (diffDays === 0) return 'Today';
	if (diffDays === -1) return 'Yesterday';
	if (diffDays === 1) return 'Tomorrow';

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
	});
}
