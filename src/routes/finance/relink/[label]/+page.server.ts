import { error } from '@sveltejs/kit';
import { apiSecrets } from '$lib/server/config/secrets';
import {
	getPlaidLinkedItems,
	isPlaidConfigured,
	isPlaidLinked
} from '$lib/server/config/integration-config';
import { getPlaidItemStatuses, findLinkedItemBySlug } from '$lib/server/plaid/plaid-link';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!isPlaidConfigured(apiSecrets)) {
		error(503, 'Plaid is not configured');
	}

	if (!isPlaidLinked(apiSecrets)) {
		error(412, 'No linked Plaid items found');
	}

	const slug = params.label.trim().toLowerCase();
	const item = findLinkedItemBySlug(apiSecrets.plaid, slug);

	if (!item) {
		const available = getPlaidLinkedItems(apiSecrets.plaid).map((linked) => linked.label ?? 'Account');
		error(404, `No linked item matches "${slug}". Available: ${available.join(', ')}`);
	}

	const statuses = await getPlaidItemStatuses(apiSecrets.plaid);
	const status = statuses.find((entry) => entry.slug === slug);

	if (!status) {
		error(404, `Could not load status for "${slug}"`);
	}

	return {
		configured: true as const,
		linked: true as const,
		items: [status],
		focusSlug: slug,
		autoOpen: true
	};
};
