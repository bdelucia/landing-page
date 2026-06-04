import type {
	NewsApiConfig,
	OpenWeatherConfig,
	PersonalSecrets,
	PlaidConfig
} from '$data/personal-info.types';

function hasValue(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/** `zip,country` query param for OpenWeather current weather by ZIP */
export function openWeatherLocationQuery(config: OpenWeatherConfig): string {
	const zip = config.zipCode.trim();
	const country = (config.countryCode ?? 'US').trim().toUpperCase();
	return `${zip},${country}`;
}

export function isOpenWeatherConfigured(
	secrets: PersonalSecrets
): secrets is PersonalSecrets & { openWeather: OpenWeatherConfig } {
	const config = secrets.openWeather;
	return !!config && hasValue(config.apiKey) && hasValue(config.zipCode);
}

export function isNewsApiConfigured(
	secrets: PersonalSecrets
): secrets is PersonalSecrets & { newsApi: NewsApiConfig } {
	const config = secrets.newsApi;
	return !!config && hasValue(config.apiKey);
}

export function isPlaidConfigured(
	secrets: PersonalSecrets
): secrets is PersonalSecrets & { plaid: PlaidConfig } {
	const config = secrets.plaid;
	return !!config && hasValue(config.clientId) && hasValue(config.secret);
}

/** Plaid transaction endpoints also need a stored access token on the linked Item */
export function isPlaidLinked(
	secrets: PersonalSecrets
): secrets is PersonalSecrets & { plaid: PlaidConfig & { accessToken: string } } {
	return isPlaidConfigured(secrets) && hasValue(secrets.plaid.accessToken);
}
