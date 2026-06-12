import type { SteamGridDbConfig } from '$data/api-config.types';

/**
 * Game cover art lookup via SteamGridDB.
 * Search the game by name, then take the first 600x900 grid (vertical box art).
 * Failures degrade to `null` so the caller can fall back to RAWG screenshots.
 * @see https://www.steamgriddb.com/api/v2
 */

const SGDB_API_BASE = 'https://www.steamgriddb.com/api/v2';

type SgdbSearchResponse = {
	success: boolean;
	data?: Array<{ id: number; name: string }>;
};

type SgdbGridsResponse = {
	success: boolean;
	data?: Array<{ url: string }>;
};

async function sgdbGet<T>(config: SteamGridDbConfig, path: string): Promise<T | null> {
	try {
		const response = await fetch(`${SGDB_API_BASE}${path}`, {
			headers: { Authorization: `Bearer ${config.apiKey}` }
		});
		if (!response.ok) return null;
		return (await response.json()) as T;
	} catch {
		return null;
	}
}

export async function fetchGameCoverFromSteamGridDb(
	config: SteamGridDbConfig,
	gameName: string
): Promise<string | null> {
	const search = await sgdbGet<SgdbSearchResponse>(
		config,
		`/search/autocomplete/${encodeURIComponent(gameName)}`
	);
	const gameId = search?.success ? search.data?.[0]?.id : undefined;
	if (!gameId) return null;

	const grids = await sgdbGet<SgdbGridsResponse>(
		config,
		`/grids/game/${gameId}?dimensions=600x900&types=static&limit=1`
	);
	return grids?.success ? (grids.data?.[0]?.url ?? null) : null;
}
