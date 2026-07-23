import { json } from '@sveltejs/kit';
import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidConfigured, isPlaidLinked } from '$lib/server/config/integration-config';
import {
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

	let body: { publicToken?: string; label?: string; slug?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const publicToken = body.publicToken?.trim();
	const slug = body.slug?.trim() || body.label?.trim();

	if (!publicToken) {
		return json({ error: 'Missing publicToken' }, { status: 400 });
	}

	if (!slug) {
		return json({ error: 'Missing label or slug' }, { status: 400 });
	}

	const { plaid } = apiSecrets;
	const item = findLinkedItemBySlug(plaid, slug);

	if (!item) {
		return json({ error: `No linked item matches "${slug}"` }, { status: 404 });
	}

	const label = resolvePlaidItemLabel(item);

	try {
		const result = await exchangePublicTokenForItem(plaid, publicToken, label);
		const updatedItem = { ...item, accessToken: result.accessToken, itemId: result.itemId };
		const snapshot = await recordPlaidBalanceSnapshotForLinkedItem(plaid, updatedItem);

		return json({
			label: result.label,
			itemId: result.itemId,
			balanceSnapshot: {
				inserted: snapshot.inserted,
				message: snapshot.message
			}
		});
	} catch (error) {
		return json({ error: formatPlaidApiError(error) }, { status: 502 });
	}
};
