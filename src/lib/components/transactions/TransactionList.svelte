<script lang="ts">
	import { bankBrandColor } from '$lib/hooks/finances/account-balances';
	import { buildAggregatedBankAccountDetail } from '$lib/hooks/finances/bank-accounts';
	import type { DashboardFinances } from '$lib/hooks/dashboard/dashboard-data';
	import type { TransactionItem } from '$lib/hooks/finances/transactions';
	import {
		filterTransactionsBySpendingRange,
		type SpendingTimeRange
	} from '$lib/hooks/finances/spending-time-range';
	import {
		matchesTransactionSearch,
		SPENDING_TRANSACTION_SORT_OPTIONS,
		sortTransactions,
		type SpendingTransactionSort
	} from '$lib/hooks/finances/transaction-list-filters';
	import AccountBalanceChart from '$lib/components/balance/AccountBalanceChart.svelte';
	import FinanceChartSkeleton from '$lib/components/finance/FinanceChartSkeleton.svelte';
	import SpendingCategoryChart from '$lib/components/spending/SpendingCategoryChart.svelte';
	import SpendingChartSkeleton from '$lib/components/spending/SpendingChartSkeleton.svelte';
	import TransactionRowsSkeleton from '$lib/components/transactions/TransactionRowsSkeleton.svelte';
	import { Input, InputIcon } from '$lib/components/input/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SearchIcon from '@lucide/svelte/icons/search';

	export type FinancePanel = 'overview' | 'spending';
	export type SpendingView = 'chart' | 'all';

	let {
		finances,
		selectedAccountId = $bindable(null),
		spendingView = $bindable<SpendingView>('chart'),
		panel = 'overview',
		onViewSpending,
		class: className = ''
	}: {
		finances: Promise<DashboardFinances>;
		selectedAccountId?: string | null;
		spendingView?: SpendingView;
		panel?: FinancePanel;
		onViewSpending?: () => void;
		class?: string;
	} = $props();

	const DEFAULT_SKELETON_ROWS = 3;
	const MAX_RECENT_TRANSACTIONS = 10;
	const TRANSACTIONS_PAGE_SIZE = 10;

	let selectedCategory = $state<string | null>(null);
	let spendingTimeRange = $state<SpendingTimeRange>('1M');
	let spendingSearchQuery = $state('');
	let spendingSort = $state<SpendingTransactionSort>('date-desc');
	let spendingTransactionsPage = $state(1);

	const spendingSortFieldId = 'spending-transaction-sort';

	$effect(() => {
		if (panel !== 'spending') {
			selectedCategory = null;
			spendingSearchQuery = '';
			spendingSort = 'date-desc';
			spendingView = 'chart';
		}
	});

	$effect(() => {
		if (panel === 'spending' && spendingView !== 'all') {
			spendingSearchQuery = '';
			spendingSort = 'date-desc';
			spendingTransactionsPage = 1;
		}
	});

	$effect(() => {
		const accountId = selectedAccountId;
		const range = spendingTimeRange;
		const search = spendingSearchQuery;
		const sort = spendingSort;
		void accountId;
		void range;
		void search;
		void sort;
		selectedCategory = null;
		spendingTransactionsPage = 1;
	});

	$effect(() => {
		if (spendingView === 'all') {
			spendingTransactionsPage = 1;
		}
	});

	function filterTransactions(
		transactions: TransactionItem[],
		accountId: string | null,
		category: string | null,
		spendingOnly = false,
		spendingRange: SpendingTimeRange | null = null,
		searchQuery = '',
		sort: SpendingTransactionSort = 'date-desc'
	): TransactionItem[] {
		let pool = accountId
			? transactions.filter((transaction) => transaction.sourceId === accountId)
			: transactions;

		if (spendingOnly) {
			pool = pool.filter((transaction) => !transaction.isIncome);
		}

		if (spendingOnly && spendingRange) {
			pool = filterTransactionsBySpendingRange(pool, spendingRange);
		}

		if (category) {
			pool = pool.filter((transaction) => transaction.category === category);
		}

		if (spendingOnly && searchQuery.trim()) {
			pool = pool.filter((transaction) => matchesTransactionSearch(transaction, searchQuery));
		}

		return spendingOnly
			? sortTransactions(pool, sort)
			: [...pool].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
	}

	function paginateTransactions(
		transactions: TransactionItem[],
		page: number,
		pageSize: number
	): { rows: TransactionItem[]; totalPages: number; currentPage: number } {
		const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
		const currentPage = Math.min(Math.max(1, page), totalPages);

		return {
			rows: transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize),
			totalPages,
			currentPage
		};
	}

	function emptyTransactionsMessage(
		panel: FinancePanel,
		spendingViewMode: SpendingView,
		category: string | null,
		searchQuery: string,
		transactionsError: string | null
	): string {
		if (transactionsError) return transactionsError;
		if (searchQuery.trim()) return 'No transactions match your search.';
		if (category) return `No ${category.toLowerCase()} transactions.`;
		if (panel === 'spending' && spendingViewMode === 'all') return 'No transactions to show.';
		if (panel === 'spending') return 'No spending transactions to show.';
		return 'No transactions to show.';
	}

	function transactionsHeading(
		panel: FinancePanel,
		spendingViewMode: SpendingView,
		category: string | null
	): string {
		if (panel === 'spending' && spendingViewMode === 'all') return 'Transactions';
		return category ? `${category} transactions` : 'Recent transactions';
	}

	function showSpendingChart(panelValue: FinancePanel, spendingViewMode: SpendingView): boolean {
		return panelValue === 'spending' && spendingViewMode === 'chart';
	}

	function showSpendingAll(panelValue: FinancePanel, spendingViewMode: SpendingView): boolean {
		return panelValue === 'spending' && spendingViewMode === 'all';
	}

	function chartSummaryLabel(
		dashboardFinances: DashboardFinances,
		accountId: string | null
	): string {
		if (!accountId) return 'Net worth';

		return (
			dashboardFinances.accounts.find((account) => account.id === accountId)?.label ?? 'Total'
		);
	}
