<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import {
		TOTAL_BALANCE_CHART_COLOR,
		type ChartConfig
	} from '$lib/components/ui/chart/chart-utils';
	import {
		contributionsAsOf,
		investmentDisplayBalanceForDay,
		investmentEarningsChange,
		investmentStatsFromTimeline,
		isPreSnapshotSyntheticDay,
		preSnapshotSyntheticBalance
	} from '$lib/hooks/finances/investment-contribution-timeline';
	import {
		firstRealPlaidSortDate,
		padInvestmentChartDataForRange
	} from '$lib/hooks/finances/investment-chart-padding';
	import {
		accountSeriesKey,
		chartPointTotal,
		type BankAccountDetail
	} from '$lib/hooks/finances/bank-accounts';
	import {
		CHART_TIME_RANGE_OPTIONS,
		chartBalanceChange,
		filterChartDataByRange,
		type ChartTimeRange
	} from '$lib/hooks/chart/chart-time-range';
	import { currentChartDayKey, formatChartDayLabel } from '$lib/hooks/chart/chart-date';
	import AnimatedBalanceCounter from '$lib/components/balance/AnimatedBalanceCounter.svelte';
	import { LineChart } from 'layerchart';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	const CHART_LINE_TRANSITION_MS = 520;
	const CONTRIBUTIONS_CHART_KEY = 'contributions';

	const CHART_LINE_MOTION_ENABLED = {
		type: 'tween',
		duration: CHART_LINE_TRANSITION_MS,
		easing: cubicOut
	} as const;

	let {
		detail,
		totalOnly = false,
		summaryLabel = 'Total',
		class: className = ''
	}: {
		detail: BankAccountDetail;
		/** When true, only the combined total line is shown (no per-account toggles). */
		totalOnly?: boolean;
		/** Label shown above the main balance figure. */
		summaryLabel?: string;
		class?: string;
	} = $props();

	const balanceMoney = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const percentFormat = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const headerAccounts = $derived(detail.headerAccounts);
	const singleHeaderAccount = $derived(headerAccounts.length === 1);

	const accountKeys = $derived(headerAccounts.map((account) => accountSeriesKey(account.id)));

	let activeChart = $state<string>('total');
	let activeTimeRange = $state<ChartTimeRange>('ALL');

	$effect(() => {
		if (totalOnly) {
			activeChart = 'total';
			return;
		}

		if (
			singleHeaderAccount &&
			activeChart !== 'total' &&
			activeChart !== CONTRIBUTIONS_CHART_KEY
		) {
			activeChart = 'total';
			return;
		}

		if (
			activeChart !== 'total' &&
			activeChart !== CONTRIBUTIONS_CHART_KEY &&
			!accountKeys.includes(activeChart)
		) {
			activeChart = accountKeys[0] ?? 'total';
		}
	});

	const totalBalance = $derived(detail.accounts.reduce((sum, account) => sum + account.balance, 0));

	const bankChartColor = $derived.by(() => {
		const firstKey = accountKeys[0];
		if (!firstKey) return TOTAL_BALANCE_CHART_COLOR;

		return detail.chartConfig[firstKey]?.color ?? TOTAL_BALANCE_CHART_COLOR;
	});

	const chartConfig = $derived({
		...detail.chartConfig,
		total: {
			label: 'Total',
			color: totalOnly ? TOTAL_BALANCE_CHART_COLOR : bankChartColor
		}
	} satisfies ChartConfig);

	const investmentAccountIds = $derived(
		headerAccounts.length > 0
			? headerAccounts.map((account) => account.id)
			: detail.accounts.map((account) => account.id)
	);

	const rangeFilteredChartData = $derived(
		filterChartDataByRange(detail.chartData, activeTimeRange)
	);

	const firstRealPlaidDay = $derived(firstRealPlaidSortDate(detail.chartData));

	const filteredChartData = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		if (!timeline) {
			return rangeFilteredChartData;
		}

		return padInvestmentChartDataForRange(
			rangeFilteredChartData,
			detail.chartData,
			activeTimeRange,
			timeline,
			investmentAccountIds
		);
	});

	const snapshotTotalByDay = $derived(
		new Map(filteredChartData.map((point) => [point.sortDate, chartPointTotal(point)]))
	);

	const totalChartData = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		const todayKey = currentChartDayKey();

		return filteredChartData.map((point) => {
			const snapshotTotal = chartPointTotal(point);
			const total =
				timeline != null
					? investmentDisplayBalanceForDay(
							point.sortDate,
							snapshotTotal,
							timeline,
							snapshotTotalByDay,
							totalBalance,
							todayKey
						)
					: snapshotTotal;

			return { ...point, total };
		});
	});

	const contributionsChartData = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		if (!timeline) return [];

		return filteredChartData.map((point) => ({
			date: point.date,
			sortDate: point.sortDate,
			contributions: contributionsAsOf(point.sortDate, timeline)
		}));
	});

	const chartDataForDisplay = $derived.by(() => {
		if (activeChart === CONTRIBUTIONS_CHART_KEY) {
			return contributionsChartData;
		}

		return activeChart === 'total' ? totalChartData : filteredChartData;
	});

	const activeSeries = $derived.by(() => {
		if (activeChart === CONTRIBUTIONS_CHART_KEY) {
			return [
				{
					key: CONTRIBUTIONS_CHART_KEY,
					label: 'Contributions',
					color: chartConfig.total?.color ?? TOTAL_BALANCE_CHART_COLOR
				}
			];
		}

		if (activeChart === 'total') {
			return [
				{
					key: 'total',
					label: 'Total',
					color: chartConfig.total?.color ?? TOTAL_BALANCE_CHART_COLOR
				}
			];
		}

		const account = headerAccounts.find((entry) => accountSeriesKey(entry.id) === activeChart);
		const config = chartConfig[activeChart as keyof typeof chartConfig];

		return [
			{
				key: activeChart,
				label: config?.label ?? account?.typeLabel ?? 'Account',
				color: config?.color ?? TOTAL_BALANCE_CHART_COLOR
			}
		];
	});

	function formatHoverDate(dayKey: string): string {
		return formatChartDayLabel(dayKey, true);
	}

	const chartHeight = 240;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chartContext = $state<any>();

	const hoveredChartPoint = $derived.by(() => {
		const tooltipPoint = chartContext?.tooltip?.data as Record<string, string | number> | undefined;
		if (!tooltipPoint || typeof tooltipPoint.sortDate !== 'string') return null;

		return filteredChartData.find((point) => point.sortDate === tooltipPoint.sortDate) ?? null;
	});

	const totalBalanceChange = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		const getTotalValue = (point: (typeof totalChartData)[number]) =>
			typeof point.total === 'number' ? point.total : chartPointTotal(point);

		if (activeChart === CONTRIBUTIONS_CHART_KEY) {
			const getContributions = (point: (typeof contributionsChartData)[number]) =>
				point.contributions;

			if (hoveredChartPoint) {
				const endIndex = contributionsChartData.findIndex(
					(point) => point.sortDate === hoveredChartPoint.sortDate
				);
				if (endIndex >= 0) {
					return chartBalanceChange(contributionsChartData, getContributions, endIndex);
				}
			}

			return chartBalanceChange(contributionsChartData, getContributions);
		}

		if (timeline && activeChart === 'total') {
			if (hoveredChartPoint) {
				const endIndex = totalChartData.findIndex(
					(point) => point.sortDate === hoveredChartPoint.sortDate
				);
				if (endIndex >= 0) {
					return investmentEarningsChange(
						totalChartData,
						getTotalValue,
						timeline,
						firstRealPlaidDay,
						endIndex
					);
				}
			}

			return investmentEarningsChange(
				totalChartData,
				getTotalValue,
				timeline,
				firstRealPlaidDay
			);
		}

		const chartData = activeChart === 'total' ? totalChartData : filteredChartData;
		const getValue = (point: (typeof filteredChartData)[number]) => {
			if (activeChart === 'total') {
				return typeof point.total === 'number' ? point.total : chartPointTotal(point);
			}

			const value = point[activeChart];
			return typeof value === 'number' ? value : 0;
		};

		if (hoveredChartPoint) {
			const endIndex = chartData.findIndex((point) => point.sortDate === hoveredChartPoint.sortDate);
			if (endIndex >= 0) {
				return chartBalanceChange(chartData, getValue, endIndex);
			}
		}

		return chartBalanceChange(chartData, getValue);
	});

	const displayedTotalValue = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		const todayKey = currentChartDayKey();

		if (activeChart === CONTRIBUTIONS_CHART_KEY && timeline) {
			const sortDate = activeChartSortDate ?? todayKey;
			return contributionsAsOf(sortDate, timeline);
		}

		if (hoveredChartPoint?.sortDate && timeline && isPreSnapshotSyntheticDay(hoveredChartPoint.sortDate, firstRealPlaidDay)) {
			return preSnapshotSyntheticBalance(timeline);
		}

		if (!hoveredChartPoint || hoveredChartPoint.sortDate === todayKey) {
			if (activeChart === 'total') {
				return totalBalance;
			}

			const account = headerAccounts.find((entry) => accountSeriesKey(entry.id) === activeChart);
			return account?.balance ?? totalBalance;
		}

		const snapshotTotal =
			activeChart === 'total'
				? chartPointTotal(hoveredChartPoint)
				: (() => {
						const seriesValue = hoveredChartPoint[activeChart];
						return typeof seriesValue === 'number' ? seriesValue : totalBalance;
					})();

		if (timeline && activeChart === 'total') {
			return investmentDisplayBalanceForDay(
				hoveredChartPoint.sortDate,
				snapshotTotal,
				timeline,
				snapshotTotalByDay,
				totalBalance,
				todayKey
			);
		}

		return snapshotTotal;
	});

	const activeChartSortDate = $derived.by(() => {
		if (hoveredChartPoint?.sortDate) {
			return hoveredChartPoint.sortDate;
		}

		return filteredChartData.at(-1)?.sortDate ?? null;
	});

	const displayedContributions = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;
		const sortDate = activeChartSortDate;

		if (!timeline || !sortDate) {
			return null;
		}

		return investmentStatsFromTimeline(
			displayedTotalValue,
			sortDate,
			timeline,
			firstRealPlaidDay,
			hoveredChartPoint != null
		).contributions;
	});

	const hoverDatePosition = $derived.by(() => {
		const ctx = chartContext;
		const point = hoveredChartPoint;
		if (!point || typeof point.sortDate !== 'string' || !ctx?.xScale || !ctx?.x) return null;

		const xValue = ctx.x(point);
		let xCoord = ctx.xScale(xValue);
		if (xCoord == null) return null;

		if (typeof ctx.xScale.bandwidth === 'function') {
			xCoord += ctx.xScale.bandwidth() / 2;
		}

		return {
			x: xCoord + (ctx.padding?.left ?? 0),
			top: Math.max((ctx.padding?.top ?? 12) - 2, 0),
			dateLabel: formatHoverDate(point.sortDate)
		};
	});

	const selectorItems = $derived(
		headerAccounts.map((account) => {
			const key = accountSeriesKey(account.id);
			const hoveredValue = hoveredChartPoint?.[key];

			return {
				key,
				label: account.typeLabel,
				value: typeof hoveredValue === 'number' ? hoveredValue : account.balance
			};
		})
	);

	const showAccountSelectors = $derived(!totalOnly && selectorItems.length > 1);

	const activeSummaryLabel = $derived.by(() => {
		if (activeChart === CONTRIBUTIONS_CHART_KEY) {
			return 'Contributions';
		}

		if (activeChart === 'total') {
			return summaryLabel;
		}

		const account = headerAccounts.find((entry) => accountSeriesKey(entry.id) === activeChart);
		return account?.typeLabel ?? summaryLabel;
	});

	function selectChart(key: string) {
		activeChart = activeChart === key ? 'total' : key;
	}

	const chartLineMotion = $derived(
		prefersReducedMotion.current ? ({ type: 'none' } as const) : CHART_LINE_MOTION_ENABLED
	);

	const chartContainerClass =
		'h-[240px] w-full [&_.lc-root-container]:h-full ' +
		'[&_.lc-highlight-line]:!stroke-[var(--highlight-color)] [&_.lc-highlight-line]:!stroke-1 ' +
		'[&_.lc-highlight-line]:![stroke-dasharray:none] [&_.lc-highlight-point]:!stroke-background ' +
		'[&_.lc-highlight-point]:![stroke-width:3px] [&_.lc-rule-x-line:not(.lc-grid-x-rule)]:!stroke-border/40 ' +
		'[&_.lc-rule-y-line:not(.lc-grid-y-rule)]:!stroke-border/40 [&_.lc-axis-tick]:!stroke-border/40 ' +
		'[&_.lc-axis-tick-label]:!hidden ' +
		'[&_.lc-path]:!stroke-[var(--highlight-color)] [&_.lc-path]:!stroke-[2.5px]';
