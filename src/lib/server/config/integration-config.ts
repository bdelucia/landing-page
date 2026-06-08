import type {
	ApiSecrets,
	OpenWeatherConfig,
	PlaidConfig,
	PlaidLinkedItem
} from '$data/api-config.types';

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
	secrets: ApiSecrets
): secrets is ApiSecrets & { openWeather: OpenWeatherConfig } {
	const config = secrets.openWeather;
	return !!config && hasValue(config.apiKey) && hasValue(config.zipCode);
}

export function isPlaidConfigured(
	secrets: ApiSecrets
): secrets is ApiSecrets & { plaid: PlaidConfig } {
	const config = secrets.plaid;
	return !!config && hasValue(config.clientId) && hasValue(config.secret);
}

/** Linked Items with at least one access token (single `accessToken` or `items[]`). */
export function getPlaidLinkedItems(plaid: PlaidConfig): PlaidLinkedItem[] {
	if (plaid.items?.length) {
		return plaid.items.filter((item) => hasValue(item.accessToken));
	}
	if (hasValue(plaid.accessToken)) {
		return [{ accessToken: plaid.accessToken, itemId: plaid.itemId }];
	}
	return [];
}

/** Plaid transaction endpoints need at least one stored access token */
export function isPlaidLinked(secrets: ApiSecrets): secrets is ApiSecrets & { plaid: PlaidConfig } {
	return isPlaidConfigured(secrets) && getPlaidLinkedItems(secrets.plaid).length > 0;
}
