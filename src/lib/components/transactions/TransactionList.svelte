<script lang="ts">
	import { bankBrandColor, categoryBalanceSummaries } from '$lib/hooks/finances/account-balances';
	import {
		buildAggregatedBankAccountDetail,
		type BankAccountDetailsByItem
	} from '$lib/hooks/finances/bank-accounts';
	import type { DashboardFinances } from '$lib/hooks/dashboard/dashboard-data';
	import type { TransactionIcon, TransactionItem } from '$lib/hooks/finances/transactions';
	import AccountBalanceChart from '$lib/components/balance/AccountBalanceChart.svelte';
	import AccountBalances from '$lib/components/balance/AccountBalances.svelte';
	import TransactionRowsSkeleton from '$lib/components/transactions/TransactionRowsSkeleton.svelte';
	import CoffeeIcon from '@lucide/svelte/icons/coffee';
	import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CarIcon from '@lucide/svelte/icons/car';
	import TvIcon from '@lucide/svelte/icons/tv';
	import CircleDollarSignIcon from '@lucide/svelte/icons/circle-dollar-sign';

	let {
		finances,
		class: className = ''
	}: {
		finances: Promise<DashboardFinances>;
		class?: string;
	} = $props();

	const iconMap: Record<TransactionIcon, typeof CoffeeIcon> = {
		coffee: CoffeeIcon,
		cart: ShoppingCartIcon,
		wallet: WalletIcon,
		car: CarIcon,
		tv: TvIcon,
		default: CircleDollarSignIcon
	};

	const displayLimit = 5;

	let financesLoading = $state(true);
	let dashboardFinances = $state<DashboardFinances | null>(null);

	let selectedAccountId = $state<string | null>(null);
	let netWorthSelected = $state(false);

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

	function toggleNetWorth() {
		if (netWorthSelected) {
			netWorthSelected = false;
			return;
		}

		netWorthSelected = true;
		selectedAccountId = null;
	}

	function toggleAccountFilter(accountId: string) {
		if (selectedAccountId === accountId) {
			selectedAccountId = null;
			return;
		}

		selectedAccountId = accountId;
		netWorthSelected = false;
	}

	const selectedBankDetail = $derived(
		selectedAccountId ? bankAccountDetails[selectedAccountId] : null
	);

	const aggregatedBankDetail = $derived(buildAggregatedBankAccountDetail(bankAccountDetails));

	const showChart = $derived(!financesLoading && (netWorthSelected || selectedAccountId !== null));

	const chartDetail = $derived(
		selectedBankDetail ?? (netWorthSelected ? aggregatedBankDetail : null)
	);

	const selectedBank = $derived(
		selectedAccountId ? accounts.find((account) => account.id === selectedAccountId) : null
	);

	const sectionHeading = $derived(
		selectedBank?.label ?? (netWorthSelected ? 'All Accounts' : 'Recent Transactions')
	);

	const categorySummaries = $derived(categoryBalanceSummaries(accounts));

	const itemLabelsByItemId = $derived(
		Object.fromEntries(accounts.map((account) => [account.id, account.label]))
	);

	const visibleTransactions = $derived.by(() => {
		const pool = selectedAccountId
			? transactions.filter((transaction) => transaction.sourceId === selectedAccountId)
			: transactions;

		return [...pool].sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, displayLimit);
	});
</script>

<section
	class="border-border bg-background flex w-full flex-col overflow-hidden rounded-xl border shadow-lg {className}"
	aria-labelledby="recent-transactions-heading"
	aria-busy={financesLoading}
>
	<header class="border-border flex shrink-0 flex-col gap-4 border-b px-4 py-4 sm:px-5">
		<AccountBalances
			{accounts}
			error={balancesError}
			loading={financesLoading}
			{selectedAccountId}
			{netWorthSelected}
			onAccountSelect={toggleAccountFilter}
			onNetWorthSelect={toggleNetWorth}
			class="w-full"
		/>
		<h2 id="recent-transactions-heading" class="text-primary min-w-0 text-lg font-semibold">
			{sectionHeading}
		</h2>
	</header>

	{#if showChart && chartDetail}
		<div class="border-border border-b">
			<AccountBalanceChart
				detail={chartDetail}
				totalOnly={netWorthSelected}
				categorySummaries={netWorthSelected ? categorySummaries : []}
				itemLabelsByItemId={netWorthSelected ? itemLabelsByItemId : {}}
			/>
		</div>
	{/if}

	{#if financesLoading}
		<TransactionRowsSkeleton />
		<p class="sr-only" role="status">Loading recent transactions and account balances</p>
	{:else if error}
		<p class="text-muted-foreground px-5 py-6 text-sm" role="status">{error}</p>
	{:else if visibleTransactions.length === 0}
		<p class="text-muted-foreground px-5 py-6 text-sm" role="status">No transactions to show.</p>
	{:else}
		<ul class="divide-border divide-y">
			{#each visibleTransactions as transaction (transaction.id)}
				{@const Icon = iconMap[transaction.icon]}
				<li
					class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-4 sm:px-5"
				>
					<div
						class="bg-surface text-muted col-start-1 row-start-1 flex size-10 items-center justify-center rounded-lg"
						aria-hidden="true"
					>
						<Icon class="size-5" strokeWidth={1.75} />
					</div>

					<div class="col-start-2 row-start-1 min-w-0">
						<p class="text-primary truncate font-medium">{transaction.merchant}</p>
						<p class="flex min-w-0 items-baseline gap-x-1 truncate text-sm">
							<span class="text-muted-foreground shrink-0">{transaction.category}</span>
							<span class="text-muted-foreground shrink-0" aria-hidden="true">·</span>
							<span
								class="shrink-0 font-medium"
								style:color={bankBrandColor(transaction.bankLabel)}
							>
								{transaction.bankLabel}
							</span>
							<span class="text-muted-foreground shrink-0" aria-hidden="true">·</span>
							<span class="text-muted-foreground truncate">{transaction.accountLabel}</span>
						</p>
						<p class="text-muted-foreground mt-0.5 text-xs sm:hidden">{transaction.dateLabel}</p>
					</div>

					<p
						class="text-muted-foreground col-start-3 row-start-1 hidden text-start text-sm sm:block"
					>
						{transaction.dateLabel}
					</p>

					<p
						class="col-start-3 row-start-1 self-center text-end text-sm font-medium tabular-nums sm:col-start-4 sm:row-start-1 sm:text-start {transaction.isIncome
							? 'text-income'
							: 'text-primary'}"
					>
						{transaction.amountLabel}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
