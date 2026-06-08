import { json } from '@sveltejs/kit';
import { recordPlaidBalanceSnapshot } from '$lib/server/plaid-balance-snapshots';
import type { RequestHandler } from './$types';

function readBearerToken(header: string | null): string {
	if (!header) return '';
	const [scheme, token] = header.split(' ');
	if (scheme?.toLowerCase() !== 'bearer') return '';
	return token?.trim() ?? '';
}

export const POST: RequestHandler = async ({ request }) => {
	const configuredToken = process.env.BALANCE_LOG_CRON_TOKEN?.trim() ?? '';
	if (!configuredToken) {
		return json(
			{
				error: 'BALANCE_LOG_CRON_TOKEN is not set. Refusing to run balance logger without auth.'
			},
			{ status: 503 }
		);
	}

	const requestToken = readBearerToken(request.headers.get('authorization'));
	if (requestToken !== configuredToken) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await recordPlaidBalanceSnapshot();

	if (result.skipped) {
		return json(result, { status: 412 });
	}

	if (result.inserted === 0 && result.failures.length > 0) {
		return json(result, { status: 502 });
	}

	return json(result);
};
