<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		src?: string;
		alt?: string;
		size?: number;
		class?: string;
		children?: Snippet;
	};

	let {
		src,
		alt = '',
		size = 28,
		class: className = '',
		children
	}: Props = $props();
</script>

<span
	class="input-icon inline-flex shrink-0 items-center justify-center {className}"
	style:width="{size}px"
	style:height="{size}px"
>
	{#if children}
		{@render children()}
	{:else if src}
		<img
			{src}
			{alt}
			width={size}
			height={size}
			class="size-full object-contain"
			aria-hidden={alt ? undefined : true}
		/>
	{/if}
</span>

<style>
	.input-icon :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