</script>

{#await finances}
	<section class="finance-panel {className}" aria-busy="true">
		<div class="finance-panel__chart">
			{#if panel === 'spending'}
				<SpendingChartSkeleton />
			{:else}
				<FinanceChartSkeleton />
			{/if}
			<p class="sr-only" role="status">Loading finances</p>
		</div>

		<div class="finance-panel__transactions" aria-labelledby="recent-transactions-heading">
			<div class="finance-panel__transactions-header">
				<h2 id="recent-transactions-heading" class="finance-panel__transactions-heading">
					Recent transactions
				</h2>
			</div>
			<div class="finance-panel__transaction-list-container">
				<TransactionRowsSkeleton rowCount={DEFAULT_SKELETON_ROWS} />
			</div>
		</div>
	</section>
{:then dashboardFinances}
	{@const transactions = dashboardFinances.transactions}
	{@const bankAccountDetails = dashboardFinances.bankAccountDetails}
	{@const transactionsError = dashboardFinances.transactionsError}
	{@const balancesError = dashboardFinances.accountBalancesError}
	{@const aggregatedBankDetail = buildAggregatedBankAccountDetail(bankAccountDetails)}
	{@const chartDetail = selectedAccountId
		? (bankAccountDetails[selectedAccountId] ?? null)
		: aggregatedBankDetail}
	{@const isSpendingChart = showSpendingChart(panel, spendingView)}
	{@const isSpendingAll = showSpendingAll(panel, spendingView)}
	{@const filteredRows = filterTransactions(
		transactions,
		selectedAccountId,
		selectedCategory,
		panel === 'spending',
		panel === 'spending' ? spendingTimeRange : null,
		isSpendingAll ? spendingSearchQuery : '',
		isSpendingAll ? spendingSort : 'date-desc'
	)}
	{@const pagination = isSpendingAll
		? paginateTransactions(filteredRows, spendingTransactionsPage, TRANSACTIONS_PAGE_SIZE)
		: { rows: filteredRows.slice(0, MAX_RECENT_TRANSACTIONS), totalPages: 1, currentPage: 1 }}
	{@const rows = pagination.rows}
	{@const totalPages = pagination.totalPages}
	{@const currentPage = pagination.currentPage}
	{@const transactionsHeadingLabel = transactionsHeading(panel, spendingView, selectedCategory)}
	{@const emptyMessage = emptyTransactionsMessage(
		panel,
		spendingView,
		selectedCategory,
		spendingSearchQuery,
		transactionsError
	)}

	<section
		class="finance-panel {className}"
		class:finance-panel--spending-all={isSpendingAll}
		aria-busy="false"
	>
		{#if isSpendingChart}
			{#key panel}
				<div class="finance-panel__chart finance-panel__chart--enter">
					<SpendingCategoryChart
						{transactions}
						{selectedAccountId}
						bind:selectedCategory
						bind:timeRange={spendingTimeRange}
						class="w-full"
					/>
				</div>
			{/key}
		{:else if panel === 'overview'}
			{#key panel}
				<div class="finance-panel__chart finance-panel__chart--enter">
					{#if chartDetail}
						<AccountBalanceChart
							detail={chartDetail}
							totalOnly={selectedAccountId === null}
							summaryLabel={chartSummaryLabel(dashboardFinances, selectedAccountId)}
							class="w-full"
						/>
					{/if}
				</div>
			{/key}
		{/if}

		{#if balancesError}
			<p class="finance-panel__message" role="status">{balancesError}</p>
		{/if}

		<div
			class="finance-panel__transactions"
			class:finance-panel__transactions--paginated={isSpendingAll}
			aria-labelledby="recent-transactions-heading"
		>
			<div
				class="finance-panel__transactions-header"
				class:finance-panel__transactions-header--spending={isSpendingAll}
				class:finance-panel__transactions-header--all={isSpendingAll}
			>
				<h2
					id="recent-transactions-heading"
					class="finance-panel__transactions-heading"
					class:sr-only={isSpendingAll}
				>
					{transactionsHeadingLabel}
				</h2>
				{#if isSpendingChart}
					<button
						type="button"
						class="finance-panel__view-spending"
						onclick={() => (spendingView = 'all')}
					>
						View all
						<ArrowRightIcon class="finance-panel__view-spending-icon" aria-hidden="true" />
					</button>
				{:else if isSpendingAll}
					<div class="finance-panel__transactions-toolbar">
						<div class="finance-panel__search">
							<Input
								bind:value={spendingSearchQuery}
								placeholder="Search"
								aria-label="Search transactions"
								autocomplete="off"
								spellcheck="false"
								class="finance-panel__search-input-shell max-w-none"
								inputClass="finance-panel__search-field"
							>
								{#snippet leadingIcon()}
									<InputIcon size={13} class="text-muted-foreground">
										<SearchIcon aria-hidden="true" />
									</InputIcon>
								{/snippet}
							</Input>
						</div>
						<div class="finance-panel__sort">
							<label class="finance-panel__sort-label" for={spendingSortFieldId}>Sort by</label>
							<select
								id={spendingSortFieldId}
								class="finance-panel__sort-select"
								bind:value={spendingSort}
							>
								{#each SPENDING_TRANSACTION_SORT_OPTIONS as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
				{:else if panel === 'overview'}
					<button type="button" class="finance-panel__view-spending" onclick={() => onViewSpending?.()}>
						View spending
						<ArrowRightIcon class="finance-panel__view-spending-icon" aria-hidden="true" />
					</button>
				{/if}
			</div>

			<div
				class="finance-panel__transaction-list-container"
				class:finance-panel__transaction-list-container--paginated={isSpendingAll}
			>
				{#if rows.length === 0}
					<p class="finance-panel__message" role="status">{emptyMessage}</p>
				{:else}
					{#if transactionsError}
						<p class="finance-panel__message finance-panel__message--warning" role="status">
							{transactionsError}
						</p>
					{/if}
					<ul class="finance-panel__transaction-list">
						{#each rows as transaction (transaction.id)}
							<li class="finance-panel__transaction-row">
								<div class="finance-panel__transaction-main">
									<p class="finance-panel__merchant">{transaction.merchant}</p>
									<p class="finance-panel__meta">
										<span>{transaction.category}</span>
										<span aria-hidden="true">·</span>
										<span style:color={bankBrandColor(transaction.bankLabel)}>
											{transaction.bankLabel}
										</span>
										<span aria-hidden="true">·</span>
										<span>{transaction.accountLabel}</span>
									</p>
								</div>

								<div class="finance-panel__transaction-side">
									<span class="finance-panel__date">{transaction.dateLabel}</span>
									<span
										class="finance-panel__amount {transaction.isIncome
											? 'finance-panel__amount--income'
											: ''}"
									>
										{transaction.amountLabel}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if isSpendingAll && filteredRows.length > 0}
				<nav class="finance-panel__pagination" aria-label="Transaction pages">
					<button
						type="button"
						class="finance-panel__pagination-button"
						disabled={currentPage <= 1}
						aria-label="Previous page"
						onclick={() => (spendingTransactionsPage = currentPage - 1)}
					>
						<ArrowLeftIcon class="finance-panel__pagination-icon" aria-hidden="true" />
					</button>
					<span class="finance-panel__pagination-page" aria-current="page">
						{currentPage}
					</span>
					<button
						type="button"
						class="finance-panel__pagination-button"
						disabled={currentPage >= totalPages}
						aria-label="Next page"
						onclick={() => (spendingTransactionsPage = currentPage + 1)}
					>
						<ArrowRightIcon class="finance-panel__pagination-icon" aria-hidden="true" />
					</button>
				</nav>
			{/if}
		</div>
	</section>
{:catch loadError}
	<section class="finance-panel {className}" aria-busy="false">
		<p class="finance-panel__message" role="status">
			{loadError instanceof Error ? loadError.message : 'Failed to load finances'}
		</p>
	</section>
{/await}

<style>
	.finance-panel {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.finance-panel--spending-all {
		gap: 0;
	}

	.finance-panel__chart {
		flex-shrink: 0;
	}

	.finance-panel__chart--enter {
		animation: finance-panel-chart-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes finance-panel-chart-enter {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.finance-panel__chart--enter {
			animation: none;
		}
	}

	.finance-panel__message {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	.finance-panel__message--warning {
		margin-bottom: 0.75rem;
	}

	.finance-panel__transactions {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow: hidden;
	}

	.finance-panel__transactions--paginated {
		gap: 1rem;
	}

	.finance-panel__transaction-list-container {
		--transactions-scrollbar-thumb: var(--color-secondary);
		--transactions-scrollbar-thumb-hover: var(--color-secondary);
		--transactions-scrollbar-thumb-active: var(--color-secondary);

		flex: 1;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-gutter: stable;
		padding-inline-end: 0.75rem;
		scrollbar-width: thin;
		scrollbar-color: var(--transactions-scrollbar-thumb) transparent;
	}

	.finance-panel__transaction-list-container::-webkit-scrollbar {
		width: 4px;
	}

	.finance-panel__transaction-list-container::-webkit-scrollbar-track {
		margin-block: 0.125rem;
		background: transparent;
	}

	.finance-panel__transaction-list-container::-webkit-scrollbar-thumb {
		border-radius: var(--radius-full);
		background-color: var(--transactions-scrollbar-thumb);
	}

	@media (prefers-reduced-motion: no-preference) {
		.finance-panel__transaction-list-container::-webkit-scrollbar-thumb {
			transition: background-color 0.18s ease;
		}
	}

	.finance-panel__transaction-list-container::-webkit-scrollbar-thumb:hover {
		background-color: var(--transactions-scrollbar-thumb-hover);
	}

	.finance-panel__transaction-list-container::-webkit-scrollbar-thumb:active {
		background-color: var(--transactions-scrollbar-thumb-active);
	}

	.finance-panel__transaction-list-container--paginated {
		overflow: hidden;
		padding-inline-end: 0;
	}

	.finance-panel__pagination {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		padding-top: 0.25rem;
	}

	.finance-panel__pagination-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--color-secondary);
		border-radius: var(--radius-md);
		background: transparent;
		padding: 0;
		color: var(--color-secondary);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.finance-panel__pagination-button:hover:not(:disabled) {
		background: var(--color-secondary);
		color: var(--color-background);
	}

	.finance-panel__pagination-button:focus-visible:not(:disabled) {
		background: color-mix(in srgb, var(--color-secondary) 16%, transparent);
	}

	.finance-panel__pagination-button:focus-visible {
		outline: none;
	}

	.finance-panel__pagination-button:disabled {
		border-color: var(--color-border);
		color: var(--color-muted);
		cursor: default;
	}

	:global(.finance-panel__pagination-icon) {
		width: 1rem;
		height: 1rem;
	}

	.finance-panel__pagination-page {
		min-width: 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		color: var(--color-primary);
		text-align: center;
	}

	.finance-panel__transactions-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.finance-panel__transactions-header--spending {
		align-items: center;
		flex-wrap: nowrap;
		gap: 0.75rem 1rem;
	}

	.finance-panel__transactions-header--all {
		justify-content: flex-end;
	}

	.finance-panel__transactions-heading {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
		flex-shrink: 0;
	}

	.finance-panel__transactions-toolbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.625rem;
		min-width: 0;
		margin-inline-start: auto;
	}

	.finance-panel__search {
		min-width: 0;
		width: min(100%, 11rem);
		flex: 0 1 auto;
	}

	.finance-panel__search :global(.input-shell) {
		min-height: 1.75rem;
		padding-inline: 0.5rem;
		column-gap: 0.375rem;
		border-width: 1px;
		border-color: var(--color-border);
		border-radius: var(--radius-sm);
	}

	.finance-panel__search :global(.input-shell:hover),
	.finance-panel__search :global(.input-shell:focus-within) {
		border-color: var(--color-secondary);
	}

	.finance-panel__search :global(.input-field),
	.finance-panel__search :global(.input-measure) {
		font-size: 0.8125rem;
		line-height: 1.25;
	}

	.finance-panel__sort {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.finance-panel__sort-label {
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
		white-space: nowrap;
	}

	.finance-panel__sort-select {
		height: 1.75rem;
		max-width: 8.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-background);
		padding-inline: 0.5rem 1.5rem;
		font: inherit;
		font-size: 0.8125rem;
		line-height: 1.25;
		color: var(--color-primary);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.375rem center;
		transition: border-color 0.15s ease;
	}

	.finance-panel__sort-select:hover {
		border-color: var(--color-secondary);
	}

	.finance-panel__sort-select:focus {
		outline: none;
	}

	@media (max-width: 520px) {
		.finance-panel__transactions-header--spending {
			flex-wrap: wrap;
		}

		.finance-panel__transactions-toolbar {
			width: 100%;
			margin-inline-start: 0;
		}

		.finance-panel__search {
			flex: 1;
			width: auto;
		}
	}

	.finance-panel__view-spending {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.25rem;
		border: 0;
		background: transparent;
		padding: 0;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		line-height: 1.25;
		color: var(--color-primary);
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.finance-panel__view-spending:hover,
	.finance-panel__view-spending:focus-visible {
		color: var(--color-secondary);
	}

	.finance-panel__view-spending:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	:global(.finance-panel__view-spending-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.finance-panel__transaction-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.finance-panel__transaction-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 0;
		border-top: 1px solid var(--color-border);
	}

	.finance-panel__transaction-row:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.finance-panel__transaction-main {
		min-width: 0;
		flex: 1;
	}

	.finance-panel__merchant {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.finance-panel__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.375rem;
		margin: 0.25rem 0 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	.finance-panel__transaction-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.finance-panel__date {
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		white-space: nowrap;
	}

	.finance-panel__amount {
		font-size: 0.875rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary);
		white-space: nowrap;
	}

	.finance-panel__amount--income {
		color: var(--color-income);
	}
</style>
