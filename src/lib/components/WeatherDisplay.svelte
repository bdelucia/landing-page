<script lang="ts">
	import type { WeatherDisplay, WeatherIconKey } from '$lib/weather';
	import ClearDayIcon from '~icons/material-symbols/clear-day-rounded';
	import ClearNightIcon from '~icons/material-symbols/clear-night';
	import PartlyCloudyDayIcon from '~icons/material-symbols/partly-cloudy-day-rounded';
	import PartlyCloudyNightIcon from '~icons/material-symbols/partly-cloudy-night-rounded';
	import CloudIcon from '~icons/material-symbols/cloud';
	import RainyIcon from '~icons/material-symbols/rainy';
	import RainyHeavyIcon from '~icons/material-symbols/rainy-heavy';
	import SnowyIcon from '~icons/material-symbols/weather-snowy';
	import ThunderstormIcon from '~icons/material-symbols/thunderstorm-rounded';
	import FoggyIcon from '~icons/material-symbols/foggy';
	import DrizzleIcon from '~icons/material-symbols/grain';
	import ArrowUpIcon from '~icons/material-symbols/arrow-upward-alt-rounded';
	import ArrowDownIcon from '~icons/material-symbols/arrow-downward-alt-rounded';

	let {
		weather = null,
		error = null
	}: {
		weather?: WeatherDisplay | null;
		error?: string | null;
	} = $props();

	const iconMap: Record<WeatherIconKey, typeof ClearDayIcon> = {
		'clear-day': ClearDayIcon,
		'clear-night': ClearNightIcon,
		'partly-cloudy-day': PartlyCloudyDayIcon,
		'partly-cloudy-night': PartlyCloudyNightIcon,
		cloud: CloudIcon,
		rainy: RainyIcon,
		'rainy-heavy': RainyHeavyIcon,
		snowy: SnowyIcon,
		thunderstorm: ThunderstormIcon,
		foggy: FoggyIcon,
		drizzle: DrizzleIcon
	};
</script>

{#if weather}
	{@const WeatherIcon = iconMap[weather.icon]}
	<div
		class="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-primary shadow-lg sm:px-5 sm:py-2.5"
		role="status"
		aria-label="{weather.description} in {weather.location}, {weather.temperature}, high {weather.high}, low {weather.low}"
	>
		<WeatherIcon aria-hidden="true" class="size-6 shrink-0 text-primary" />
		<div class="flex min-w-0 flex-col gap-0.5 leading-tight">
			<span class="text-sm font-medium tabular-nums">{weather.temperature}</span>
			<div class="flex items-center gap-2 whitespace-nowrap text-xs">
				<span class="inline-flex items-center gap-0.5 text-[#fb923c]">
					<ArrowUpIcon aria-hidden="true" class="size-3.5 shrink-0" />
					<span class="tabular-nums">{weather.high}</span>
				</span>
				<span class="inline-flex items-center gap-0.5 text-[#6bb8ff]">
					<span class="tabular-nums">{weather.low}</span>
					<ArrowDownIcon aria-hidden="true" class="size-3.5 shrink-0" />
				</span>
			</div>
		</div>
	</div>
{:else if error}
	<p class="px-2 text-xs text-muted-foreground" role="status" title={error}>Weather unavailable</p>
{/if}
