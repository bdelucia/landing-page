<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import type { ChartConfig } from '$lib/components/ui/chart/chart-utils';
	import {
		buildCategorySpending,
		formatSpendingAmount,
		totalCategorySpending,
		type CategorySpendingSlice
	} from '$lib/hooks/finances/category-spending';
	import {
		SPENDING_TIME_RANGE_OPTIONS,
		filterTransactionsBySpendingRange,
		spendingTimeRangePeriodLabel,
		type SpendingTimeRange
	} from '$lib/hooks/finances/spending-time-range';
	import type { TransactionItem } from '$lib/hooks/finances/transactions';
	import AnimatedBalanceCounter from '$lib/components/balance/AnimatedBalanceCounter.svelte';
	import SpendingPieArc from '$lib/components/spending/SpendingPieArc.svelte';
	import { PieChart } from 'layerchart';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	const SLICE_MOTION_MS = 480;

	let {
		transactions,
		selectedAccountId = null,
		selectedCategory = $bindable<string | null>(null),
		timeRange = $bindable<SpendingTimeRange>('1M'),
		class: className = ''
	}: {
		transactions: TransactionItem[];
		selectedAccountId?: string | null;
		selectedCategory?: string | null;
		timeRange?: SpendingTimeRange;
		class?: string;
	} = $props();

	const CHART_HEIGHT = 240;
	const INNER_RADIUS = 88;
	const OUTER_RADIUS = 110;

	let chartContext = $state<any>();

	const rangedTransactions = $derived(filterTransactionsBySpendingRange(transactions, timeRange));
	const chartData = $derived(buildCategorySpending(rangedTransactions, selectedAccountId));
	const totalSpend = $derived(totalCategorySpending(chartData));
	const periodLabel = $derived(spendingTimeRangePeriodLabel(timeRange));

	const chartConfig = $derived.by(() => {
		const config: ChartConfig = {
			amount: { label: 'Amount' }
		};

		for (const slice of chartData) {
			config[slice.categoryKey] = {
				label: slice.category,
				color: slice.color
			};
		}

		return config;
	});

	const hoveredSlice = $derived.by(() => {
		const data = chartContext?.tooltip?.data;
		if (!data) return null;

		return chartData.find((slice) => slice.categoryKey === data.categoryKey) ?? null;
	});

	const hoveredIndex = $derived.by(() => {
		if (!hoveredSlice) return -1;
		return chartData.findIndex((slice) => slice.categoryKey === hoveredSlice.categoryKey);
	});

	const selectedSlice = $derived(
		selectedCategory
			? (chartData.find((slice) => slice.category === selectedCategory) ?? null)
			: null
	);

	const selectedIndex = $derived.by(() => {
		if (!selectedSlice) return -1;
		return chartData.findIndex((slice) => slice.categoryKey === selectedSlice.categoryKey);
	});

	const centerLabel = $derived(
		hoveredSlice?.category ?? selectedSlice?.category ?? 'Total spend'
	);
	const centerAmount = $derived(hoveredSlice?.amount ?? selectedSlice?.amount ?? totalSpend);
	const hasArcFocus = $derived(hoveredIndex >= 0 || selectedIndex >= 0);

	function handleArcClick(_event: MouseEvent, detail: { data: CategorySpendingSlice }) {
		const category = detail.data.category;
		selectedCategory = selectedCategory === category ? null : category;
	}

	const pieMotion = $derived(
		prefersReducedMotion.current
			? ({ type: 'none' } as const)
			: ({ type: 'tween', duration: SLICE_MOTION_MS, easing: cubicOut } as const)
	);
</script>

