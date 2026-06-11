<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';
</script>

<div class="finance-chart-skeleton" aria-hidden="true">
	<div class="finance-chart-skeleton__summary">
		<Skeleton class="h-3 w-16" rounded="full" />
		<Skeleton class="h-9 w-40 max-w-full" />
		<Skeleton class="h-4 w-24" rounded="full" />
	</div>
	<div class="finance-chart-skeleton__chart">
		<Skeleton class="h-full w-full" rounded="md" />
	</div>
</div>

<style>
	.finance-chart-skeleton {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.finance-chart-skeleton__summary {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.finance-chart-skeleton__chart {
		height: 240px;
		width: 100%;
	}
</style>
