<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	const skeletonRowCount = 5;
</script>

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

			<Skeleton class="col-start-3 row-start-1 hidden h-3.5 w-14 sm:block" rounded="full" />

			<Skeleton
				class="col-start-3 row-start-1 h-4 w-16 self-center sm:col-start-4 sm:w-14"
				rounded="full"
			/>
		</li>
	{/each}
</ul>
