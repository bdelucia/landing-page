import { json } from '@sveltejs/kit';
import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidConfigured, isPlaidLinked } from '$lib/server/config/integration-config';
import {
	createUpdateLinkToken,
	exchangePublicTokenForItem,
	findLinkedItemBySlug
} from '$lib/server/plaid/plaid-link';
import { recordPlaidBalanceSnapshotForLinkedItem } from '$lib/server/plaid/plaid-balance-snapshots';
import { formatPlaidApiError } from '$lib/server/plaid/plaid';
import { resolvePlaidItemLabel } from '$lib/plaid/plaid-item-slug';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!isPlaidConfigured(apiSecrets)) {
		return json({ error: 'Plaid is not configured' }, { status: 503 });
	}

	if (!isPlaidLinked(apiSecrets)) {
		return json({ error: 'No linked Plaid items found' }, { status: 412 });
	}

	let body: { label?: string; slug?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const slug = body.slug?.trim() || body.label?.trim();
	if (!slug) {
		return json({ error: 'Missing label or slug' }, { status: 400 });
	}

	const { plaid } = apiSecrets;
	const item = findLinkedItemBySlug(plaid, slug);

	if (!item) {
		return json({ error: `No linked item matches "${slug}"` }, { status: 404 });
	}

	try {
		const linkToken = await createUpdateLinkToken(plaid, item);
		return json({
			linkToken,
			label: resolvePlaidItemLabel(item)
		});
	} catch (error) {
		return json({ error: formatPlaidApiError(error) }, { status: 502 });
	}
};
