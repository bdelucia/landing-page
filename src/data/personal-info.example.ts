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
	// newsApi: {
	// 	apiKey: '', // https://newsapi.org/account
	// 	country: 'us', // lowercase ISO country: us, gb, de, …
	// 	category: 'general', // business | entertainment | general | health | science | sports | technology (mainly us/gb)
	// 	pageSize: 5 // 1–100
	// },
	// plaid: {
	// 	clientId: '',
	// 	secret: '', // must match environment (sandbox vs production keys)
	// 	environment: 'sandbox', // sandbox | development | production
	// 	accessToken: '', // from Plaid Link / Quickstart
	// 	itemId: '' // optional; same Item as accessToken
	// }
};
