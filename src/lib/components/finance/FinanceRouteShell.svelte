<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = ''
	}: {
		children: Snippet;
		class?: string;
	} = $props();
</script>

<div class="finance-route-shell {className}">
	{@render children()}
</div>

<style>
	.finance-route-shell {
		box-sizing: border-box;
		width: min(48rem, 100%);
		margin-inline: auto;
		background: var(--color-background);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
		padding: 1.75rem 1.5rem;
		color: var(--color-primary);
		box-shadow: 0 16px 48px rgb(0 0 0 / 40%);
	}

	@media (min-width: 640px) {
		.finance-route-shell {
			padding: 2rem 2.25rem;
		}
	}

	@media (max-width: 639px) {
		.finance-route-shell {
			width: auto;
			min-height: 100dvh;
			margin: -2rem;
			border-radius: 0;
			border-inline: none;
			box-shadow: none;
		}
	}
</style>
