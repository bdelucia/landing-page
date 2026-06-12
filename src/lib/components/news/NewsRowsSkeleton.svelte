<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';

	let { rowCount = 5 }: { rowCount?: number } = $props();
</script>

<ul class="news-rows-skeleton" aria-hidden="true">
	{#each Array.from({ length: rowCount }, (_, index) => index) as row (row)}
		<li class="news-rows-skeleton__row">
			<div class="news-rows-skeleton__main">
				<Skeleton class="h-4 w-64 max-w-full" />
				<Skeleton class="h-3.5 w-44 max-w-full" />
			</div>
			<div class="news-rows-skeleton__side">
				<Skeleton class="h-3 w-14" rounded="full" />
			</div>
		</li>
	{/each}
</ul>

<style>
	.news-rows-skeleton {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.news-rows-skeleton__row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 0;
		border-top: 1px solid var(--color-border);
	}

	.news-rows-skeleton__row:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.news-rows-skeleton__main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.news-rows-skeleton__side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}
</style>
