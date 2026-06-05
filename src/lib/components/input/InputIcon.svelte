<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		src?: string;
		alt?: string;
		/** Fixed pixel size; omit for fluid scaling with viewport */
		size?: number;
		class?: string;
		children?: Snippet;
	};

	let {
		src,
		alt = '',
		size,
		class: className = '',
		children
	}: Props = $props();
</script>

<span
	class="input-icon inline-flex shrink-0 items-center justify-center {size ? '' : 'input-icon--fluid'} {className}"
	style:width={size ? `${size}px` : undefined}
	style:height={size ? `${size}px` : undefined}
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
	.input-icon--fluid {
		width: clamp(1.375rem, 1rem + 1.25vw, 1.75rem);
		height: clamp(1.375rem, 1rem + 1.25vw, 1.75rem);
	}

	.input-icon :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
