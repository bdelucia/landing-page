import type { Tooltip } from "layerchart";
import { getContext, setContext, type Component, type Snippet } from "svelte";

export const THEMES = { light: "", dark: ".dark" } as const;

/** Palette literals — avoids CSS var chaining issues in chart injected styles. */
export const CHECKING_CHART_COLOR = '#3584e4';
export const SAVINGS_CHART_COLOR = '#39ff14';
export const TOTAL_BALANCE_CHART_COLOR = '#00ffff';

export const ACCOUNT_CHART_COLORS = [
	CHECKING_CHART_COLOR,
	SAVINGS_CHART_COLOR,
	'#f59e0b',
	'#a78bfa'
] as const;

export function chartColorForAccount(typeLabel: string, index: number): string {
	if (index === 0) {
		return CHECKING_CHART_COLOR;
	}

	if (index === 1) {
		return SAVINGS_CHART_COLOR;
	}

	const label = typeLabel.toLowerCase();

	if (label.includes('checking')) {
		return CHECKING_CHART_COLOR;
	}

	if (label.includes('savings') || label.includes('money market')) {
		return SAVINGS_CHART_COLOR;
	}

	return ACCOUNT_CHART_COLORS[index % ACCOUNT_CHART_COLORS.length];
}

export type ChartConfig = {
	[k in string]: {
		label?: string;
		icon?: Component;
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	);
};

export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never;

export type TooltipPayload = Tooltip.TooltipSeries;

// Helper to extract item config from a payload.
export function getPayloadConfigFromPayload(
	config: ChartConfig,
	payload: TooltipPayload,
	key: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: Record<string, any> | null
) {
	if (typeof payload !== "object" || payload === null) return undefined;

	const payloadConfig =
		"config" in payload && typeof payload.config === "object" && payload.config !== null
			? payload.config
			: undefined;

	let configLabelKey: string = key;

	if (payload.key === key) {
		configLabelKey = payload.key;
	} else if (payload.label === key) {
		configLabelKey = payload.label;
	} else if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
		configLabelKey = payload[key as keyof typeof payload] as string;
	} else if (
		payloadConfig !== undefined &&
		key in payloadConfig &&
		typeof payloadConfig[key as keyof typeof payloadConfig] === "string"
	) {
		configLabelKey = payloadConfig[key as keyof typeof payloadConfig] as string;
	} else if (data != null && key in data && typeof data[key] === "string") {
		configLabelKey = data[key] as string;
	}

	return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

type ChartContextValue = {
	config: ChartConfig;
};

const chartContextKey = Symbol("chart-context");

export function setChartContext(value: ChartContextValue) {
	return setContext(chartContextKey, value);
}

export function useChart() {
	return getContext<ChartContextValue>(chartContextKey);
}
