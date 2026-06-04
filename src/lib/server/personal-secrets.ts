import { personalSecrets } from '$personal-config';
import type { PersonalSecrets } from '$data/personal-info.types';

export { personalSecrets };
export type { PersonalSecrets };

export {
	getPlaidLinkedItems,
	isOpenWeatherConfigured,
	isPlaidConfigured,
	isPlaidLinked,
	openWeatherLocationQuery
} from './integration-config';
