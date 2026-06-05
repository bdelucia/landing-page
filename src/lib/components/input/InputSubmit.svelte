<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { fly } from 'svelte/transition';
	import ArrowUpIcon from '~icons/material-symbols/arrow-upward-alt-rounded';
	import { getInputContext } from './input-context';

	type Props = HTMLButtonAttributes & {
		class?: string;
	};

	let {
		class: className = '',
		type = 'submit',
		'aria-label': ariaLabel = 'Submit',
		...buttonProps
	}: Props = $props();

	const inputContext = getInputContext();
	let visible = $derived(inputContext?.hasValue ?? true);
</script>

{#if visible}
	<button
		{type}
		aria-label={ariaLabel}
		class="input-submit inline-flex shrink-0 items-center justify-center rounded-full bg-tertiary text-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 {className}"
		in:fly={{ y: 8, duration: 200 }}
		out:fly={{ y: 8, duration: 150 }}
		{...buttonProps}
	>
		<span class="input-submit__icon">
			<ArrowUpIcon aria-hidden="true" />
		</span>
	</button>
{/if}

<style>
	.input-submit {
		width: clamp(2rem, 1.5rem + 1.5vw, 2.5rem);
		height: clamp(2rem, 1.5rem + 1.5vw, 2.5rem);
	}

	.input-submit__icon {
		display: inline-flex;
		width: clamp(1.125rem, 0.875rem + 0.75vw, 1.5rem);
		height: clamp(1.125rem, 0.875rem + 0.75vw, 1.5rem);
		align-items: center;
		justify-content: center;
	}

	.input-submit__icon :global(svg) {
		width: 100%;
		height: 100%;
		scale: 1.35;
	}
</style>