<div class="spending-chart {className}">
	{#if chartData.length === 0}
		<p class="spending-chart__message" role="status">No spending to show.</p>
	{:else}
		<div class="spending-chart__viz">
			<Chart.Container
				config={chartConfig}
				class="spending-chart__container mx-auto aspect-square w-full max-w-[280px] [&_.lc-arc-line]:cursor-pointer"
				style="height: {CHART_HEIGHT}px"
			>
				<PieChart
					bind:context={chartContext}
					data={chartData}
					key="categoryKey"
					label="category"
					value="amount"
					c="color"
					innerRadius={INNER_RADIUS}
					outerRadius={OUTER_RADIUS}
					padding={8}
					onArcClick={handleArcClick}
					props={{
						pie: { motion: pieMotion },
						arc: { strokeWidth: 0, motion: pieMotion }
					}}
				>
					{#snippet arc({ props, index })}
						{@const isActive = index === selectedIndex || index === hoveredIndex}
						{@const isDimmed = hasArcFocus && !isActive}
						<SpendingPieArc
							{...props}
							{isActive}
							{isDimmed}
							strokeWidth={0}
						/>
					{/snippet}

					{#snippet tooltip()}{/snippet}
				</PieChart>
			</Chart.Container>

			<div class="spending-chart__center">
				<p class="spending-chart__center-amount">
					<AnimatedBalanceCounter value={centerAmount} format={formatSpendingAmount} />
				</p>
				{#key centerLabel}
					<p class="spending-chart__center-label spending-chart__center-copy--enter">
						{centerLabel}
					</p>
				{/key}
			</div>
		</div>

		<p class="sr-only" role="status" aria-live="polite">
			{#if selectedCategory}
				Showing {selectedCategory} transactions. {centerLabel}: {formatSpendingAmount(centerAmount)}
			{:else}
				{centerLabel}: {formatSpendingAmount(centerAmount)}
			{/if}
		</p>
	{/if}

	<div class="spending-range-footer">
		<div class="spending-range" role="group" aria-label="Spending time range">
			{#each SPENDING_TIME_RANGE_OPTIONS as option (option.key)}
				<button
					type="button"
					class="spending-range__button"
					data-active={timeRange === option.key}
					aria-pressed={timeRange === option.key}
					onclick={() => (timeRange = option.key)}
				>
					{option.label}
				</button>
			{/each}
		</div>
		{#key periodLabel}
			<p class="spending-range__period spending-range__period--enter" aria-live="polite">
				{periodLabel}
			</p>
		{/key}
	</div>
</div>

<style>
	.spending-chart {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 240px;
	}

	.spending-chart__message {
		margin: 0;
		padding: 2rem 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
		text-align: center;
	}

	.spending-chart__viz {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.spending-chart__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.125rem;
		max-width: min(220px, 72vw);
		margin-inline: auto;
		padding-inline: 0.5rem;
		pointer-events: none;
		text-align: center;
	}
	.spending-chart :global(.spending-chart__container) {
		--spending-arc-transition-duration: 220ms;
		--spending-arc-transition-ease: cubic-bezier(0.22, 1, 0.36, 1);
		--vis-text-color: var(--color-primary);
	}

	.spending-chart :global(.spending-chart__arc-wrap) {
		transform-box: fill-box;
		transform-origin: center;
		transition:
			transform var(--spending-arc-transition-duration) var(--spending-arc-transition-ease),
			opacity var(--spending-arc-transition-duration) var(--spending-arc-transition-ease);
	}

	.spending-chart :global(.spending-chart__arc-wrap--active) {
		transform: scale(1.055);
	}

	.spending-chart :global(.spending-chart__arc-wrap--dimmed) {
		opacity: 0.42;
	}

	@keyframes spending-center-copy-enter {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	.spending-chart__center-copy--enter {
		animation: spending-center-copy-enter var(--spending-arc-transition-duration)
			var(--spending-arc-transition-ease) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.spending-chart :global(.spending-chart__arc-wrap) {
			transition: none;
		}

		.spending-chart__center-copy--enter {
			animation: none;
		}
	}

	.spending-chart__center-amount {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 500;
		line-height: 1.1;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}

	.spending-chart__center-label {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}

	@media (min-width: 640px) {
		.spending-chart__center-amount {
			font-size: 1.5rem;
		}
	}

	.spending-range-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
	}

	.spending-range {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.25rem 0.5rem;
		width: 100%;
	}

	.spending-range__period {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		color: var(--color-muted-foreground);
		text-align: center;
	}

	@keyframes spending-range-period-enter {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	.spending-range__period--enter {
		animation: spending-range-period-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.spending-range__period--enter {
			animation: none;
		}
	}

	.spending-range__button {
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

	.spending-range__button:hover,
	.spending-range__button:focus-visible {
		color: var(--color-primary);
	}

	.spending-range__button[data-active='true'] {
		color: var(--color-secondary);
	}

	.spending-range__button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
</style>
