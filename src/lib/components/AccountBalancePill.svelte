<script lang="ts">
	type Props = {
		icon: string;
		label: string;
		balanceLabel: string;
		error?: string;
		compact?: boolean;
		class?: string;
	};

	let {
		icon,
		label,
		balanceLabel,
		error,
		compact = false,
		class: className = ''
	}: Props = $props();
</script>

<div
	class="flex min-w-0 items-center rounded-full border border-border bg-background shadow-lg {compact
		? 'gap-2 px-2 py-1'
		: 'flex-1 gap-3 px-3 py-2'} {className}"
	role="group"
	aria-label="{label} balance"
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
	<p
		class="min-w-0 truncate font-semibold tabular-nums text-primary {compact
			? 'text-xs'
			: 'text-sm sm:text-base'}"
		title={error ?? balanceLabel}
	>
		{balanceLabel}
	</p>
</div>

<style>
	div :global(svg) {
		width: 1.75rem;
		height: 1.75rem;
	}
</style>
