<script lang="ts">
	import { onMount } from 'svelte';
	import type { PlaidLinkHandler } from '$lib/plaid/plaid-link-client';
	import FinanceRouteShell from '$lib/components/finance/FinanceRouteShell.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import LinkIcon from '@lucide/svelte/icons/link';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	type RelinkItem = {
		label: string;
		slug: string;
		itemId: string | null;
		needsRelink: boolean;
		error: string | null;
	};

	let {
		configured,
		linked,
		items,
		focusSlug = null,
		autoOpen = false
	}: {
		configured: boolean;
		linked: boolean;
		items: RelinkItem[];
		focusSlug?: string | null;
		autoOpen?: boolean;
	} = $props();

	type ItemState = 'idle' | 'loading' | 'linking' | 'success' | 'error';

	let itemStates = $state<Record<string, ItemState>>({});
	let itemMessages = $state<Record<string, string>>({});
	let plaidScriptLoaded = $state(false);
	let plaidHandlers = $state<Record<string, PlaidLinkHandler | null>>({});

	const focusItem = $derived(
		focusSlug ? (items.find((item) => item.slug === focusSlug) ?? null) : null
	);

	onMount(() => {
		if (typeof window === 'undefined') return;

		if (window.Plaid) {
			plaidScriptLoaded = true;
			if (autoOpen && focusItem) {
				void startRelink(focusItem.slug);
			}
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
		script.async = true;
		script.onload = () => {
			plaidScriptLoaded = true;
			if (autoOpen && focusItem) {
				void startRelink(focusItem.slug);
			}
		};
		script.onerror = () => {
			itemMessages = {
				...itemMessages,
				_global: 'Failed to load Plaid Link. Check your network connection.'
			};
		};
		document.head.appendChild(script);
	});

	function setItemState(slug: string, state: ItemState, message = '') {
		itemStates = { ...itemStates, [slug]: state };
		if (message) {
			itemMessages = { ...itemMessages, [slug]: message };
		} else {
			const next = { ...itemMessages };
			delete next[slug];
			itemMessages = next;
		}
	}

	async function startRelink(slug: string) {
		if (!plaidScriptLoaded || !window.Plaid) {
			setItemState(slug, 'error', 'Plaid Link is still loading. Try again in a moment.');
			return;
		}

		plaidHandlers[slug]?.destroy();
		setItemState(slug, 'loading');

		let linkToken: string;
		try {
			const response = await fetch('/api/plaid/link-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slug })
			});
			const payload = (await response.json()) as { linkToken?: string; error?: string };

			if (!response.ok || !payload.linkToken) {
				throw new Error(payload.error ?? 'Failed to create link token');
			}

			linkToken = payload.linkToken;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to start relink';
			setItemState(slug, 'error', message);
			return;
		}

		setItemState(slug, 'linking');

		const handler = window.Plaid.create({
			token: linkToken,
			onSuccess: async (publicToken) => {
				setItemState(slug, 'loading', 'Saving updated credentials…');

				try {
					const response = await fetch('/api/plaid/exchange-public-token', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ publicToken, slug })
					});
					const payload = (await response.json()) as {
						error?: string;
						balanceSnapshot?: { message?: string | null };
					};

					if (!response.ok) {
						throw new Error(payload.error ?? 'Failed to save credentials');
					}

					const snapshotNote = payload.balanceSnapshot?.message
						? ` ${payload.balanceSnapshot.message}`
						: '';
					setItemState(slug, 'success', `Credentials updated.${snapshotNote}`);
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Failed to save credentials';
					setItemState(slug, 'error', message);
				}
			},
			onExit: (error) => {
				if (error?.display_message || error?.error_message) {
					setItemState(
						slug,
						'error',
						error.display_message ?? error.error_message ?? 'Plaid Link closed with an error'
					);
					return;
				}

				if (itemStates[slug] === 'linking') {
					setItemState(slug, 'idle');
				}
			}
		});

		plaidHandlers = { ...plaidHandlers, [slug]: handler };
		handler.open();
	}

	function itemStatusLabel(item: RelinkItem, state: ItemState | undefined): string {
		if (state === 'success') return 'Connected';
		if (state === 'loading' || state === 'linking') return 'Updating…';
		if (state === 'error') return 'Needs attention';
		if (item.needsRelink) return 'Login required';
		if (item.error) return 'Check connection';
		return 'Connected';
	}

	const visibleItems = $derived(focusItem ? [focusItem] : items);
</script>

