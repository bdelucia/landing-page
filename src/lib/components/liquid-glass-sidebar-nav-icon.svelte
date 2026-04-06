<script lang="ts">
	import type { Component } from 'svelte';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	let {
		icon: Icon
	}: {
		icon: Component<{ class?: string }>;
	} = $props();

	const sidebar = useSidebar();
	/** Desktop icon rail only; mobile uses the sheet — keep the expanded pill there. */
	const collapsedRail = $derived(!sidebar.isMobile && sidebar.state === 'collapsed');
</script>

{#if collapsedRail}
	<span class="liquid-glass-trigger-pill shrink-0" aria-hidden="true">
		<span class="flex size-8 shrink-0 items-center justify-center rounded-4xl">
			<Icon class="size-4 text-zinc-100" />
		</span>
	</span>
{:else}
	<span class="liquid-glass-icon-pill" aria-hidden="true">
		<Icon class="size-4 text-zinc-100" />
	</span>
{/if}
