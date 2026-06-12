import { getDatabase, NEWS_ARTICLES_TABLE } from '$lib/server/db/database';
import { apiSecrets } from '$lib/server/config/secrets';
import {
	getNewsApiConfig,
	getRawgConfig,
	getSteamGridDbConfig,
	isHackerNewsEnabled
} from '$lib/server/config/integration-config';
import type { NewsCategory } from '$lib/hooks/news/news';
import { fetchAiStoriesFromHackerNews } from './hacker-news';
import { fetchArizonaNews } from './arizona-news';
import { fetchGameReleasesFromRawg } from './rawg-games';
import type { NewsArticleRow } from './news-types';

/** Drop AI/local articles older than this; gaming keeps the full release window. */
const MAX_ARTICLE_AGE_DAYS = 45;
const MAX_ROWS_PER_CATEGORY = 300;

/** Categories that have working configuration in secrets and should produce articles. */
export function getConfiguredNewsCategories(): NewsCategory[] {
	const categories: NewsCategory[] = [];
	if (isHackerNewsEnabled(apiSecrets)) categories.push('ai');
	if (getRawgConfig(apiSecrets)) categories.push('gaming');
	if (getNewsApiConfig(apiSecrets)) categories.push('local');
	return categories;
}

export type NewsSyncResult = {
	syncedAt: string;
	/** Articles written (inserted or refreshed) per category */
	synced: Partial<Record<NewsCategory, number>>;
	failures: Array<{ category: NewsCategory; error: string }>;
	/** Categories without configuration, silently skipped */
	skipped: NewsCategory[];
};

function upsertArticles(rows: NewsArticleRow[]): number {
	if (rows.length === 0) return 0;

	const db = getDatabase();
	const upsert = db.prepare(`
		INSERT INTO ${NEWS_ARTICLES_TABLE} (
			category, external_id, title, url, source, summary, image_url, published_at, extra, fetched_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
		ON CONFLICT (category, external_id) DO UPDATE SET
			title = excluded.title,
			url = excluded.url,
			source = excluded.source,
			summary = excluded.summary,
			image_url = COALESCE(excluded.image_url, image_url),
			published_at = excluded.published_at,
			extra = excluded.extra,
			fetched_at = excluded.fetched_at
	`);

	db.exec('BEGIN');
	try {
		for (const row of rows) {
			upsert.run(
				row.category,
				row.externalId,
				row.title,
				row.url,
				row.source,
				row.summary,
				row.imageUrl,
				row.publishedAt,
				row.extra ? JSON.stringify(row.extra) : null
			);
		}
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return rows.length;
}

function pruneArticles(): void {
	const db = getDatabase();

	db.prepare(
		`DELETE FROM ${NEWS_ARTICLES_TABLE}
		 WHERE category IN ('ai', 'local')
		   AND published_at < datetime('now', ?)`
	).run(`-${MAX_ARTICLE_AGE_DAYS} days`);

	db.prepare(
		`DELETE FROM ${NEWS_ARTICLES_TABLE}
		 WHERE id IN (
			SELECT id FROM (
				SELECT id,
					ROW_NUMBER() OVER (
						PARTITION BY category ORDER BY published_at DESC
					) AS row_rank
				FROM ${NEWS_ARTICLES_TABLE}
			)
			WHERE row_rank > ?
		 )`
	).run(MAX_ROWS_PER_CATEGORY);
}

export async function syncNews(now: Date = new Date()): Promise<NewsSyncResult> {
	const result: NewsSyncResult = {
		syncedAt: now.toISOString(),
		synced: {},
		failures: [],
		skipped: []
	};

	const newsApi = getNewsApiConfig(apiSecrets);
	const rawg = getRawgConfig(apiSecrets);
	const steamGridDb = getSteamGridDbConfig(apiSecrets);

	const tasks: Array<{ category: NewsCategory; fetch: () => Promise<NewsArticleRow[]> }> = [];

	if (isHackerNewsEnabled(apiSecrets)) {
		tasks.push({
			category: 'ai',
			fetch: () => fetchAiStoriesFromHackerNews(apiSecrets.news?.hackerNews ?? {})
		});
	} else {
		result.skipped.push('ai');
	}

	if (rawg) {
		tasks.push({
			category: 'gaming',
			fetch: () => fetchGameReleasesFromRawg(rawg, steamGridDb, now)
		});
	} else {
		result.skipped.push('gaming');
	}

	if (newsApi) {
		tasks.push({ category: 'local', fetch: () => fetchArizonaNews(newsApi) });
	} else {
		result.skipped.push('local');
	}

	for (const task of tasks) {
		try {
			const rows = await task.fetch();
			result.synced[task.category] = upsertArticles(rows);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			result.failures.push({ category: task.category, error: message });
			console.error(`[news-sync] Failed to sync "${task.category}": ${message}`);
		}
	}

	pruneArticles();

	return result;
}
