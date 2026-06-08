import { json } from '@sveltejs/kit';
import { buildBalanceChartDebugReport } from '$lib/server/balances/balance-chart-debug';
import { apiSecrets } from '$lib/server/config/secrets';
import type { RequestHandler } from './$types';

function readBearerToken(header: string | null): string {
	if (!header) return '';
	const [scheme, token] = header.split(' ');
	if (scheme?.toLowerCase() !== 'bearer') return '';
	return token?.trim() ?? '';
}

export const GET: RequestHandler = async ({ request }) => {
	const configuredToken = process.env.BALANCE_LOG_CRON_TOKEN?.trim() ?? '';
	if (!configuredToken) {
		return json(
			{
				error: 'BALANCE_LOG_CRON_TOKEN is not set. Refusing to expose chart debug without auth.'
			},
			{ status: 503 }
		);
	}

	const requestToken = readBearerToken(request.headers.get('authorization'));
	if (requestToken !== configuredToken) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!apiSecrets.plaid) {
		return json({ error: 'Plaid is not configured' }, { status: 412 });
	}

	return json(buildBalanceChartDebugReport(apiSecrets.plaid));
};
