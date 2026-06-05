import type { OpenWeatherConfig } from '$data/personal-info.types';
import { withCache } from '$lib/server/cache';
import { personalSecrets } from '$lib/server/personal-secrets';
import {
	isOpenWeatherConfigured,
	openWeatherLocationQuery
} from '$lib/server/integration-config';
import {
	weatherIconFromCondition,
	type WeatherDisplay
} from '$lib/weather';

type OpenWeatherCurrentResponse = {
	name: string;
	main: { temp: number; temp_min: number; temp_max: number };
	weather: Array<{
		id: number;
		description: string;
		icon: string;
	}>;
};

function formatTemperature(temp: number, units: OpenWeatherConfig['units']): string {
	const rounded = Math.round(temp);
	switch (units ?? 'metric') {
		case 'imperial':
			return `${rounded}°F`;
		case 'standard':
			return `${rounded} K`;
		default:
			return `${rounded}°C`;
	}
}

function capitalizeDescription(description: string): string {
	return description.replace(/\b\w/g, (char) => char.toUpperCase());
}

export type FetchWeatherResult = {
	weather: WeatherDisplay | null;
	error: string | null;
};

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

export async function fetchCurrentWeather(): Promise<FetchWeatherResult> {
	if (!isOpenWeatherConfigured(personalSecrets)) {
		return { weather: null, error: null };
	}

	const { openWeather } = personalSecrets;
	const cacheKey = `open-weather:${openWeatherLocationQuery(openWeather)}:${openWeather.units ?? 'metric'}`;

	return withCache(cacheKey, WEATHER_CACHE_TTL_MS, () => fetchCurrentWeatherUncached(openWeather));
}

async function fetchCurrentWeatherUncached(
	openWeather: OpenWeatherConfig
): Promise<FetchWeatherResult> {
	const units = openWeather.units ?? 'metric';
	const params = new URLSearchParams({
		zip: openWeatherLocationQuery(openWeather),
		appid: openWeather.apiKey,
		units
	});

	try {
		const response = await fetch(
			`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`
		);

		if (!response.ok) {
			const body = await response.text();
			return {
				weather: null,
				error: `OpenWeather returned ${response.status}${body ? `: ${body.slice(0, 120)}` : ''}`
			};
		}

		const data = (await response.json()) as OpenWeatherCurrentResponse;
		const condition = data.weather[0];
		if (!condition) {
			return { weather: null, error: 'OpenWeather response had no weather conditions' };
		}

		return {
			weather: {
				temperature: formatTemperature(data.main.temp, units),
				high: formatTemperature(data.main.temp_max, units),
				low: formatTemperature(data.main.temp_min, units),
				description: capitalizeDescription(condition.description),
				location: data.name,
				icon: weatherIconFromCondition(condition.id, condition.icon)
			},
			error: null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { weather: null, error: `Failed to fetch weather: ${message}` };
	}
}
