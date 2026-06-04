import { personalInfo as info } from '$personal-config';
import type { PersonalInfo } from './personal-info.types';

export type {
	PersonalInfo,
	PersonalSecrets,
	PersonalConfig,
	OpenWeatherConfig,
	NewsApiConfig,
	NewsApiCategory,
	PlaidConfig,
	PlaidEnvironment,
	ApiSecrets
} from './personal-info.types';

/** Public profile fields (name, location, copy). Safe for client-side UI. */
export const personalInfo: PersonalInfo = info;

export function getWelcomeMessage(profile: PersonalInfo = personalInfo): string {
	if (profile.welcomeMessage?.trim()) {
		return profile.welcomeMessage.trim();
	}
	return `welcome back ${profile.displayName}...`;
}
