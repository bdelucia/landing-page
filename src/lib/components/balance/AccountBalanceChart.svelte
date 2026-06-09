<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import {
		TOTAL_BALANCE_CHART_COLOR,
		type ChartConfig
	} from '$lib/components/ui/chart/chart-utils';
	import type { CategoryBalanceSummary } from '$lib/hooks/finances/account-balances';
	import {
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
		categoryTotalsFromChartPoint,
		chartPointTotal,
		type BankAccountDetail
	} from '$lib/hooks/finances/bank-accounts';
	import {
		CHART_TIME_RANGE_OPTIONS,
		chartBalanceChange,
		filterChartDataByRange,
		type ChartTimeRange
	} from '$lib/hooks/chart/chart-time-range';
	import { formatChartDayLabel } from '$lib/hooks/chart/chart-date';
	import AnimatedBalanceCounter from '$lib/components/balance/AnimatedBalanceCounter.svelte';
	import { LineChart } from 'layerchart';

	let {
		detail,
		totalOnly = false,
		categorySummaries = [],
		itemLabelsByItemId = {},
		class: className = ''
	}: {
		detail: BankAccountDetail;
		/** When true, only the combined total line is shown (no per-account toggles). */
		totalOnly?: boolean;
		/** Per-category labels and today's totals for the all-banks header row. */
		categorySummaries?: CategoryBalanceSummary[];
		/** Maps Plaid item ids to bank labels for category hover totals. */
		itemLabelsByItemId?: Record<string, string>;
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
		if (totalOnly || singleHeaderAccount) {
			activeChart = 'total';
			return;
		}

		if (activeChart !== 'total' && !accountKeys.includes(activeChart)) {
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

	const totalChartData = $derived(
		filteredChartData.map((point) => ({
			...point,
			total: chartPointTotal(point)
		}))
	);

	const chartDataForDisplay = $derived(
		activeChart === 'total' ? totalChartData : filteredChartData
	);

	const activeSeries = $derived.by(() => {
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

	const hoveredCategoryTotals = $derived.by(() => {
		if (!hoveredChartPoint) return null;
		return categoryTotalsFromChartPoint(detail.accounts, itemLabelsByItemId, hoveredChartPoint);
	});

	const totalBalanceChange = $derived.by(() => {
		const getValue = (point: (typeof totalChartData)[number]) =>
			typeof point.total === 'number' ? point.total : chartPointTotal(point);

		if (hoveredChartPoint) {
			const endIndex = totalChartData.findIndex(
				(point) => point.sortDate === hoveredChartPoint.sortDate
			);
			if (endIndex >= 0) {
				return chartBalanceChange(totalChartData, getValue, endIndex);
			}
		}

		return chartBalanceChange(totalChartData, getValue);
	});

	const displayedTotalValue = $derived.by(() => {
		const timeline = detail.investmentContributionTimeline;

		if (hoveredChartPoint?.sortDate && timeline && isPreSnapshotSyntheticDay(hoveredChartPoint.sortDate, firstRealPlaidDay)) {
			return preSnapshotSyntheticBalance(timeline);
		}

		if (hoveredChartPoint) {
			if (activeChart === 'total') {
				return chartPointTotal(hoveredChartPoint);
			}

			const key = activeChart;
			const value = hoveredChartPoint[key];
			return typeof value === 'number' ? value : totalBalance;
		}

		return totalBalance;
	});

	const activeChartSortDate = $derived.by(() => {
		if (hoveredChartPoint?.sortDate) {
			return hoveredChartPoint.sortDate;
		}

		return filteredChartData.at(-1)?.sortDate ?? null;
	});

	const displayedInvestmentStats = $derived.by(() => {
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
			detail.balanceSnapshotSortDates ?? []
		);
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

	const chartContainerClass =
		'h-[240px] w-full [&_.lc-root-container]:h-full ' +
		'[&_.lc-highlight-line]:!stroke-[var(--highlight-color)] [&_.lc-highlight-line]:!stroke-1 ' +
		'[&_.lc-highlight-line]:![stroke-dasharray:none] [&_.lc-highlight-point]:!stroke-background ' +
		'[&_.lc-highlight-point]:![stroke-width:3px] [&_.lc-rule-x-line:not(.lc-grid-x-rule)]:!stroke-border/40 ' +
		'[&_.lc-rule-y-line:not(.lc-grid-y-rule)]:!stroke-border/40 [&_.lc-axis-tick]:!stroke-border/40 ' +
		'[&_.lc-axis-tick-label]:!hidden ' +
		'[&_.lc-spline-path]:!stroke-[var(--highlight-color)] [&_.lc-spline-path]:!stroke-[2.5px]';

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

	const categoryHeaderItems = $derived(
		categorySummaries.map((category) => {
			const hoveredTotal = hoveredCategoryTotals?.[category.key];

			return {
				key: category.key,
				label: category.label,
				value: hoveredTotal ?? category.balance
			};
		})
	);

	const summaryColumnClass =
		'relative flex min-w-[8rem] flex-1 flex-col items-center justify-center gap-1 border-t border-border px-6 py-3 text-center even:border-l sm:min-w-[9rem] sm:border-t-0 sm:border-l sm:px-8 sm:py-4';

	function selectChart(key: string) {
		activeChart = activeChart === key ? 'total' : key;
	}
</script>

{#snippet suppressTooltip()}{/snippet}

<div class={className}>
	{#if detail.chartData.length === 0}
		<p class="text-muted-foreground px-5 py-6 text-sm" role="status">
			No balance history to show yet.
		</p>
	{:else}
		<div class="border-border flex flex-col items-stretch border-b sm:flex-row">
			<div
				class="flex flex-1 items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 {displayedInvestmentStats
					? 'border-border border-b sm:border-r sm:border-b-0'
					: ''}"
			>
				<div class="flex min-w-0 items-center gap-3">
					<span class="text-muted-foreground shrink-0 text-sm font-medium">Total</span>
					<div class="flex min-w-0 flex-col gap-0.5">
						<span
							class="text-primary text-2xl font-semibold sm:text-3xl"
							role="status"
							aria-live="polite"
						>
							<AnimatedBalanceCounter
								value={displayedTotalValue}
								format={(amount) => balanceMoney.format(amount)}
								class="font-semibold"
							/>
						</span>

						{#if totalBalanceChange}
							{@const change = totalBalanceChange}
							{@const isPositive = change.amount > 0}
							{@const isNegative = change.amount < 0}
							<span
								class="flex items-center gap-1 text-sm font-semibold {isPositive
									? 'text-income'
									: isNegative
										? 'text-debt'
										: 'text-muted-foreground'}"
								role="status"
								aria-live="polite"
							>
								<svg
									class="size-3 shrink-0"
									viewBox="0 0 12 12"
									aria-hidden="true"
									fill="currentColor"
								>
									{#if isNegative}
										<polygon points="6,8 1,3 11,3" />
									{:else}
										<polygon points="6,4 1,9 11,9" />
									{/if}
								</svg>
								<span>
									{balanceMoney.format(Math.abs(change.amount))}
									{#if change.percent != null}
										<span class="font-medium">
											({isNegative ? '-' : ''}{percentFormat.format(Math.abs(change.percent))}%)
										</span>
									{/if}
								</span>
							</span>
						{/if}
					</div>
				</div>

				{#if displayedInvestmentStats}
					<div
						class="flex shrink-0 flex-col items-end gap-2 text-end"
						role="group"
						aria-label="Contributions and earnings"
					>
						<div class="flex flex-col gap-0.5">
							<span class="text-muted-foreground text-xs">Contributions</span>
							<span class="text-primary text-base font-semibold sm:text-lg" aria-live="polite">
								<AnimatedBalanceCounter
									value={displayedInvestmentStats.contributions}
									format={(amount) => balanceMoney.format(amount)}
									class="font-semibold"
								/>
							</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-muted-foreground text-xs">Earnings</span>
							<span class="text-primary text-base font-semibold sm:text-lg" aria-live="polite">
								<AnimatedBalanceCounter
									value={displayedInvestmentStats.earnings}
									format={(amount) => balanceMoney.format(amount)}
									class="font-semibold"
								/>
							</span>
						</div>
					</div>
				{/if}
			</div>

			{#if totalOnly && categoryHeaderItems.length > 0}
				<div class="flex flex-wrap sm:flex-nowrap">
					{#each categoryHeaderItems as item (item.key)}
						<div class={summaryColumnClass}>
							<span class="text-muted-foreground text-xs">{item.label}</span>
							<span class="text-primary text-base font-semibold sm:text-lg" aria-live="polite">
								<AnimatedBalanceCounter
									value={item.value}
									format={(amount) => balanceMoney.format(amount)}
									class="font-semibold"
								/>
							</span>
						</div>
					{/each}
				</div>
			{:else if !totalOnly}
				<div class="flex flex-wrap sm:flex-nowrap">
					{#each selectorItems as item (item.key)}
						{#if singleHeaderAccount}
							<div class={summaryColumnClass}>
								<span class="text-muted-foreground text-xs">{item.label}</span>
								<span class="text-primary text-base font-semibold sm:text-lg" aria-live="polite">
									<AnimatedBalanceCounter
										value={item.value}
										format={(amount) => balanceMoney.format(amount)}
										class="font-semibold"
									/>
								</span>
							</div>
						{:else}
							<button
								type="button"
								data-active={activeChart === item.key}
								class="{summaryColumnClass} group hover:bg-surface data-[active=true]:bg-surface cursor-pointer transition-colors"
								aria-pressed={activeChart === item.key}
								onclick={() => selectChart(item.key)}
							>
								<span
									class="text-xs transition-colors {activeChart === item.key
										? 'text-primary font-medium'
										: 'text-muted-foreground group-hover:text-primary'}"
								>
									{item.label}
								</span>
								<span class="text-primary text-base font-semibold sm:text-lg" aria-live="polite">
									<AnimatedBalanceCounter
										value={item.value}
										format={(amount) => balanceMoney.format(amount)}
										class="font-semibold"
									/>
								</span>
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<div class="px-2 py-4 sm:px-5 sm:py-5">
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
								strokeWidth: 2.5
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

			<div
				class="mt-3 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5"
				role="group"
				aria-label="Chart time range"
			>
				{#each CHART_TIME_RANGE_OPTIONS as option (option.key)}
					<button
						type="button"
						data-active={activeTimeRange === option.key}
						class="data-[active=true]:bg-surface data-[active=true]:text-primary rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs {activeTimeRange ===
						option.key
							? 'text-primary'
							: 'text-muted-foreground hover:text-primary'}"
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
