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
	class="quick-link inline-flex shrink-0 flex-col items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {className}"
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
>
	<span class="quick-link__icon-box shadow-lg">
		<img src={icon} alt="" class="quick-link__icon" aria-hidden="true" />
	</span>
	<span class="quick-link__label">{ariaLabel}</span>
</a>

<style>
	.quick-link {
		gap: clamp(0.25rem, 0.125rem + 0.5vw, 0.375rem);
	}

	.quick-link__icon-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: clamp(2.75rem, 2rem + 5vw, 4rem);
		height: clamp(2.75rem, 2rem + 5vw, 4rem);
		border-radius: clamp(0.5rem, 0.35rem + 0.5vw, 0.75rem);
		border: 2px solid var(--color-border);
		background-color: var(--color-background);
		transition: border-color 0.2s ease-in-out;
	}

	.quick-link:hover .quick-link__icon-box,
	.quick-link:focus-visible .quick-link__icon-box {
		border-color: var(--color-secondary);
	}

	.quick-link__icon {
		width: clamp(1.75rem, 1.25rem + 3vw, 2.5rem);
		height: clamp(1.75rem, 1.25rem + 3vw, 2.5rem);
		object-fit: contain;
	}

	.quick-link__label {
		font-size: clamp(0.625rem, 0.5rem + 0.35vw, 0.75rem);
		line-height: 1;
		color: var(--color-primary);
	}

	a :global(svg) {
		width: clamp(1.75rem, 1.25rem + 3vw, 2.5rem);
		height: clamp(1.75rem, 1.25rem + 3vw, 2.5rem);
	}
</style>
