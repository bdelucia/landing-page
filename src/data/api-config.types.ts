/**
 * Integration credentials and options (server-only via `personalSecrets`).
 * @see https://openweathermap.org/current — OpenWeather
 * @see https://newsapi.org/docs/endpoints/top-headlines — NewsAPI
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

/** NewsAPI top headlines — https://newsapi.org/docs/endpoints/top-headlines */
export type NewsApiConfig = {
	/** API key from https://newsapi.org/account */
	apiKey: string;
	/**
	 * 2-letter ISO 3166-1 country code (lowercase), e.g. `us`, `gb`, `de`, `au`.
	 * Full list: https://newsapi.org/docs/endpoints/top-headlines
	 */
	country?: string;
	/**
	 * Headline category. **Only supported for some countries** (e.g. `us`, `gb`); ignored elsewhere.
	 * Allowed values:
	 * `business` | `entertainment` | `general` | `health` | `science` | `sports` | `technology`
	 */
	category?: NewsApiCategory;
	/**
	 * Number of articles to return (1–100).
	 * @default 20 on NewsAPI if omitted
	 */
	pageSize?: number;
};

export type NewsApiCategory =
	| 'business'
	| 'entertainment'
	| 'general'
	| 'health'
	| 'science'
	| 'sports'
	| 'technology';

/**
 * Plaid — https://plaid.com/docs/
 * Set `accessToken` (and optionally `itemId`) after linking an Item via Plaid Link or Quickstart.
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
	/** `access_token` for the linked Item. Required for `/transactions/get` and similar. */
	accessToken?: string;
	/** `item_id` for the same Item (optional; useful for `/item/get` or removing the Item). */
	itemId?: string;
};

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export type ApiSecrets = {
	/** Omit this object (or leave required fields blank) to disable OpenWeather */
	openWeather?: OpenWeatherConfig;
	/** Omit this object (or leave `apiKey` blank) to disable NewsAPI */
	newsApi?: NewsApiConfig;
	/** Omit this object (or leave credentials blank) to disable Plaid */
	plaid?: PlaidConfig;
};
