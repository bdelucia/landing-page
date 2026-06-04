import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import type { PlaidConfig, PlaidEnvironment } from '$data/personal-info.types';

const environmentHosts: Record<PlaidEnvironment, string> = {
	sandbox: PlaidEnvironments.sandbox,
	development: PlaidEnvironments.development,
	production: PlaidEnvironments.production
};

export function createPlaidClient(config: PlaidConfig): PlaidApi {
	return new PlaidApi(
		new Configuration({
			basePath: environmentHosts[config.environment],
			baseOptions: {
				headers: {
					'PLAID-CLIENT-ID': config.clientId,
					'PLAID-SECRET': config.secret
				}
			}
		})
	);
}

export function formatPlaidApiError(error: unknown): string {
	const data = (error as { response?: { data?: { error_message?: string; display_message?: string } } })
		.response?.data;
	return data?.display_message ?? data?.error_message ?? 'Plaid API error';
}
