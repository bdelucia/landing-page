const GEMINI_APP_URL = 'https://gemini.google.com/app';

/** Opens Gemini with `?q=` — same URL Firefox `@g` uses with Gemini URL Search. */
export function sendToGemini(prompt: string): boolean {
	const text = prompt.trim();
	if (!text) return false;

	const url = new URL(GEMINI_APP_URL);
	url.searchParams.set('q', text);
	window.location.assign(url.toString());
	return true;
}
