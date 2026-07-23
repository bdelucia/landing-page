import { apiSecrets } from '$lib/server/config/secrets';
import {
	isPlaidConfigured,
	isPlaidLinked
} from '$lib/server/config/integration-config';
import { getPlaidItemStatuses } from '$lib/server/plaid/plaid-link';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (!isPlaidConfigured(apiSecrets)) {
		return {
			configured: false as const,
			linked: false as const,
			items: [] as Array<{
				label: string;
				slug: string;
				itemId: string | null;
				needsRelink: boolean;
				error: string | null;
			}>
		};
	}

	if (!isPlaidLinked(apiSecrets)) {
		return {
			configured: true as const,
			linked: false as const,
			items: [] as Array<{
				label: string;
				slug: string;
				itemId: string | null;
				needsRelink: boolean;
				error: string | null;
			}>
		};
	}

	const items = await getPlaidItemStatuses(apiSecrets.plaid);

	return {
		configured: true as const,
		linked: true as const,
		items
	};
};
