<script lang="ts">
	import { accountBalanceDisplayOrder, type AccountBalanceKey } from '$lib/account-balances';
	import { accountBalanceIcon } from '$lib/account-balance-icons';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { class: className = '' }: { class?: string } = $props();

	const skeletonAccounts = accountBalanceDisplayOrder
		.map((label) => ({ label, icon: accountBalanceIcon(label) }))
		.filter((account): account is { label: AccountBalanceKey; icon: string } => !!account.icon);

	const skeletonRowCount = 5;
</script>

<section
	class="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg {className}"
	aria-labelledby="recent-transactions-heading"
	aria-busy="true"
>
	<header
		class="flex shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-4"
	>
		<div class="min-w-0">
			<h2 id="recent-transactions-heading" class="text-lg font-semibold text-primary">
				Recent Transactions
			</h2>
			<p class="mt-0.5 text-sm text-muted-foreground">Your latest account activity.</p>
		</div>

		<div class="flex shrink-0 flex-wrap items-center justify-end gap-2" aria-label="Account balances">
			{#each skeletonAccounts as account (account.label)}
				<div
					class="flex min-w-0 items-center gap-2 rounded-full border-2 border-border bg-background px-2 py-1 shadow-lg"
					aria-hidden="true"
				>
					<span
						class="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
					>
						<img
							src={account.icon}
							alt=""
							width={20}
							height={20}
							class="size-5 object-contain"
						/>
					</span>
					<Skeleton class="h-3 w-14" rounded="full" />
				</div>
			{/each}
		</div>
	</header>

	<ul class="divide-y divide-border" aria-hidden="true">
		{#each Array.from({ length: skeletonRowCount }, (_, index) => index) as row (row)}
			<li
				class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-4 sm:px-5"
			>
				<Skeleton class="col-start-1 row-start-1 size-10" rounded="lg" />

				<div class="col-start-2 row-start-1 flex min-w-0 flex-col gap-1.5">
					<Skeleton class="h-4 w-36 max-w-full" />
					<Skeleton class="h-3.5 w-24 max-w-full" />
					<Skeleton class="mt-0.5 h-3 w-16 sm:hidden" rounded="full" />
				</div>

				<Skeleton
					class="col-start-3 row-start-1 hidden h-3.5 w-14 sm:block"
					rounded="full"
				/>

				<Skeleton
					class="col-start-3 row-start-1 h-4 w-16 self-center sm:col-start-4 sm:w-14"
					rounded="full"
				/>
			</li>
		{/each}
	</ul>

	<p class="sr-only" role="status">Loading recent transactions and account balances</p>
</section>
