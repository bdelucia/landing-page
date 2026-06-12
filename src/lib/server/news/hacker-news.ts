import type { HackerNewsConfig } from '$data/api-config.types';
import type { NewsArticleRow } from './news-types';

/**
 * AI stories from the official Hacker News API, which is served from Firebase
 * (https://hacker-news.firebaseio.com). Stories only show up here once posted,
 * so the feed is naturally event-driven. No API key required.
 * @see https://github.com/HackerNews/API
 */

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const DEFAULT_MAX_STORIES = 150;
const ITEM_FETCH_BATCH_SIZE = 25;

const DEFAULT_AI_KEYWORDS = [
	'AI',
	'A.I.',
	'AGI',
	'LLM',
	'LLMs',
	'GPT',
	'ChatGPT',
	'OpenAI',
	'Anthropic',
	'Claude',
	'Gemini',
	'DeepSeek',
	'Mistral',
	'Llama',
	'Copilot',
	'machine learning',
	'deep learning',
	'neural network',
	'transformer model',
	'diffusion model',
	'generative'
];

type HackerNewsItem = {
	id: number;
	type?: string;
	title?: string;
	url?: string;
	score?: number;
	descendants?: number;
	time?: number;
	dead?: boolean;
	deleted?: boolean;
};

function buildKeywordPattern(keywords: string[]): RegExp {
	const escaped = keywords
		.map((keyword) => keyword.trim())
		.filter(Boolean)
		.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

	return new RegExp(`(?:^|[^A-Za-z0-9])(?:${escaped.join('|')})(?=$|[^A-Za-z0-9])`, 'i');
}

function articleSourceFromUrl(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return 'Hacker News';
	}
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Hacker News API returned ${response.status} for ${url}`);
	}
	return (await response.json()) as T;
}

async function fetchItemsInBatches(ids: number[]): Promise<HackerNewsItem[]> {
	const items: HackerNewsItem[] = [];

	for (let offset = 0; offset < ids.length; offset += ITEM_FETCH_BATCH_SIZE) {
		const batch = ids.slice(offset, offset + ITEM_FETCH_BATCH_SIZE);
		const results = await Promise.all(
			batch.map((id) =>
				fetchJson<HackerNewsItem | null>(`${HN_API_BASE}/item/${id}.json`).catch(() => null)
			)
		);
		for (const item of results) {
			if (item) items.push(item);
		}
	}

	return items;
}

export async function fetchAiStoriesFromHackerNews(
	config: HackerNewsConfig
): Promise<NewsArticleRow[]> {
	const maxStories = config.maxStories ?? DEFAULT_MAX_STORIES;
	const keywords = config.keywords?.length ? config.keywords : DEFAULT_AI_KEYWORDS;
	const keywordPattern = buildKeywordPattern(keywords);

	const topStoryIds = await fetchJson<number[]>(`${HN_API_BASE}/topstories.json`);
	const items = await fetchItemsInBatches(topStoryIds.slice(0, maxStories));

	return items
		.filter(
			(item) =>
				item.type === 'story' &&
				!item.dead &&
				!item.deleted &&
				!!item.title &&
				keywordPattern.test(item.title)
		)
		.map((item) => {
			const url = item.url ?? `https://news.ycombinator.com/item?id=${item.id}`;
			const points = item.score ?? 0;
			const comments = item.descendants ?? 0;

			return {
				category: 'ai' as const,
				externalId: String(item.id),
				title: item.title as string,
				url,
				source: articleSourceFromUrl(url),
				summary: `${points} point${points === 1 ? '' : 's'} · ${comments} comment${comments === 1 ? '' : 's'} on Hacker News`,
				imageUrl: null,
				publishedAt: new Date((item.time ?? 0) * 1000).toISOString(),
				extra: null
			};
		});
}