<FinanceRouteShell>
<section class="relink-panel">
	<header class="relink-panel__header">
		<a href="/" class="relink-panel__back">
			<ArrowLeftIcon size={16} aria-hidden="true" />
			Back to dashboard
		</a>
		<div class="relink-panel__title-row">
			<LinkIcon size={22} aria-hidden="true" class="text-secondary" />
			<div>
				<h1 class="relink-panel__title">
					{focusItem ? `Reconnect ${focusItem.label}` : 'Reconnect bank accounts'}
				</h1>
				<p class="relink-panel__subtitle">
					{focusItem
						? 'Sign in with your updated password. Your accounts and history stay the same.'
						: 'After a password change, reconnect each institution so balances and transactions sync again.'}
				</p>
			</div>
		</div>
	</header>

	{#if !configured}
		<div class="relink-panel__notice" role="status">
			Plaid is not configured. Add your Plaid credentials to <code>secrets.local.ts</code> first.
		</div>
	{:else if !linked}
		<div class="relink-panel__notice" role="status">
			No linked bank accounts found. Add access tokens to <code>secrets.local.ts</code> first.
		</div>
	{:else if itemMessages._global}
		<div class="relink-panel__alert" role="alert">{itemMessages._global}</div>
	{/if}

	{#if linked && visibleItems.length > 0}
		<ul class="relink-panel__list">
			{#each visibleItems as item (item.slug)}
				{@const state = itemStates[item.slug] ?? 'idle'}
				<li class="relink-panel__item">
					<div class="relink-panel__item-main">
						<div class="relink-panel__item-heading">
							<h2 class="relink-panel__item-label">{item.label}</h2>
							<span
								class="relink-panel__badge"
								class:relink-panel__badge--warn={item.needsRelink || state === 'error'}
								class:relink-panel__badge--ok={state === 'success' ||
									(!item.needsRelink && !item.error && state === 'idle')}
							>
								{itemStatusLabel(item, state)}
							</span>
						</div>

						{#if item.error && state !== 'success'}
							<p class="relink-panel__item-error">{item.error}</p>
						{/if}

						{#if itemMessages[item.slug]}
							<p
								class="relink-panel__item-message"
								class:relink-panel__item-message--error={state === 'error'}
								class:relink-panel__item-message--success={state === 'success'}
								role={state === 'error' ? 'alert' : 'status'}
							>
								{#if state === 'success'}
									<CheckCircleIcon size={16} aria-hidden="true" />
								{:else if state === 'error'}
									<AlertCircleIcon size={16} aria-hidden="true" />
								{/if}
								{itemMessages[item.slug]}
							</p>
						{/if}

						<p class="relink-panel__item-meta">
							Route: <code>/finance/relink/{item.slug}</code>
						</p>
					</div>

					<button
						type="button"
						class="relink-panel__button"
						disabled={!plaidScriptLoaded || state === 'loading' || state === 'linking'}
						onclick={() => startRelink(item.slug)}
					>
						{#if state === 'loading' || state === 'linking'}
							<LoaderCircleIcon size={16} aria-hidden="true" class="relink-panel__spin" />
							{state === 'linking' ? 'Complete sign-in…' : 'Starting…'}
						{:else if state === 'success'}
							Reconnect again
						{:else}
							Update login
						{/if}
					</button>
				</li>
			{/each}
		</ul>

		{#if !focusItem && items.length > 1}
			<p class="relink-panel__hint">
				Tip: bookmark a direct link like <code>/finance/relink/{items[0]?.slug}</code> for one bank.
			</p>
		{/if}
	{/if}
</section>
</FinanceRouteShell>

<style>
	.relink-panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.relink-panel__header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.relink-panel__back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.875rem;
		width: fit-content;
		transition: color 0.15s ease;
	}

	.relink-panel__back:hover,
	.relink-panel__back:focus-visible {
		color: var(--color-secondary);
	}

	.relink-panel__back:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.relink-panel__title-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.relink-panel__title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.relink-panel__subtitle {
		margin: 0.35rem 0 0;
		color: var(--color-muted);
		font-size: 0.95rem;
		line-height: 1.5;
		max-width: 52ch;
	}

	.relink-panel__notice,
	.relink-panel__alert {
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.relink-panel__alert {
		border-color: rgb(255 100 100 / 35%);
	}

	.relink-panel__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.relink-panel__item {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 1.125rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
	}

	@media (min-width: 640px) {
		.relink-panel__item {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.relink-panel__item-main {
		min-width: 0;
		flex: 1;
	}

	.relink-panel__item-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.relink-panel__item-label {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.relink-panel__badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.55rem;
		border-radius: var(--radius-full);
		background: rgb(246 245 244 / 8%);
		color: var(--color-muted);
	}

	.relink-panel__badge--warn {
		background: rgb(255 180 80 / 14%);
		color: #ffb84d;
	}

	.relink-panel__badge--ok {
		background: rgb(57 255 20 / 12%);
		color: var(--color-income);
	}

	.relink-panel__item-error {
		margin: 0.45rem 0 0;
		color: #ffb84d;
		font-size: 0.85rem;
		line-height: 1.45;
	}

	.relink-panel__item-message {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		margin: 0.55rem 0 0;
		font-size: 0.85rem;
		line-height: 1.45;
	}

	.relink-panel__item-message--error {
		color: #ff8a8a;
	}

	.relink-panel__item-message--success {
		color: var(--color-income);
	}

	.relink-panel__item-meta {
		margin: 0.55rem 0 0;
		font-size: 0.78rem;
		color: var(--color-muted-foreground);
	}

	.relink-panel__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		flex-shrink: 0;
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

	.relink-panel__button:hover:not(:disabled) {
		opacity: 0.92;
	}

	.relink-panel__button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.relink-panel__hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--color-muted);
		line-height: 1.5;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.85em;
	}

	:global(.relink-panel__spin) {
		animation: relink-spin 0.9s linear infinite;
	}

	@keyframes relink-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.relink-panel__spin) {
			animation: none;
		}
	}
</style>
