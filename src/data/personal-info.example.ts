import type { PersonalInfo, PersonalSecrets } from './personal-info.types';

/**
 * Copy this file to `personal-info.local.ts` and edit for your deployment.
 * `personal-info.local.ts` is gitignored — do not commit API keys or other secrets.
 *
 * Allowed values for API fields are documented in `api-config.types.ts` (hover in the editor).
 */
export const personalInfo: PersonalInfo = {
	displayName: 'Friend',
	welcomeMessage: undefined
};

/**
 * Optional API blocks — omit a key entirely to skip that integration.
 */
export const personalSecrets: PersonalSecrets = {
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
	// 	itemId: '', // optional; same Item as accessToken
	// 	// Multiple banks: one entry per Link session (each with its own accessToken)
	// 	// items: [
	// 	// 	{ accessToken: '', label: 'Chase' },
	// 	// 	{ accessToken: '', label: 'Amex' }
	// 	// ]
	// }
};
