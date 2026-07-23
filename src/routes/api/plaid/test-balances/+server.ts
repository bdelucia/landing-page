import { json } from '@sveltejs/kit';
import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidConfigured, isPlaidLinked } from '$lib/server/config/integration-config';
import { testAllPlaidBalances } from '$lib/server/plaid/plaid-balance-test';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	if (!isPlaidConfigured(apiSecrets)) {
		return json({ error: 'Plaid is not configured' }, { status: 503 });
	}

	if (!isPlaidLinked(apiSecrets)) {
		return json({ error: 'No linked Plaid items found' }, { status: 412 });
	}

	const result = await testAllPlaidBalances(apiSecrets.plaid);
	const status = result.summary.failed > 0 ? 502 : 200;

	return json(result, { status });
};
