import type { NewsApiOrgConfig } from '$data/api-config.types';
import type { NewsArticleRow } from './news-types';

/**
 * Local (Arizona) headlines via NewsAPI.org's `everything` endpoint.
 * @see https://newsapi.org/docs/endpoints/everything
 */

const NEWS_API_BASE = 'https://newsapi.org/v2';
const DEFAULT_LOCAL_QUERY = '"Arizona" OR "Phoenix"';
const LOCAL_PAGE_SIZE = 30;

type NewsApiArticle = {
	source: { name: string | null };
	title: string | null;
	description: string | null;
	url: string;
	urlToImage: string | null;
	publishedAt: string;
};

type NewsApiResponse = {
	status: string;
	message?: string;
	articles?: NewsApiArticle[];
};

export async function fetchArizonaNews(config: NewsApiOrgConfig): Promise<NewsArticleRow[]> {
	const params = new URLSearchParams({
		q: config.query?.trim() || DEFAULT_LOCAL_QUERY,
		language: 'en',
		sortBy: 'publishedAt',
		pageSize: String(LOCAL_PAGE_SIZE)
	});

	const response = await fetch(`${NEWS_API_BASE}/everything?${params.toString()}`, {
		headers: { 'X-Api-Key': config.apiKey }
	});

	const data = (await response.json().catch(() => null)) as NewsApiResponse | null;

	if (!response.ok || data?.status !== 'ok') {
		throw new Error(
			`NewsAPI returned ${response.status}${data?.message ? `: ${data.message}` : ''}`
		);
	}

	return (data.articles ?? [])
		.filter((article) => !!article.title && article.title !== '[Removed]' && !!article.url)
		.map((article) => ({
			category: 'local' as const,
			externalId: article.url,
			title: article.title as string,
			url: article.url,
			source: article.source?.name ?? null,
			summary: article.description,
			imageUrl: article.urlToImage,
			publishedAt: article.publishedAt,
			extra: null
		}));
}
