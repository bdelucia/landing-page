<script lang="ts">
	import {
		accountCategories,
		balanceDisplayAmount,
		isDebtAccountLabel,
		netWorthAmount,
		netWorthBalanceLabel,
		type AccountBalanceItem
	} from '$lib/account-balances';
	import { accountBalanceIcon } from '$lib/account-balance-icons';
	import AccountBalancePill from '$lib/components/AccountBalancePill.svelte';
	import RollingBalanceCounter from '$lib/components/RollingBalanceCounter.svelte';

	let {
		accounts = [],
		error = null,
		loading = false,
		selectedAccountId = null,
		netWorthSelected = false,
		onAccountSelect,
		onNetWorthSelect,
		class: className = ''
	}: {
		accounts?: AccountBalanceItem[];
		error?: string | null;
		loading?: boolean;
		selectedAccountId?: string | null;
		netWorthSelected?: boolean;
		onAccountSelect?: (accountId: string) => void;
		onNetWorthSelect?: () => void;
		class?: string;
	} = $props();

	const netWorthLabel = $derived(netWorthBalanceLabel(accounts));
	const netWorthValue = $derived(netWorthAmount(accounts));

	const accountsByLabel = $derived(
		Object.fromEntries(accounts.map((account) => [account.label, account]))
	);
</script>

<section class="flex w-full min-w-0 flex-col gap-3 {className}" aria-label="Account balances">
	{#if error}
		<p class="text-center text-sm text-muted-foreground" role="status">{error}</p>
	{/if}

	{#if loading || accounts.length > 0}
		<button
			type="button"
			class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-[border-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus {netWorthSelected
				? 'border-secondary bg-surface-raised shadow-md'
				: 'border-border bg-surface hover:border-secondary focus-visible:border-secondary'}"
			aria-label="Net worth, {netWorthLabel}"
			aria-pressed={netWorthSelected}
			disabled={loading}
			onclick={() => onNetWorthSelect?.()}
		>
			<span class="text-lg leading-none" aria-hidden="true">💰</span>
			<RollingBalanceCounter
				size="lg"
				value={loading ? undefined : (netWorthValue ?? undefined)}
				staticLabel={!loading && netWorthValue == null ? '—' : undefined}
			/>
		</button>

		<div
			class="grid grid-cols-1 gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-0"
		>
			{#each accountCategories as category (category.key)}
				<div class="flex min-w-0 flex-col gap-2 sm:px-3 sm:py-3">
					<h3 class="text-center text-sm font-semibold text-primary">{category.label}</h3>

					<div class="flex flex-col gap-2">
						{#each category.accounts as accountLabel (accountLabel)}
							{@const account = accountsByLabel[accountLabel]}
							{@const icon = account?.icon ?? accountBalanceIcon(accountLabel) ?? ''}
							<AccountBalancePill
								{icon}
								label={accountLabel}
								balance={account ? balanceDisplayAmount(account) : undefined}
								balanceLabel={account?.balanceLabel}
								error={account?.error}
								isDebt={account?.isDebt ?? isDebtAccountLabel(accountLabel)}
								selected={account ? selectedAccountId === account.id : false}
								{loading}
								onselect={() => account && onAccountSelect?.(account.id)}
							/>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if !error}
		<p class="text-center text-sm text-muted-foreground" role="status">
			No account balances to show.
		</p>
	{/if}
</section>
