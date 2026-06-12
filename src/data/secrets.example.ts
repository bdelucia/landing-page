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
	// },
	// investmentBaselines: {
	// 	Fidelity: 0, // total contributed before tracking began
	// 	Robinhood: 0
	// },
	// investmentTrackingStartDate: '2026-06-08' // optional fallback if no snapshots yet
	// news: {
	// 	// Local (Arizona) headlines — https://newsapi.org/account
	// 	newsApi: {
	// 		apiKey: '',
	// 		query: '"Arizona" OR "Phoenix"' // optional; defaults to this
	// 	},
	// 	// Game releases — https://rawg.io/apidocs
	// 	rawg: {
	// 		apiKey: ''
	// 	},
	// 	// Game cover art — https://www.steamgriddb.com/profile/preferences/api
	// 	steamGridDb: {
	// 		apiKey: ''
	// 	},
	// 	// AI stories from Hacker News (Firebase API) — keyless, `{}` enables it
	// 	hackerNews: {
	// 		// keywords: ['AI', 'LLM', 'OpenAI'], // optional; defaults to a built-in list
	// 		// maxStories: 150 // optional; top stories scanned per sync
	// 	}
	// }
};
