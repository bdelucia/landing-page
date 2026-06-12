import { getDatabase, NEWS_ARTICLES_TABLE } from '$lib/server/db/database';
import { newsDateLabel, type NewsArticleItem, type NewsCategory } from '$lib/hooks/news/news';
import type { NewsArticleExtra } from './news-types';

const ARTICLES_PER_CATEGORY = 60;

type NewsArticleDbRow = {
	id: number;
	category: string;
	title: string;
	url: string;
	source: string | null;
	summary: string | null;
	image_url: string | null;
	published_at: string;
	extra: string | null;
	fetched_at: string;
};

function parseExtra(raw: string | null): NewsArticleExtra {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as NewsArticleExtra;
	} catch {
		return {};
	}
}

function toArticleItem(row: NewsArticleDbRow, now: Date): NewsArticleItem {
	const category = row.category as NewsCategory;
	const extra = parseExtra(row.extra);
	const publishedAt = new Date(row.published_at);

	return {
		id: `${row.category}-${row.id}`,
		category,
		title: row.title,
		url: row.url,
		source: row.source ?? '',
		summary: row.summary,
		imageUrl: row.image_url,
		dateLabel: newsDateLabel(row.published_at, now),
		sortDate: row.published_at,
		isUpcoming: category === 'gaming' && publishedAt.getTime() > now.getTime(),
		platforms: extra.platforms ?? []
	};
}

export type LoadNewsArticlesResult = {
	articles: NewsArticleItem[];
	lastSyncedAt: string | null;
	isEmpty: boolean;
	/** Categories that have at least one stored article */
	categoriesPresent: NewsCategory[];
};

export function loadNewsArticlesFromDb(now: Date = new Date()): LoadNewsArticlesResult {
	const db = getDatabase();

	const rows = db
		.prepare(
			`SELECT id, category, title, url, source, summary, image_url, published_at, extra, fetched_at
			 FROM (
				SELECT *,
					ROW_NUMBER() OVER (
						PARTITION BY category ORDER BY published_at DESC
					) AS row_rank
				FROM ${NEWS_ARTICLES_TABLE}
			 )
			 WHERE row_rank <= ?
			 ORDER BY published_at DESC`
		)
		.all(ARTICLES_PER_CATEGORY) as NewsArticleDbRow[];

	const lastSynced = db
		.prepare(`SELECT MAX(fetched_at) AS last_synced FROM ${NEWS_ARTICLES_TABLE}`)
		.get() as { last_synced: string | null };

	const articles = rows.map((row) => toArticleItem(row, now));

	return {
		articles,
		lastSyncedAt: lastSynced.last_synced,
		isEmpty: rows.length === 0,
		categoriesPresent: [...new Set(articles.map((article) => article.category))]
	};
}
