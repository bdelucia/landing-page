/** Client-safe weather display types (no secrets). */

export type WeatherIconKey =
	| 'clear-day'
	| 'clear-night'
	| 'partly-cloudy-day'
	| 'partly-cloudy-night'
	| 'cloud'
	| 'rainy'
	| 'rainy-heavy'
	| 'snowy'
	| 'thunderstorm'
	| 'foggy'
	| 'drizzle';

export type WeatherDisplay = {
	temperature: string;
	high: string;
	low: string;
	description: string;
	location: string;
	icon: WeatherIconKey;
};

/**
 * Maps OpenWeather condition codes to a Material Symbols icon key.
 * @see https://openweathermap.org/weather-conditions
 */
export function weatherIconFromCondition(conditionId: number, iconCode: string): WeatherIconKey {
	const isDay = iconCode.endsWith('d');

	if (conditionId >= 200 && conditionId < 300) return 'thunderstorm';
	if (conditionId >= 300 && conditionId < 400) return 'drizzle';
	if (conditionId >= 500 && conditionId < 600) {
		return conditionId >= 520 ? 'rainy-heavy' : 'rainy';
	}
	if (conditionId >= 600 && conditionId < 700) return 'snowy';
	if (conditionId >= 700 && conditionId < 800) return 'foggy';
	if (conditionId === 800) return isDay ? 'clear-day' : 'clear-night';
	if (conditionId === 801) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
	if (conditionId === 802) return 'cloud';
	return 'cloud';
}
