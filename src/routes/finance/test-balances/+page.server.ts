import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidConfigured, isPlaidLinked } from '$lib/server/config/integration-config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		configured: isPlaidConfigured(apiSecrets),
		linked: isPlaidLinked(apiSecrets)
	};
};
