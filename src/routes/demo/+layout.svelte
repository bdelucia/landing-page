<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		document.documentElement.classList.add('demo-liquid-page');
	});

	onDestroy(() => {
		document.documentElement.classList.remove('demo-liquid-page');
	});
</script>

<div class="demo-liquid-root">
	{@render children()}
</div>

<style>
	:global(html.demo-liquid-page .app-shell .bg) {
		display: none !important;
	}

	:global(html.demo-liquid-page .app-shell .content) {
		padding: 0;
		min-height: 100dvh;
	}

	.demo-liquid-root {
		min-height: 100dvh;
	}
</style>
