import { json } from '@sveltejs/kit';
import { syncNews } from '$lib/server/news/news-sync';
import type { RequestHandler } from './$types';

function readBearerToken(header: string | null): string {
	if (!header) return '';
	const [scheme, token] = header.split(' ');
	if (scheme?.toLowerCase() !== 'bearer') return '';
	return token?.trim() ?? '';
}

export const POST: RequestHandler = async ({ request }) => {
	const configuredToken = process.env.NEWS_SYNC_CRON_TOKEN?.trim() ?? '';
	if (!configuredToken) {
		return json(
			{ error: 'NEWS_SYNC_CRON_TOKEN is not set. Refusing to run news sync without auth.' },
			{ status: 503 }
		);
	}

	const requestToken = readBearerToken(request.headers.get('authorization'));
	if (requestToken !== configuredToken) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await syncNews();

	const attempted = Object.keys(result.synced).length + result.failures.length;
	if (attempted === 0) {
		return json(
			{ ...result, message: 'No news sources are configured in secrets.local.ts' },
			{ status: 412 }
		);
	}

	if (result.failures.length > 0) {
		return json(result, { status: 502 });
	}

	return json(result);
};
