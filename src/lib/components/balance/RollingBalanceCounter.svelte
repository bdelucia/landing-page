<script lang="ts">
	import {
		formatDebtBalanceLabel,
		formatUsdBalance,
		isDebtAccountLabel
	} from '$lib/hooks/finances/account-balances';

	let {
		label,
		value = undefined,
		isDebt: isDebtProp,
		staticLabel,
		size = 'sm',
		class: className = ''
	}: {
		label?: string;
		value?: number | null;
		isDebt?: boolean;
		staticLabel?: string;
		size?: 'sm' | 'lg';
		class?: string;
	} = $props();

	const isDebt = $derived(isDebtProp ?? (label ? isDebtAccountLabel(label) : false));
	const balanceTextClass = $derived(isDebt ? 'text-debt' : 'text-primary');
	const sizeClass = $derived(size === 'lg' ? 'text-xl' : 'text-sm');

	function formatAmount(amount: number): string {
		return isDebt ? formatDebtBalanceLabel(amount) : formatUsdBalance(amount);
	}

	const displayLabel = $derived(staticLabel ?? (value != null ? formatAmount(value) : '—'));
</script>

<span class="shrink-0 font-semibold tabular-nums {sizeClass} {balanceTextClass} {className}">
	{displayLabel}
</span>
