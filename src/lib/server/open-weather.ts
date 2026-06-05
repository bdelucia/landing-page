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

type OpenWeatherGeocodeResponse = {
	name: string;
	lat: number;
	lon: number;
};

type OpenWeatherOneCallResponse = {
	current: {
		temp: number;
		weather: Array<{
			id: number;
			description: string;
			icon: string;
		}>;
	};
	daily: Array<{
		temp: { min: number; max: number };
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
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchCurrentWeather(): Promise<FetchWeatherResult> {
	if (!isOpenWeatherConfigured(personalSecrets)) {
		return { weather: null, error: null };
	}

	const { openWeather } = personalSecrets;
	const locationQuery = openWeatherLocationQuery(openWeather);
	const units = openWeather.units ?? 'metric';
	const cacheKey = `open-weather:${locationQuery}:${units}`;

	return withCache(cacheKey, WEATHER_CACHE_TTL_MS, () =>
		fetchCurrentWeatherUncached(openWeather, locationQuery, units)
	);
}

async function geocodeZip(
	openWeather: OpenWeatherConfig,
	locationQuery: string
): Promise<{ location: OpenWeatherGeocodeResponse } | { error: string }> {
	const cacheKey = `open-weather-geocode:${locationQuery}`;

	return withCache(cacheKey, GEOCODE_CACHE_TTL_MS, async () => {
		const params = new URLSearchParams({
			zip: locationQuery,
			appid: openWeather.apiKey
		});

		try {
			const response = await fetch(
				`https://api.openweathermap.org/geo/1.0/zip?${params.toString()}`
			);

			if (!response.ok) {
				const body = await response.text();
				return {
					error: `OpenWeather geocoding returned ${response.status}${body ? `: ${body.slice(0, 120)}` : ''}`
				};
			}

			const data = (await response.json()) as OpenWeatherGeocodeResponse;
			return { location: data };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return { error: `Failed to geocode location: ${message}` };
		}
	});
}

async function fetchCurrentWeatherUncached(
	openWeather: OpenWeatherConfig,
	locationQuery: string,
	units: NonNullable<OpenWeatherConfig['units']> | 'metric'
): Promise<FetchWeatherResult> {
	const geocode = await geocodeZip(openWeather, locationQuery);
	if ('error' in geocode) {
		return { weather: null, error: geocode.error };
	}

	const { lat, lon, name } = geocode.location;
	const params = new URLSearchParams({
		lat: String(lat),
		lon: String(lon),
		exclude: 'minutely,hourly,alerts',
		units,
		appid: openWeather.apiKey
	});

	try {
		const response = await fetch(
			`https://api.openweathermap.org/data/3.0/onecall?${params.toString()}`
		);

		if (!response.ok) {
			const body = await response.text();
			return {
				weather: null,
				error: `OpenWeather One Call returned ${response.status}${body ? `: ${body.slice(0, 120)}` : ''}`
			};
		}

		const data = (await response.json()) as OpenWeatherOneCallResponse;
		const condition = data.current.weather[0];
		const today = data.daily[0];

		if (!condition) {
			return { weather: null, error: 'OpenWeather response had no weather conditions' };
		}

		if (!today) {
			return { weather: null, error: 'OpenWeather response had no daily forecast' };
		}

		return {
			weather: {
				temperature: formatTemperature(data.current.temp, units),
				high: formatTemperature(today.temp.max, units),
				low: formatTemperature(today.temp.min, units),
				description: capitalizeDescription(condition.description),
				location: name,
				icon: weatherIconFromCondition(condition.id, condition.icon)
			},
			error: null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { weather: null, error: `Failed to fetch weather: ${message}` };
	}
}
