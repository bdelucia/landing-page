/**
 * Integration credentials and options (server-only via `personalSecrets`).
 * @see https://openweathermap.org/current — OpenWeather
 * @see https://plaid.com/docs/api/#api-host — Plaid
 */

/** OpenWeatherMap Current Weather — https://openweathermap.org/current */
export type OpenWeatherConfig = {
	/** API key from https://home.openweathermap.org/api_keys */
	apiKey: string;
	/**
	 * Postal code without country suffix, e.g. `"10001"`, `"90210"`.
	 * Combined with `countryCode` as `zip,country` for the API `zip` parameter.
	 */
	zipCode: string;
	/**
	 * ISO 3166-1 alpha-2 country code (2 letters).
	 * Examples: `US`, `GB`, `CA`, `DE`. Defaults to `US` in app helpers if omitted.
	 */
	countryCode?: string;
	/**
	 * Temperature and wind units in the API response.
	 * - `metric` — Celsius, m/s
	 * - `imperial` — Fahrenheit, mph
	 * - `standard` — Kelvin, m/s
	 * @default `metric` if you omit this when calling the API
	 */
	units?: 'metric' | 'imperial' | 'standard';
};

/**
 * One institution linked through Plaid Link (one login → often several accounts).
 * @see https://plaid.com/docs/link/#token-exchange-flow
 */
export type PlaidLinkedItem = {
	/** `access_token` from Link `onSuccess` for this Item */
	accessToken: string;
	/** `item_id` for the same Item (optional) */
	itemId?: string;
	/**
	 * Shown in the UI when you link more than one Item (e.g. `"Chase"`, `"Amex"`).
	 * Omit if you only have a single linked institution.
	 */
	label?: string;
};

/**
 * Plaid — https://plaid.com/docs/
 * Set tokens after linking via Plaid Link or Quickstart.
 *
 * **Multiple accounts at one bank:** one `accessToken` / one `items` entry — Plaid returns
 * transactions for every account under that Item; each row is tagged via `account_id`.
 *
 * **Multiple banks:** add one `items` entry per Link session (each with its own `accessToken`).
 */
export type PlaidConfig = {
	/** Dashboard → Team Settings → Keys */
	clientId: string;
	/** Sandbox/development or production secret matching `environment` */
	secret: string;
	/**
	 * Which Plaid API host to use (must match the secret type from the dashboard).
	 * - `sandbox` — test institutions and fake data (local dev)
	 * - `development` — legacy limited real-data environment (Plaid approval required)
	 * - `production` — live user data
	 */
	environment: PlaidEnvironment;
	/**
	 * Single linked Item (simple setup). Use `items` instead when you have multiple banks.
	 */
	accessToken?: string;
	/** `item_id` for the same Item as `accessToken` (optional) */
	itemId?: string;
	/** One entry per linked institution when you have more than one `access_token` */
	items?: PlaidLinkedItem[];
};

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export type ApiSecrets = {
	/** Omit this object (or leave required fields blank) to disable OpenWeather */
	openWeather?: OpenWeatherConfig;
	/** Omit this object (or leave credentials blank) to disable Plaid */
	plaid?: PlaidConfig;
};
