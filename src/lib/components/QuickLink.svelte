<script lang="ts">
	type Props = {
		/** Destination URL */
		href: string;
		/** Local SVG/PNG import, e.g. `import icon from '$lib/assets/foo.svg'` */
		icon: string;
		/** Accessible name shown below the icon */
		ariaLabel: string;
		/** Opens in a new tab with `noopener noreferrer` */
		external?: boolean;
		class?: string;
	};

	let { href, icon, ariaLabel, external = false, class: className = '' }: Props = $props();
</script>

<a
	{href}
	class="group inline-flex shrink-0 flex-col items-center gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {className}"
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
>
	<span
		class="inline-flex size-16 items-center justify-center rounded-[12px] border border-border bg-background shadow-lg transition-[border-color] duration-200 ease-in-out group-hover:border-secondary group-focus-visible:border-secondary"
	>
		<img src={icon} alt="" width="40" height="40" class="size-10 object-contain" aria-hidden="true" />
	</span>
	<span class="text-[12px] leading-none text-primary">{ariaLabel}</span>
</a>

<style>
	a :global(svg) {
		width: 40px;
		height: 40px;
	}
</style>
