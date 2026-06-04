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
				<li class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted"
						aria-hidden="true"
					>
						<Icon class="size-5" strokeWidth={1.75} />
					</div>

					<div class="min-w-0 flex-1">
						<p class="truncate font-medium text-primary">{transaction.merchant}</p>
						<p class="truncate text-sm text-muted-foreground">{transaction.category}</p>
						<p class="mt-0.5 text-xs text-muted-foreground sm:hidden">{transaction.dateLabel}</p>
					</div>

					<p class="hidden shrink-0 text-sm text-muted-foreground sm:block">
						{transaction.dateLabel}
					</p>

					<p
						class="shrink-0 text-right text-sm font-medium tabular-nums {transaction.isIncome
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
