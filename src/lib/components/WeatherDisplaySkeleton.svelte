<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div
	class="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-primary shadow-lg sm:px-5 sm:py-2.5"
	role="status"
	aria-busy="true"
	aria-label="Loading weather"
>
	<Skeleton class="size-6" rounded="full" />
	<div class="flex min-w-0 flex-col gap-1 leading-tight">
		<Skeleton class="h-3.5 w-10" rounded="full" />
		<div class="flex items-center gap-2">
			<Skeleton class="h-3 w-11" rounded="full" />
			<Skeleton class="h-3 w-11" rounded="full" />
		</div>
	</div>
</div>
