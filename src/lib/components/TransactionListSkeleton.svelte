<script lang="ts">
	import { accountCategories } from '$lib/account-balances';
	import { accountBalanceIcon } from '$lib/account-balance-icons';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { class: className = '' }: { class?: string } = $props();

	const skeletonRowCount = 5;
	const balanceSkeletonWidths = ['w-14', 'w-16', 'w-12', 'w-14', 'w-12'] as const;
</script>

<section
	class="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg {className}"
	aria-labelledby="recent-transactions-heading"
	aria-busy="true"
>
	<header class="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 sm:px-5">
		<div
			class="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3"
			aria-hidden="true"
		>
			<span class="text-lg leading-none">💰</span>
			<Skeleton class="h-6 w-28" />
		</div>

		<div
			class="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-0"
			aria-label="Account balances"
		>
			{#each accountCategories as category (category.key)}
				<div class="flex min-w-0 flex-col gap-2 sm:px-3 sm:py-3">
					<Skeleton class="mx-auto h-4 w-24" />

					<div class="flex flex-col gap-2">
						{#each category.accounts as accountLabel, index (accountLabel)}
							{@const icon = accountBalanceIcon(accountLabel)}
							<div
								class="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2"
								aria-hidden="true"
							>
								{#if icon}
									<img
										src={icon}
										alt=""
										width={28}
										height={28}
										class="size-7 shrink-0 rounded-sm object-contain"
									/>
								{:else}
									<Skeleton class="size-7 shrink-0" rounded="md" />
								{/if}
								<Skeleton class="h-3.5 min-w-0 flex-1 w-16 max-w-full" />
								<Skeleton
									class="h-3.5 {balanceSkeletonWidths[index] ?? 'w-14'}"
									rounded="full"
								/>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<h2 id="recent-transactions-heading" class="min-w-0 text-lg font-semibold text-primary">
			Recent Transactions
		</h2>
	</header>

	<ul class="divide-y divide-border" aria-hidden="true">
		{#each Array.from({ length: skeletonRowCount }, (_, index) => index) as row (row)}
			<li
				class="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-4 sm:px-5"
			>
				<Skeleton class="col-start-1 row-start-1 size-10" rounded="lg" />

				<div class="col-start-2 row-start-1 flex min-w-0 flex-col gap-1.5">
					<Skeleton class="h-4 w-36 max-w-full" />
					<div class="flex min-w-0 items-center gap-1.5">
						<Skeleton class="h-3.5 w-20 max-w-full" />
						<Skeleton class="h-3.5 w-14 max-w-full" />
						<Skeleton class="h-3.5 w-16 max-w-full" />
					</div>
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