</script>

{#snippet suppressTooltip()}{/snippet}

<div class={className}>
	{#if detail.chartData.length === 0}
		<p class="text-muted-foreground px-5 py-6 text-sm" role="status">
			No balance history to show yet.
		</p>
	{:else}
		<div class="chart-summary">
			<div class="chart-summary__main">
				<p class="chart-summary__label">{activeSummaryLabel}</p>

				<p class="chart-summary__value" role="status" aria-live="polite">
					<AnimatedBalanceCounter
						value={displayedTotalValue}
						format={(amount) => balanceMoney.format(amount)}
					/>
				</p>

				{#if totalBalanceChange}
					{@const change = totalBalanceChange}
					{@const isPositive = change.amount > 0}
					{@const isNegative = change.amount < 0}
					<p
						class="chart-summary__change {isPositive
							? 'chart-summary__change--positive'
							: isNegative
								? 'chart-summary__change--negative'
								: 'chart-summary__change--neutral'}"
						role="status"
						aria-live="polite"
					>
						{balanceMoney.format(Math.abs(change.amount))}
						{#if change.percent != null}
							<span>({isNegative ? '-' : isPositive ? '+' : ''}{percentFormat.format(Math.abs(change.percent))}%)</span>
						{/if}
					</p>
				{/if}
			</div>

			{#if showAccountSelectors || displayedContributions != null}
				<div class="chart-summary__stats">
					{#if showAccountSelectors}
						<div class="chart-summary__stats-group" role="group" aria-label="Account breakdown">
							{#each selectorItems as item (item.key)}
								<button
									type="button"
									class="chart-summary__stat"
									data-active={activeChart === item.key}
									aria-pressed={activeChart === item.key}
									onclick={() => selectChart(item.key)}
								>
									<p class="chart-summary__label">{item.label}</p>
									<p class="chart-summary__stat-value" aria-live="polite">
										<AnimatedBalanceCounter
											value={item.value}
											format={(amount) => balanceMoney.format(amount)}
										/>
									</p>
								</button>
							{/each}
						</div>
					{/if}

					{#if displayedContributions != null}
						<button
							type="button"
							class="chart-summary__stat"
							data-active={activeChart === CONTRIBUTIONS_CHART_KEY}
							aria-pressed={activeChart === CONTRIBUTIONS_CHART_KEY}
							aria-label="Contributions"
							onclick={() => selectChart(CONTRIBUTIONS_CHART_KEY)}
						>
							<p class="chart-summary__label">Contributions</p>
							<p class="chart-summary__stat-value" aria-live="polite">
								<AnimatedBalanceCounter
									value={displayedContributions}
									format={(amount) => balanceMoney.format(amount)}
								/>
							</p>
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<div
			class="chart-body"
			style="--finance-chart-transition-duration: {CHART_LINE_TRANSITION_MS}ms"
		>
			<div class="relative h-[240px] w-full">
				<Chart.Container
					config={chartConfig}
					class="{chartContainerClass} absolute inset-0"
					style={`--highlight-color: ${activeSeries[0]?.color ?? TOTAL_BALANCE_CHART_COLOR}`}
				>
					<LineChart
						bind:context={chartContext}
						data={chartDataForDisplay}
						x="sortDate"
						axis="y"
						grid={false}
						height={chartHeight}
						padding={{ top: 20, right: 12, bottom: 12, left: 12 }}
						series={activeSeries}
						tooltip={suppressTooltip}
						highlight={{
							axis: 'x',
							lines: true,
							points: true
						}}
						props={{
							highlight: {
								axis: 'x',
								lines: { dashArray: undefined },
								points: { r: 5, strokeWidth: 3 }
							},
							yAxis: {
								ticks: 4,
								rule: true,
								tickMarks: false
							},
							spline: {
								strokeWidth: 2.5,
								motion: chartLineMotion
							}
						}}
					/>
				</Chart.Container>

				{#if hoverDatePosition}
					<div
						class="text-muted-foreground pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full text-[11px] font-medium whitespace-nowrap"
						style:left="{hoverDatePosition.x}px"
						style:top="{hoverDatePosition.top}px"
						role="status"
					>
						{hoverDatePosition.dateLabel}
					</div>
				{/if}
			</div>

			<div class="chart-range" role="group" aria-label="Chart time range">
				{#each CHART_TIME_RANGE_OPTIONS as option (option.key)}
					<button
						type="button"
						data-active={activeTimeRange === option.key}
						class="chart-range__button"
						aria-pressed={activeTimeRange === option.key}
						onclick={() => (activeTimeRange = option.key)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.chart-summary {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.chart-summary__main {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 0.375rem;
	}

	.chart-summary__stats {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: flex-end;
		gap: 1.25rem 1.5rem;
	}

	.chart-summary__stats-group {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 1.25rem 1.5rem;
	}

	.chart-summary__stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		border: 0;
		background: transparent;
		padding: 0;
		text-align: end;
		cursor: default;
	}

	button.chart-summary__stat {
		cursor: pointer;
	}

	.chart-summary__stat-value {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
		transition: color 0.15s ease;
	}

	button.chart-summary__stat:hover .chart-summary__label,
	button.chart-summary__stat:focus-visible .chart-summary__label,
	button.chart-summary__stat[data-active='true'] .chart-summary__label {
		color: var(--color-secondary);
	}

	button.chart-summary__stat:hover .chart-summary__stat-value,
	button.chart-summary__stat:focus-visible .chart-summary__stat-value,
	button.chart-summary__stat[data-active='true'] .chart-summary__stat-value {
		color: var(--color-secondary);
	}

	button.chart-summary__stat:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.chart-summary__label {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}

	.chart-summary__value {
		margin: 0;
		font-size: clamp(1.75rem, 1.25rem + 1.5vw, 2.25rem);
		font-weight: 500;
		line-height: 1.1;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}

	.chart-summary__change {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.chart-summary__change--positive {
		color: var(--color-income);
	}

	.chart-summary__change--negative {
		color: var(--color-debt);
	}

	.chart-summary__change--neutral {
		color: var(--color-muted-foreground);
	}

	.chart-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 1.25rem;
	}

	.chart-body :global(.lc-path) {
		transition: stroke var(--finance-chart-transition-duration, 520ms)
			var(--finance-chart-transition-ease, cubic-bezier(0.22, 1, 0.36, 1));
	}

	@media (prefers-reduced-motion: reduce) {
		.chart-body :global(.lc-path) {
			transition: none;
		}
	}

	.chart-range {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.25rem 0.5rem;
	}

	.chart-range__button {
		border: 0;
		background: transparent;
		padding: 0.25rem 0.375rem;
		color: var(--color-muted-foreground);
		font: inherit;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.chart-range__button:hover,
	.chart-range__button:focus-visible {
		color: var(--color-primary);
	}

	.chart-range__button[data-active='true'] {
		color: var(--color-secondary);
	}

	.chart-range__button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
</style>
