<script lang="ts">
	import { bankBrandColor } from '$lib/hooks/finances/account-balances';
	import { buildAggregatedBankAccountDetail } from '$lib/hooks/finances/bank-accounts';
	import type { DashboardFinances } from '$lib/hooks/dashboard/dashboard-data';
	import AccountBalanceChart from '$lib/components/balance/AccountBalanceChart.svelte';
	import FinanceChartSkeleton from '$lib/components/finance/FinanceChartSkeleton.svelte';
	import TransactionRowsSkeleton from '$lib/components/transactions/TransactionRowsSkeleton.svelte';

	let {
		finances,
		selectedAccountId = $bindable(null),
		class: className = ''
	}: {
		finances: Promise<DashboardFinances>;
		selectedAccountId?: string | null;
		class?: string;
	} = $props();

	const DEFAULT_SKELETON_ROWS = 3;
	const MAX_TRANSACTIONS = 10;

	let financesLoading = $state(true);
	let dashboardFinances = $state<DashboardFinances | null>(null);

	$effect(() => {
		let cancelled = false;
		financesLoading = true;

		finances.then((result) => {
			if (!cancelled) {
				dashboardFinances = result;
				financesLoading = false;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	const transactions = $derived(dashboardFinances?.transactions ?? []);
	const accounts = $derived(dashboardFinances?.accounts ?? []);
	const bankAccountDetails = $derived(dashboardFinances?.bankAccountDetails ?? {});
	const error = $derived(dashboardFinances?.transactionsError ?? null);
	const balancesError = $derived(dashboardFinances?.accountBalancesError ?? null);

	const aggregatedBankDetail = $derived(buildAggregatedBankAccountDetail(bankAccountDetails));

	const chartDetail = $derived(
		selectedAccountId
			? (bankAccountDetails[selectedAccountId] ?? null)
			: aggregatedBankDetail
	);

	const chartSummaryLabel = $derived(
		selectedAccountId
			? (accounts.find((account) => account.id === selectedAccountId)?.label ?? 'Total')
			: 'Net worth'
	);

	const visibleTransactions = $derived.by(() => {
		const pool = selectedAccountId
			? transactions.filter((transaction) => transaction.sourceId === selectedAccountId)
			: transactions;

		return [...pool]
			.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
			.slice(0, MAX_TRANSACTIONS);
	});
</script>

<section class="finance-panel {className}" aria-busy={financesLoading}>
	<div class="finance-panel__chart">
		{#if financesLoading}
			<FinanceChartSkeleton />
			<p class="sr-only" role="status">Loading finances</p>
		{:else if chartDetail}
			<AccountBalanceChart
				detail={chartDetail}
				totalOnly={selectedAccountId === null}
				summaryLabel={chartSummaryLabel}
				class="w-full"
			/>
		{/if}
	</div>

	{#if balancesError}
		<p class="finance-panel__message" role="status">{balancesError}</p>
	{/if}

	<div class="finance-panel__transactions" aria-labelledby="recent-transactions-heading">
		<h2 id="recent-transactions-heading" class="finance-panel__transactions-heading">
			Recent transactions
		</h2>

		<div class="finance-panel__transaction-list-container">
			{#if financesLoading}
				<TransactionRowsSkeleton rowCount={DEFAULT_SKELETON_ROWS} />
			{:else if error}
				<p class="finance-panel__message" role="status">{error}</p>
			{:else if visibleTransactions.length === 0}
				<p class="finance-panel__message" role="status">No transactions to show.</p>
			{:else}
				<ul class="finance-panel__transaction-list">
					{#each visibleTransactions as transaction (transaction.id)}
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
	</div>
</section>

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

	.finance-panel__chart {
		flex-shrink: 0;
	}

	.finance-panel__message {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	.finance-panel__transactions {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow: hidden;
	}

	.finance-panel__transaction-list-container {
		--transactions-scrollbar-thumb:var(--color-secondary);
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

	.finance-panel__transactions-heading {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
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
