<script lang="ts">
	import type { AccountBalanceItem } from '$lib/hooks/finances/account-balances';
	import type { BankAccountDetailsByItem } from '$lib/hooks/finances/bank-accounts';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let {
		accounts = [],
		bankAccountDetails = {},
		selectedAccountId = null,
		subAccountFilterEnabledIds = $bindable<string[]>([]),
		onAccountSelect,
		subAccountMenuEnabled = false,
		inline = false,
		class: className = ''
	}: {
		accounts?: AccountBalanceItem[];
		bankAccountDetails?: BankAccountDetailsByItem;
		selectedAccountId?: string | null;
		subAccountFilterEnabledIds?: string[];
		onAccountSelect?: (accountId: string | null) => void;
		subAccountMenuEnabled?: boolean;
		inline?: boolean;
		class?: string;
	} = $props();

	let openDropdownBankId = $state<string | null>(null);
	let accountFilterRef = $state<HTMLDivElement | null>(null);

	function subAccountsForBank(bankId: string) {
		return bankAccountDetails[bankId]?.accounts ?? [];
	}

	function hasMultipleSubAccounts(bankId: string): boolean {
		return subAccountsForBank(bankId).length > 1;
	}

	function subAccountMenuId(bankId: string) {
		return `finance-subaccount-filter-${bankId}`;
	}

	function handleAllAccountsClick() {
		onAccountSelect?.(null);
		openDropdownBankId = null;
	}

	function handleAccountClick(bankId: string) {
		if (selectedAccountId !== bankId) {
			onAccountSelect?.(bankId);
			openDropdownBankId = null;
			return;
		}

		if (subAccountMenuEnabled && hasMultipleSubAccounts(bankId)) {
			openDropdownBankId = openDropdownBankId === bankId ? null : bankId;
			return;
		}

		onAccountSelect?.(null);
		openDropdownBankId = null;
	}

	function toggleSubAccountFilterAccount(accountId: string, checked: boolean) {
		subAccountFilterEnabledIds = checked
			? subAccountFilterEnabledIds.includes(accountId)
				? subAccountFilterEnabledIds
				: [...subAccountFilterEnabledIds, accountId]
			: subAccountFilterEnabledIds.filter((id) => id !== accountId);
	}

	$effect(() => {
		void selectedAccountId;
		openDropdownBankId = null;
	});

	$effect(() => {
		if (!openDropdownBankId) return;

		const close = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && accountFilterRef?.contains(target)) return;
			openDropdownBankId = null;
		};

		document.addEventListener('pointerdown', close);
		return () => document.removeEventListener('pointerdown', close);
	});
</script>

<div class="finance-accounts-wrap" class:finance-accounts-wrap--inline={inline} bind:this={accountFilterRef}>
	<nav
		class="finance-accounts {className}"
		class:finance-accounts--inline={inline}
		aria-label="Accounts"
	>
		{#if !inline}
			<h2 class="finance-accounts__heading">Accounts</h2>
		{/if}

		<ul class="finance-accounts__list">
			<li>
				<button
					type="button"
					class="finance-accounts__item"
					data-selected={selectedAccountId === null}
					aria-pressed={selectedAccountId === null}
					onclick={handleAllAccountsClick}
				>
					All accounts
				</button>
			</li>
			{#each accounts as account (account.id)}
				{@const isSelected = selectedAccountId === account.id}
				{@const hasMultiple = subAccountMenuEnabled && hasMultipleSubAccounts(account.id)}
				{@const isDropdownOpen = openDropdownBankId === account.id}
				<li class="finance-accounts__item-wrap">
					<button
						type="button"
						class="finance-accounts__item"
						data-selected={isSelected}
						aria-pressed={isSelected}
						aria-expanded={isSelected && hasMultiple ? isDropdownOpen : undefined}
						aria-controls={isSelected && hasMultiple ? subAccountMenuId(account.id) : undefined}
						aria-haspopup={isSelected && hasMultiple ? 'true' : undefined}
						onclick={() => handleAccountClick(account.id)}
					>
						<span>{account.label}</span>
						{#if isSelected && hasMultiple}
							<span
								class="finance-accounts__item-chevron"
								class:finance-accounts__item-chevron--open={isDropdownOpen}
								aria-hidden="true"
							>
								<ChevronDownIcon />
							</span>
						{/if}
					</button>

					{#if isSelected && hasMultiple && isDropdownOpen}
						<div
							id={subAccountMenuId(account.id)}
							class="finance-accounts__subaccount-menu"
							role="group"
							aria-label="Filter {account.label} accounts"
						>
							{#each subAccountsForBank(account.id) as subAccount (subAccount.id)}
								<label class="finance-accounts__subaccount-option">
									<input
										type="checkbox"
										class="finance-accounts__subaccount-toggle"
										checked={subAccountFilterEnabledIds.includes(subAccount.id)}
										onchange={(event) =>
											toggleSubAccountFilterAccount(
												subAccount.id,
												event.currentTarget.checked
											)}
									/>
									<span class="finance-accounts__subaccount-label">
										{subAccount.typeLabel}
									</span>
								</label>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	.finance-accounts-wrap {
		display: flex;
	}

	.finance-accounts-wrap--inline {
		margin-inline-start: auto;
	}

	.finance-accounts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.finance-accounts--inline {
		flex-direction: row;
		align-items: baseline;
		justify-content: flex-end;
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

	.finance-accounts__item-wrap {
		position: relative;
	}

	.finance-accounts__item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
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

	.finance-accounts__item-chevron {
		display: inline-flex;
		width: 0.875rem;
		height: 0.875rem;
		color: var(--color-muted-foreground);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.finance-accounts__item[data-selected='true'] .finance-accounts__item-chevron {
		color: var(--color-secondary);
	}

	.finance-accounts__item-chevron :global(svg) {
		width: 100%;
		height: 100%;
	}

	.finance-accounts__item-chevron--open {
		transform: rotate(180deg);
	}

	.finance-accounts__subaccount-menu {
		position: absolute;
		z-index: 40;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 12rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
		padding: 0.375rem;
		box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
	}

	.finance-accounts__subaccount-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.finance-accounts__subaccount-option:hover {
		background: color-mix(in srgb, var(--color-muted) 8%, transparent);
	}

	.finance-accounts__subaccount-label {
		font-size: 0.875rem;
		line-height: 1.25;
		color: var(--color-primary);
		min-width: 0;
	}

	.finance-accounts__subaccount-toggle {
		appearance: none;
		position: relative;
		width: 2rem;
		height: 1.125rem;
		border-radius: var(--radius-full);
		background: var(--color-border);
		flex-shrink: 0;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.finance-accounts__subaccount-toggle::before {
		content: '';
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 50%;
		background: var(--color-background);
		transition: transform 0.15s ease;
	}

	.finance-accounts__subaccount-toggle:checked {
		background: var(--color-secondary);
	}

	.finance-accounts__subaccount-toggle:checked::before {
		transform: translateX(0.875rem);
	}

	.finance-accounts__subaccount-toggle:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
