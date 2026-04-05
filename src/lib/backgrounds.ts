const bgModules = import.meta.glob('./assets/backgrounds/*.{jpg,jpeg,png,webp}', {
	eager: true,
	query: '?url',
	import: 'default'
}) as Record<string, string>;

/** Stable order so the daily rotation is predictable when files are added or removed. */
export const backgroundUrls: string[] = Object.keys(bgModules)
	.sort()
	.map((key) => bgModules[key]!);

/**
 * Picks a background using the UTC calendar day so SSR and the client agree,
 * and the image changes once per 24h at UTC midnight.
 */
export function getDailyBackgroundUrl(urls: readonly string[]): string | undefined {
	if (urls.length === 0) return undefined;
	const now = new Date();
	const utcDays = Math.floor(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000
	);
	return urls[utcDays % urls.length];
}
