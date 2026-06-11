<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';
</script>

<div class="spending-chart-skeleton" aria-hidden="true">
	<Skeleton class="spending-chart-skeleton__donut" rounded="full" />
</div>

<style>
	.spending-chart-skeleton {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 240px;
	}

	.spending-chart-skeleton :global(.spending-chart-skeleton__donut) {
		width: min(220px, 72vw);
		height: min(220px, 72vw);
	}
</style>
