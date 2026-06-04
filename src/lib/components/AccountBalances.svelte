<script lang="ts">
	import type { AccountBalanceItem } from '$lib/account-balances';
	import AccountBalancePill from '$lib/components/AccountBalancePill.svelte';

	let {
		accounts = [],
		error = null,
		compact = false,
		selectedAccountId = null,
		onAccountSelect,
		class: className = ''
	}: {
		accounts?: AccountBalanceItem[];
		error?: string | null;
		compact?: boolean;
		selectedAccountId?: string | null;
		onAccountSelect?: (accountId: string) => void;
		class?: string;
	} = $props();
</script>

<section
	class="{compact
		? 'flex flex-wrap items-center justify-end gap-2'
		: 'flex w-full flex-col gap-2'} {className}"
	aria-label="Account balances"
>
	{#if error}
		<p
			class="{compact
				? 'text-end text-xs text-muted-foreground'
				: 'text-center text-sm text-muted-foreground'}"
			role="status"
		>
			{error}
		</p>
	{/if}

	{#if accounts.length > 0}
		<div
			class="{compact
				? 'flex flex-wrap items-center justify-end gap-2'
				: 'flex w-full flex-col gap-2 sm:flex-row sm:gap-3'}"
		>
			{#each accounts as account (account.id)}
				<AccountBalancePill
					icon={account.icon}
					label={account.label}
					balanceLabel={account.balanceLabel}
					error={account.error}
					selected={selectedAccountId === account.id}
					onselect={() => onAccountSelect?.(account.id)}
					{compact}
				/>
			{/each}
		</div>
	{:else if !error && !compact}
		<p class="text-center text-sm text-muted-foreground" role="status">No account balances to show.</p>
	{/if}
</section>
