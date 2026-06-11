<script lang="ts">
	import type { AccountBalanceItem } from '$lib/hooks/finances/account-balances';

	let {
		accounts = [],
		selectedAccountId = null,
		onAccountSelect,
		inline = false,
		class: className = ''
	}: {
		accounts?: AccountBalanceItem[];
		selectedAccountId?: string | null;
		onAccountSelect?: (accountId: string) => void;
		inline?: boolean;
		class?: string;
	} = $props();
</script>

<nav
	class="finance-accounts {className}"
	class:finance-accounts--inline={inline}
	aria-label="Accounts"
>
	{#if !inline}
		<h2 class="finance-accounts__heading">Accounts</h2>
	{/if}

	<ul class="finance-accounts__list">
		{#each accounts as account (account.id)}
			<li>
				<button
					type="button"
					class="finance-accounts__item"
					data-selected={selectedAccountId === account.id}
					aria-pressed={selectedAccountId === account.id}
					onclick={() => onAccountSelect?.(account.id)}
				>
					{account.label}
				</button>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.finance-accounts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.finance-accounts--inline {
		flex-direction: row;
		align-items: baseline;
		justify-content: flex-end;
		margin-inline-start: auto;
	}

	.finance-accounts__heading {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}

	.finance-accounts__list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.finance-accounts--inline .finance-accounts__list {
		justify-content: flex-end;
		gap: 0.375rem 1rem;
	}

	.finance-accounts__item {
		border: 0;
		background: transparent;
		padding: 0;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.9375rem;
		line-height: 1.4;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.finance-accounts--inline .finance-accounts__item {
		font-size: 0.875rem;
	}

	.finance-accounts__item:hover,
	.finance-accounts__item:focus-visible {
		color: var(--color-primary);
	}

	.finance-accounts__item[data-selected='true'] {
		color: var(--color-secondary);
	}

	.finance-accounts__item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
</style>
