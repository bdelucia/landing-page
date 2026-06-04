import type { ApiSecrets } from './api-config.types';

export type {
	ApiSecrets,
	NewsApiConfig,
	NewsApiCategory,
	OpenWeatherConfig,
	PlaidConfig,
	PlaidEnvironment
} from './api-config.types';

/** Fields safe to use in pages and components (bundled for the browser). */
export type PersonalInfo = {
	displayName: string;
	/** Overrides the default “welcome back {displayName}…” heading. */
	welcomeMessage?: string;
};

/** Server-only credentials and integration settings. Import via `$lib/server/personal-secrets`. */
export type PersonalSecrets = ApiSecrets;

export type PersonalConfig = {
	info: PersonalInfo;
	secrets: PersonalSecrets;
};
