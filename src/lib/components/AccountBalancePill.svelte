<script lang="ts">
	type Props = {
		icon?: string;
		iconEmoji?: string;
		label: string;
		balanceLabel: string;
		error?: string;
		isDebt?: boolean;
		selected?: boolean;
		onselect?: () => void;
		class?: string;
	};

	let {
		icon = '',
		iconEmoji,
		label,
		balanceLabel,
		error,
		isDebt = false,
		selected = false,
		onselect,
		class: className = ''
	}: Props = $props();

	const balanceTextClass = $derived(isDebt ? 'text-debt' : 'text-primary');
</script>

<button
	type="button"
	class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-2 bg-surface px-2.5 py-2 text-start transition-[border-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {selected
		? 'border-secondary shadow-md'
		: 'border-border hover:border-secondary focus-visible:border-secondary'} {className}"
	aria-label="{label} balance, {balanceLabel}"
	aria-pressed={selected}
	onclick={onselect}
>
	{#if iconEmoji}
		<span
			class="inline-flex size-7 shrink-0 items-center justify-center leading-none"
			aria-hidden="true"
		>
			<span class="text-lg">{iconEmoji}</span>
		</span>
	{:else}
		<img
			src={icon}
			alt=""
			width={28}
			height={28}
			class="size-7 shrink-0 rounded-sm object-contain"
			aria-hidden="true"
		/>
	{/if}

	<span class="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{label}</span>

	<span
		class="shrink-0 text-sm font-semibold tabular-nums {balanceTextClass}"
		title={error ?? balanceLabel}
	>
		{balanceLabel}
	</span>
</button>
