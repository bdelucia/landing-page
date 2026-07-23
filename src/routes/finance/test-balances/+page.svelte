<script lang="ts">
	import FinanceRouteShell from '$lib/components/finance/FinanceRouteShell.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import type { BalanceTestResult } from '$lib/server/plaid/plaid-balance-test';

	let { data } = $props();

	type RunState = 'idle' | 'loading' | 'done' | 'error';

	let runState = $state<RunState>('idle');
	let result = $state<BalanceTestResult | null>(null);
	let runError = $state<string | null>(null);

	const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	function formatBalance(value: number | null): string {
		if (value == null) return '—';
		return money.format(value);
	}

	function formatType(type: string | null, subtype: string | null): string {
		const parts = [subtype, type].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : 'account';
	}

	async function runTest() {
		runState = 'loading';
		runError = null;

		try {
			const response = await fetch('/api/plaid/test-balances', { method: 'POST' });
			const payload = (await response.json()) as BalanceTestResult & { error?: string };

			if (!response.ok || payload.error) {
				throw new Error(payload.error ?? 'Balance test failed');
			}

			result = payload;
			runState = 'done';
		} catch (error) {
			runError = error instanceof Error ? error.message : 'Balance test failed';
			runState = 'error';
		}
	}
</script>

<FinanceRouteShell>
<section class="balance-test">
	<header class="balance-test__header">
		<a href="/finance/relink" class="balance-test__back">
			<ArrowLeftIcon size={16} aria-hidden="true" />
			Back to reconnect
		</a>
		<div class="balance-test__title-row">
			<WalletIcon size={22} aria-hidden="true" class="text-secondary" />
			<div>
				<h1 class="balance-test__title">Test account balances</h1>
				<p class="balance-test__subtitle">
					Fetch live balances from Plaid for every linked institution. This is the real check —
					some banks stay “connected” even when balances would fail.
				</p>
			</div>
		</div>
	</header>

	{#if !data.configured}
		<div class="balance-test__notice" role="status">
			Plaid is not configured. Add your Plaid credentials to <code>secrets.local.ts</code> first.
		</div>
	{:else if !data.linked}
		<div class="balance-test__notice" role="status">
			No linked bank accounts found. Add access tokens to <code>secrets.local.ts</code> first.
		</div>
	{:else}
		<div class="balance-test__actions">
			<button
				type="button"
				class="balance-test__button"
				disabled={runState === 'loading'}
				onclick={runTest}
			>
				{#if runState === 'loading'}
					<LoaderCircleIcon size={16} aria-hidden="true" class="balance-test__spin" />
					Fetching balances…
				{:else}
					<RefreshCwIcon size={16} aria-hidden="true" />
					{runState === 'idle' ? 'Run balance test' : 'Run again'}
				{/if}
			</button>
		</div>

		{#if runError}
			<div class="balance-test__alert" role="alert">{runError}</div>
		{/if}

		{#if result}
			<div
				class="balance-test__summary"
				class:balance-test__summary--ok={result.summary.failed === 0}
				class:balance-test__summary--warn={result.summary.failed > 0}
				role="status"
			>
				{#if result.summary.failed === 0}
					<CheckCircleIcon size={18} aria-hidden="true" />
					All {result.summary.total} institutions returned {result.summary.accountCount} account{result.summary.accountCount === 1 ? '' : 's'}.
				{:else}
					<AlertCircleIcon size={18} aria-hidden="true" />
					{result.summary.passed} of {result.summary.total} institutions passed · {result.summary.failed} failed
				{/if}
				<span class="balance-test__summary-time">
					Tested {new Date(result.fetchedAt).toLocaleString()}
				</span>
			</div>

			<ul class="balance-test__list">
				{#each result.items as item (item.slug)}
					<li class="balance-test__item">
						<div class="balance-test__item-header">
							<div class="balance-test__item-heading">
								<h2 class="balance-test__item-label">{item.label}</h2>
								<span
									class="balance-test__badge"
									class:balance-test__badge--ok={item.ok}
									class:balance-test__badge--fail={!item.ok}
								>
									{item.ok ? 'OK' : 'Failed'}
								</span>
							</div>
							{#if item.itemId}
								<p class="balance-test__item-meta">Item ID: <code>{item.itemId}</code></p>
							{/if}
						</div>

						{#if item.error}
							<p class="balance-test__item-error" role="alert">{item.error}</p>
							<a href="/finance/relink/{item.slug}" class="balance-test__relink-link">
								Reconnect {item.label}
							</a>
						{:else}
							<ul class="balance-test__accounts">
								{#each item.accounts as account (account.accountId)}
									<li class="balance-test__account">
										<div class="balance-test__account-main">
											<p class="balance-test__account-name">
												{account.name}
												{#if account.mask}
													<span class="balance-test__account-mask">···{account.mask}</span>
												{/if}
											</p>
											<p class="balance-test__account-type">
												{formatType(account.type, account.subtype)}
											</p>
										</div>
										<div class="balance-test__account-balances">
											<p class="balance-test__balance">
												<span class="balance-test__balance-label">Current</span>
												{formatBalance(account.balanceCurrent)}
											</p>
											{#if account.balanceAvailable != null}
												<p class="balance-test__balance balance-test__balance--muted">
													<span class="balance-test__balance-label">Available</span>
													{formatBalance(account.balanceAvailable)}
												</p>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>
</FinanceRouteShell>

<style>
	.balance-test {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.balance-test__header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.balance-test__back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.875rem;
		width: fit-content;
		transition: color 0.15s ease;
	}

	.balance-test__back:hover,
	.balance-test__back:focus-visible {
		color: var(--color-secondary);
	}

	.balance-test__back:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.balance-test__title-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.balance-test__title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.balance-test__subtitle {
		margin: 0.35rem 0 0;
		color: var(--color-muted);
		font-size: 0.95rem;
		line-height: 1.5;
		max-width: 58ch;
	}

	.balance-test__notice,
	.balance-test__alert {
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.balance-test__alert {
		border-color: rgb(255 100 100 / 35%);
		color: #ff8a8a;
	}

	.balance-test__actions {
		display: flex;
		gap: 0.75rem;
	}

	.balance-test__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.65rem 1rem;
		border: none;
		border-radius: var(--radius-full);
		background: var(--color-tertiary);
		color: var(--color-primary);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.balance-test__button:hover:not(:disabled) {
		opacity: 0.92;
	}

	.balance-test__button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.balance-test__summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		line-height: 1.45;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.balance-test__summary--ok {
		border-color: rgb(57 255 20 / 25%);
		color: var(--color-income);
	}

	.balance-test__summary--warn {
		border-color: rgb(255 180 80 / 30%);
		color: #ffb84d;
	}

	.balance-test__summary-time {
		color: var(--color-muted);
		font-size: 0.82rem;
	}

	.balance-test__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.balance-test__item {
		padding: 1rem 1.125rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
	}

	.balance-test__item-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.balance-test__item-label {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.balance-test__badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.55rem;
		border-radius: var(--radius-full);
	}

	.balance-test__badge--ok {
		background: rgb(57 255 20 / 12%);
		color: var(--color-income);
	}

	.balance-test__badge--fail {
		background: rgb(255 100 100 / 14%);
		color: #ff8a8a;
	}

	.balance-test__item-meta {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		color: var(--color-muted-foreground);
	}

	.balance-test__item-error {
		margin: 0.65rem 0 0;
		color: #ff8a8a;
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.balance-test__relink-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-secondary);
	}

	.balance-test__accounts {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.balance-test__account {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
	}

	@media (min-width: 560px) {
		.balance-test__account {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.balance-test__account-name {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 500;
	}

	.balance-test__account-mask {
		color: var(--color-muted-foreground);
		font-weight: 400;
	}

	.balance-test__account-type {
		margin: 0.15rem 0 0;
		font-size: 0.78rem;
		color: var(--color-muted-foreground);
		text-transform: capitalize;
	}

	.balance-test__account-balances {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: left;
	}

	@media (min-width: 560px) {
		.balance-test__account-balances {
			text-align: right;
		}
	}

	.balance-test__balance {
		margin: 0;
		font-size: 0.92rem;
		font-variant-numeric: tabular-nums;
	}

	.balance-test__balance--muted {
		color: var(--color-muted-foreground);
		font-size: 0.82rem;
	}

	.balance-test__balance-label {
		color: var(--color-muted-foreground);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-right: 0.35rem;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.85em;
	}

	:global(.balance-test__spin) {
		animation: balance-test-spin 0.9s linear infinite;
	}

	@keyframes balance-test-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.balance-test__spin) {
			animation: none;
		}
	}
</style>
