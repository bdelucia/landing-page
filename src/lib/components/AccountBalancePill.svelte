<script lang="ts">
	import RollingBalanceCounter from '$lib/components/RollingBalanceCounter.svelte';

	type Props = {
		icon?: string;
		iconEmoji?: string;
		label: string;
		balance?: number | null;
		balanceLabel?: string;
		error?: string;
		isDebt?: boolean;
		selected?: boolean;
		loading?: boolean;
		onselect?: () => void;
		class?: string;
	};

	let {
		icon = '',
		iconEmoji,
		label,
		balance = undefined,
		balanceLabel,
		error,
		isDebt = false,
		selected = false,
		loading = false,
		onselect,
		class: className = ''
	}: Props = $props();

	const hasStaticBalance = $derived(!!error || balanceLabel === '—');
	const counterValue = $derived(loading || hasStaticBalance ? undefined : balance);
</script>

<button
	type="button"
	class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-2 bg-surface px-2.5 py-2 text-start transition-[border-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {selected
		? 'border-secondary shadow-md'
		: 'border-border hover:border-secondary focus-visible:border-secondary'} {className}"
	aria-label="{label} balance, {balanceLabel ?? 'loading'}"
	aria-pressed={selected}
	disabled={loading}
	onclick={onselect}
>
	{#if iconEmoji}
		<span
			class="inline-flex size-7 shrink-0 items-center justify-center leading-none"
			aria-hidden="true"
		>
			<span class="text-lg">{iconEmoji}</span>
		</span>
	{:else if icon}
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

	<span title={error ?? balanceLabel}>
		<RollingBalanceCounter
			{label}
			value={counterValue}
			{isDebt}
			staticLabel={hasStaticBalance ? (balanceLabel ?? '—') : undefined}
		/>
	</span>
</button>
