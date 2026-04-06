import { browser } from '$app/environment';

export const WALLPAPER_STORAGE_KEY = 'landing-page:wallpaper-filename';

export type WallpaperEntry = { url: string; filename: string; name: string };

const wallpapersModule = import.meta.glob<string>('$lib/assets/backgrounds/*.{png,jpg,jpeg,webp,avif}', {
	eager: true,
	query: '?url',
	import: 'default'
});

function displayNameFromFilename(filename: string): string {
	return filename
		.replace(/\.[^.]+$/, '')
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const wallpaperEntries: WallpaperEntry[] = Object.entries(wallpapersModule).map(([path, url]) => {
	const filename = path.split('/').pop() ?? path;
	return {
		url,
		filename,
		name: displayNameFromFilename(filename)
	};
});

const urlByFilename = new Map(wallpaperEntries.map((e) => [e.filename, e.url]));

/** Resolve bundled URL for a saved filename (stable across sessions; Vite URLs are not). */
export function getUrlForFilename(filename: string): string | undefined {
	return urlByFilename.get(filename);
}

export function getSavedWallpaperUrl(): string | undefined {
	if (!browser) return undefined;
	try {
		const filename = localStorage.getItem(WALLPAPER_STORAGE_KEY);
		if (!filename) return undefined;
		return getUrlForFilename(filename);
	} catch {
		return undefined;
	}
}

export function persistWallpaperChoice(filename: string): void {
	if (!browser) return;
	try {
		localStorage.setItem(WALLPAPER_STORAGE_KEY, filename);
	} catch {
		/* quota / private mode */
	}
}

export function pickRandomWallpaperUrl(): string | undefined {
	if (wallpaperEntries.length === 0) return undefined;
	const i = Math.floor(Math.random() * wallpaperEntries.length);
	return wallpaperEntries[i]?.url;
}

export function filenameForUrl(url: string): string | undefined {
	return wallpaperEntries.find((e) => e.url === url)?.filename;
}
