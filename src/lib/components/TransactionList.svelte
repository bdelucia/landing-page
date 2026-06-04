<script lang="ts">
	import type { TransactionIcon, TransactionItem } from '$lib/transactions';
	import CoffeeIcon from '@lucide/svelte/icons/coffee';
	import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CarIcon from '@lucide/svelte/icons/car';
	import TvIcon from '@lucide/svelte/icons/tv';
	import CircleDollarSignIcon from '@lucide/svelte/icons/circle-dollar-sign';

	let {
		transactions = [],
		error = null,
		class: className = ''
	}: {
		transactions?: TransactionItem[];
		error?: string | null;
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
</script>

<section
	class="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg {className}"
	aria-labelledby="recent-transactions-heading"
>
	<header class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
		<div>
			<h2 id="recent-transactions-heading" class="text-lg font-semibold text-primary">
				Recent Transactions
			</h2>
			<p class="mt-0.5 text-sm text-muted-foreground">Your latest account activity.</p>
		</div>
		<button
			type="button"
			class="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-secondary hover:text-primary"
			disabled
		>
			View All
		</button>
	</header>

	{#if error}
		<p class="px-5 py-6 text-sm text-muted-foreground" role="status">{error}</p>
	{:else if transactions.length === 0}
		<p class="px-5 py-6 text-sm text-muted-foreground" role="status">No transactions to show.</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each transactions as transaction (transaction.id)}
				{@const Icon = iconMap[transaction.icon]}
				<li
					class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_6.5rem_5.5rem_5.5rem] sm:gap-x-4 sm:px-5"
				>
					<div
						class="col-start-1 row-start-1 flex size-10 items-center justify-center rounded-lg bg-surface text-muted"
						aria-hidden="true"
					>
						<Icon class="size-5" strokeWidth={1.75} />
					</div>

					<div class="col-start-2 row-start-1 min-w-0">
						<p class="truncate font-medium text-primary">{transaction.merchant}</p>
						<p class="truncate text-sm text-muted-foreground">{transaction.category}</p>
						{#if transaction.bankLabel}
							<p class="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
								{transaction.bankLabel}
							</p>
						{/if}
						<p class="mt-0.5 text-xs text-muted-foreground sm:hidden">{transaction.dateLabel}</p>
					</div>

					<p
						class="col-start-3 row-start-1 self-center text-end text-sm font-medium tabular-nums sm:col-start-5 sm:row-start-1 sm:text-start {transaction.isIncome
							? 'text-income'
							: 'text-primary'}"
					>
						{transaction.amountLabel}
					</p>

					<p
						class="col-start-3 row-start-1 hidden truncate text-start text-sm text-muted-foreground sm:col-start-3 sm:block"
						title={transaction.bankLabel}
					>
						{transaction.bankLabel}
					</p>

					<p
						class="col-start-4 row-start-1 hidden text-start text-sm text-muted-foreground sm:block"
					>
						{transaction.dateLabel}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
