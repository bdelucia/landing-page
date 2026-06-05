<script lang="ts">
	import {
		bankBrandColor,
		categoryBalanceSummaries,
		type AccountBalanceItem
	} from '$lib/account-balances';
	import {
		buildAggregatedBankAccountDetail,
		type BankAccountDetailsByItem
	} from '$lib/bank-accounts';
	import type { TransactionIcon, TransactionItem } from '$lib/transactions';
	import AccountBalanceChart from '$lib/components/AccountBalanceChart.svelte';
	import AccountBalances from '$lib/components/AccountBalances.svelte';
	import CoffeeIcon from '@lucide/svelte/icons/coffee';
	import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CarIcon from '@lucide/svelte/icons/car';
	import TvIcon from '@lucide/svelte/icons/tv';
	import CircleDollarSignIcon from '@lucide/svelte/icons/circle-dollar-sign';

	let {
		transactions = [],
		accounts = [],
		bankAccountDetails = {},
		error = null,
		balancesError = null,
		class: className = ''
	}: {
		transactions?: TransactionItem[];
		accounts?: AccountBalanceItem[];
		bankAccountDetails?: BankAccountDetailsByItem;
		error?: string | null;
		balancesError?: string | null;
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

	let selectedAccountId = $state<string | null>(null);
	let netWorthSelected = $state(false);

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

	const showChart = $derived(netWorthSelected || selectedAccountId !== null);

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

		return [...pool]
			.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
			.slice(0, displayLimit);
	});
</script>

<section
	class="flex w-full flex-col rounded-xl border border-border bg-background shadow-lg {className}"
	aria-labelledby="recent-transactions-heading"
>
	<header class="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 sm:px-5">
		<AccountBalances
			accounts={accounts}
			error={balancesError}
			{selectedAccountId}
			{netWorthSelected}
			onAccountSelect={toggleAccountFilter}
			onNetWorthSelect={toggleNetWorth}
			class="w-full"
		/>
		<h2 id="recent-transactions-heading" class="min-w-0 text-lg font-semibold text-primary">
			{sectionHeading}
		</h2>
	</header>

	{#if showChart && chartDetail}
		<div class="border-b border-border">
			<AccountBalanceChart
				detail={chartDetail}
				totalOnly={netWorthSelected}
				categorySummaries={netWorthSelected ? categorySummaries : []}
				itemLabelsByItemId={netWorthSelected ? itemLabelsByItemId : {}}
			/>
		</div>
	{/if}

	{#if error}
		<p class="px-5 py-6 text-sm text-muted-foreground" role="status">{error}</p>
	{:else if visibleTransactions.length === 0}
		<p class="px-5 py-6 text-sm text-muted-foreground" role="status">No transactions to show.</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each visibleTransactions as transaction (transaction.id)}
				{@const Icon = iconMap[transaction.icon]}
				<li
					class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-4 sm:px-5"
				>
					<div
						class="col-start-1 row-start-1 flex size-10 items-center justify-center rounded-lg bg-surface text-muted"
						aria-hidden="true"
					>
						<Icon class="size-5" strokeWidth={1.75} />
					</div>

					<div class="col-start-2 row-start-1 min-w-0">
						<p class="truncate font-medium text-primary">{transaction.merchant}</p>
						<p class="flex min-w-0 items-baseline gap-x-1 truncate text-sm">
							<span class="shrink-0 text-muted-foreground">{transaction.category}</span>
							<span class="shrink-0 text-muted-foreground" aria-hidden="true">·</span>
							<span
								class="shrink-0 font-medium"
								style:color={bankBrandColor(transaction.bankLabel)}
							>
								{transaction.bankLabel}
							</span>
							<span class="shrink-0 text-muted-foreground" aria-hidden="true">·</span>
							<span class="truncate text-muted-foreground">{transaction.accountLabel}</span>
						</p>
						<p class="mt-0.5 text-xs text-muted-foreground sm:hidden">{transaction.dateLabel}</p>
					</div>

					<p
						class="col-start-3 row-start-1 hidden text-start text-sm text-muted-foreground sm:block"
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
