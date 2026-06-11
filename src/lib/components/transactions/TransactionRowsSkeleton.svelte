<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';

	let { rowCount = 3 }: { rowCount?: number } = $props();
</script>

<ul class="transaction-rows-skeleton" aria-hidden="true">
	{#each Array.from({ length: rowCount }, (_, index) => index) as row (row)}
		<li class="transaction-rows-skeleton__row">
			<div class="transaction-rows-skeleton__main">
				<Skeleton class="h-4 w-36 max-w-full" />
				<Skeleton class="h-3.5 w-48 max-w-full" />
			</div>
			<div class="transaction-rows-skeleton__side">
				<Skeleton class="h-3 w-14" rounded="full" />
				<Skeleton class="h-4 w-16" rounded="full" />
			</div>
		</li>
	{/each}
</ul>

<style>
	.transaction-rows-skeleton {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.transaction-rows-skeleton__row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 0;
		border-top: 1px solid var(--color-border);
	}

	.transaction-rows-skeleton__row:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.transaction-rows-skeleton__main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.transaction-rows-skeleton__side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		flex-shrink: 0;
	}
</style>
