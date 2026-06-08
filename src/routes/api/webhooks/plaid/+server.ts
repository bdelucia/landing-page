import { json } from '@sveltejs/kit';
import { personalSecrets } from '$lib/server/personal-secrets';
import { isPlaidConfigured } from '$lib/server/integration-config';
import { handlePlaidWebhook, verifyPlaidWebhookRequest } from '$lib/server/plaid-webhook';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!isPlaidConfigured(personalSecrets)) {
		return json({ error: 'Plaid is not configured' }, { status: 503 });
	}

	const rawBody = await request.text();
	const verification = await verifyPlaidWebhookRequest(
		rawBody,
		request.headers.get('plaid-verification'),
		personalSecrets.plaid
	);

	if (!verification.ok) {
		return json({ error: verification.reason }, { status: 401 });
	}

	const result = await handlePlaidWebhook(rawBody);
	const status = result.accepted ? 200 : 400;

	return json(result, { status });
};
