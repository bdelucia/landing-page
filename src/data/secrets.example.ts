import type { ApiSecrets } from './api-config.types';

/**
 * Copy this file to `secrets.local.ts` and add your API keys.
 * `secrets.local.ts` is gitignored — do not commit secrets.
 *
 * Allowed values for API fields are documented in `api-config.types.ts` (hover in the editor).
 */
export const apiSecrets: ApiSecrets = {
	// openWeather: {
	// 	apiKey: '', // https://home.openweathermap.org/api_keys
	// 	zipCode: '', // e.g. "10001"
	// 	countryCode: 'US', // ISO 3166-1 alpha-2: US, GB, CA, …
	// 	units: 'imperial' // metric | imperial | standard
	// },
	// plaid: {
	// 	clientId: '',
	// 	secret: '', // must match environment (sandbox vs production keys)
	// 	environment: 'sandbox', // sandbox | development | production
	// 	accessToken: '', // one bank: single token for all accounts at that institution
	// 	itemId: '', // optional; webhooks resolve this automatically from accessToken
	// 	// Multiple banks: one entry per Link session (each with its own accessToken)
	// 	// items: [
	// 	// 	{ accessToken: '', itemId: '', label: 'AZFCU' },
	// 	// 	{ accessToken: '', itemId: '', label: 'Robinhood' },
	// 	// 	{ accessToken: '', itemId: '', label: 'Fidelity' }
	// 	// ]
	// }
};
