<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { SVGAttributes } from 'svelte/elements';

	/** Same paths as Lucide `loader` — inlined so Node/ESLint never resolve `.svelte` from `@lucide/svelte`. */
	let {
		class: className,
		...restProps
	}: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	role="status"
	aria-label="Loading"
	class={cn('size-4 animate-spin', className)}
	{...restProps}
>
	<path d="M12 2v4" />
	<path d="m16.2 7.8 2.9-2.9" />
	<path d="M18 12h4" />
	<path d="m16.2 16.2 2.9 2.9" />
	<path d="M12 18v4" />
	<path d="m4.9 19.1 2.9-2.9" />
	<path d="M2 12h4" />
	<path d="m4.9 4.9 2.9 2.9" />
</svg>
