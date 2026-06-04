<script lang="ts">
	type Props = {
		icon: string;
		label: string;
		balanceLabel: string;
		error?: string;
		compact?: boolean;
		selected?: boolean;
		onselect?: () => void;
		class?: string;
	};

	let {
		icon,
		label,
		balanceLabel,
		error,
		compact = false,
		selected = false,
		onselect,
		class: className = ''
	}: Props = $props();
</script>

<button
	type="button"
	class="flex min-w-0 cursor-pointer items-center rounded-full border-2 bg-background shadow-lg transition-[border-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {selected
		? 'border-secondary'
		: 'border-border hover:border-secondary focus-visible:border-secondary'} {compact
		? 'gap-2 px-2 py-1'
		: 'flex-1 gap-3 px-3 py-2'} {className}"
	aria-label="{label} balance"
	aria-pressed={selected}
	onclick={onselect}
>
	<span
		class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface {compact
			? 'size-7'
			: 'size-10'}"
		aria-hidden="true"
	>
		<img
			src={icon}
			alt=""
			width={compact ? 20 : 28}
			height={compact ? 20 : 28}
			class="{compact ? 'size-5' : 'size-7'} object-contain"
		/>
	</span>
	<span
		class="min-w-0 truncate font-semibold tabular-nums text-primary {compact
			? 'text-xs'
			: 'text-sm sm:text-base'}"
		title={error ?? balanceLabel}
	>
		{balanceLabel}
	</span>
</button>

<style>
	button :global(svg) {
		width: 1.75rem;
		height: 1.75rem;
	}
</style>
