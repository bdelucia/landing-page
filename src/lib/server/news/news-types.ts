import type { NewsCategory } from '$lib/hooks/news/news';

/** Normalized article shape every source fetcher produces, ready for SQLite upsert. */
export type NewsArticleRow = {
	category: NewsCategory;
	/** Stable id from the source API (HN item id, RAWG game id, article URL) */
	externalId: string;
	title: string;
	url: string;
	source: string | null;
	summary: string | null;
	imageUrl: string | null;
	/** ISO timestamp; for games this is the release date and may be in the future */
	publishedAt: string;
	extra: NewsArticleExtra | null;
};

export type NewsArticleExtra = {
	releaseDate?: string;
	platforms?: string[];
};
