import type { RawgConfig, SteamGridDbConfig } from '$data/api-config.types';
import { fetchGameCoverFromSteamGridDb } from './steamgriddb';
import type { NewsArticleRow } from './news-types';

/**
 * Game releases via the RAWG Video Games Database.
 * Pulls a window of recently released + upcoming games ordered by popularity,
 * then swaps RAWG screenshots for proper SteamGridDB box art when available.
 * @see https://rawg.io/apidocs
 */

const RAWG_API_BASE = 'https://api.rawg.io/api';
const RELEASE_WINDOW_PAST_DAYS = 21;
const RELEASE_WINDOW_FUTURE_DAYS = 120;
const RELEASE_PAGE_SIZE = 40;
/** SteamGridDB lookups are two requests per game, so only enrich the most popular ones. */
const COVER_ART_LOOKUP_LIMIT = 16;

type RawgGame = {
	id: number;
	slug: string;
	name: string;
	released: string | null;
	background_image: string | null;
	added: number;
	platforms?: Array<{ platform: { name: string } }> | null;
};

type RawgGamesResponse = {
	results: RawgGame[];
};

function isoDateOffset(days: number, now: Date): string {
	const date = new Date(now);
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

export async function fetchGameReleasesFromRawg(
	rawg: RawgConfig,
	steamGridDb: SteamGridDbConfig | null,
	now: Date = new Date()
): Promise<NewsArticleRow[]> {
	const params = new URLSearchParams({
		key: rawg.apiKey,
		dates: `${isoDateOffset(-RELEASE_WINDOW_PAST_DAYS, now)},${isoDateOffset(RELEASE_WINDOW_FUTURE_DAYS, now)}`,
		ordering: '-added',
		page_size: String(RELEASE_PAGE_SIZE)
	});

	const response = await fetch(`${RAWG_API_BASE}/games?${params.toString()}`);
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`RAWG returned ${response.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
	}

	const data = (await response.json()) as RawgGamesResponse;
	const games = (data.results ?? []).filter((game) => !!game.released);

	const covers = new Map<number, string | null>();
	if (steamGridDb) {
		const lookups = games.slice(0, COVER_ART_LOOKUP_LIMIT);
		const results = await Promise.all(
			lookups.map((game) => fetchGameCoverFromSteamGridDb(steamGridDb, game.name))
		);
		lookups.forEach((game, index) => covers.set(game.id, results[index]));
	}

	return games.map((game) => {
		const releaseDate = game.released as string;
		const platforms = (game.platforms ?? []).map((entry) => entry.platform.name);

		return {
			category: 'gaming' as const,
			externalId: String(game.id),
			title: game.name,
			url: `https://rawg.io/games/${game.slug}`,
			source: 'RAWG',
			summary: platforms.length > 0 ? platforms.join(' · ') : null,
			imageUrl: covers.get(game.id) ?? game.background_image,
			publishedAt: `${releaseDate}T00:00:00.000Z`,
			extra: { releaseDate, platforms }
		};
	});
}
