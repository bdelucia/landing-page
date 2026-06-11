<script lang="ts">
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/hooks/gemini/send-to-gemini';
	import { getWelcomeMessage } from '$lib/hooks/greeting/time-of-day-greeting';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import QuickLink from '$lib/components/quick-links/QuickLink.svelte';
	import TransactionList from '$lib/components/transactions/TransactionList.svelte';
	import FinanceAccountList from '$lib/components/finance/FinanceAccountList.svelte';
	import WeatherDisplay from '$lib/components/weather/WeatherDisplay.svelte';
	import WeatherDisplaySkeleton from '$lib/components/weather/WeatherDisplaySkeleton.svelte';
	import { quickLinks } from '$lib/hooks/links/quick-links';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	let { data } = $props();

	type PageView = 'home' | 'finance';

	const welcomeHeading = getWelcomeMessage();

	let prompt = $state('');
	let activeView = $state<PageView>('home');
	let selectedAccountId = $state<string | null>(null);

	function selectAccount(accountId: string) {
		selectedAccountId = selectedAccountId === accountId ? null : accountId;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}

	function showFinance() {
		activeView = 'finance';
	}

	function showHome() {
		activeView = 'home';
		selectedAccountId = null;
	}
</script>

<div class="page" class:page--finance={activeView === 'finance'}>
	<div
		class="weather-slot flex w-full justify-center lg:absolute lg:start-0 lg:top-0 lg:z-20 lg:w-auto lg:justify-start"
	>
		{#await data.weather}
			<WeatherDisplaySkeleton />
		{:then weather}
			<WeatherDisplay weather={weather.weather} error={weather.weatherError} />
		{/await}
	</div>

	{#if activeView === 'home'}
		<div class="home-hub mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl items-center justify-center py-8">
			<div class="home-hub__stack flex w-full flex-col items-center">
				<h1 class="home-hub__greeting text-primary text-center text-3xl font-medium sm:text-4xl">
					{welcomeHeading}
				</h1>

				<form class="home-hub__input w-full" onsubmit={handleSubmit}>
					<Input bind:value={prompt}>
						{#snippet leadingIcon()}
							<InputIcon src={geminiIcon} alt="Gemini" />
						{/snippet}
						{#snippet trailingIcon()}
							<InputSubmit />
						{/snippet}
					</Input>
				</form>

				<nav class="quick-links flex w-full items-center justify-between" aria-label="Quick links">
					{#each quickLinks as link (link.href)}
						<QuickLink
							href={link.href}
							icon={link.icon}
							ariaLabel={link.ariaLabel}
							external={link.external}
						/>
					{/each}
				</nav>

				<div class="section-links">
					<button type="button" class="section-link" onclick={showFinance}>
						Finances
						<ArrowRightIcon class="section-link__icon" aria-hidden="true" />
					</button>
					<button type="button" class="section-link">
						News
						<ArrowRightIcon class="section-link__icon" aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="finance-view">
			<button
				type="button"
				class="finance-view__enter section-link section-link--back self-start"
				style="--enter-index: 0"
				onclick={showHome}
			>
				<ArrowLeftIcon class="section-link__icon" aria-hidden="true" />
				Home
			</button>

			<div class="finance-view__enter finance-view__header" style="--enter-index: 1">
				<h1 class="finance-view__title">Finances</h1>

				{#await data.finances then finances}
					{#if !finances.accountBalancesError && finances.accounts.length > 0}
						<FinanceAccountList
							accounts={finances.accounts}
							{selectedAccountId}
							onAccountSelect={selectAccount}
							inline
						/>
					{/if}
				{/await}
			</div>

			<div class="finance-view__enter finance-view__body" style="--enter-index: 2">
				<TransactionList finances={data.finances} bind:selectedAccountId class="w-full" />
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		position: relative;
		width: 100%;
	}

	.page--finance {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.home-hub {
		flex: 1;
	}

	.home-hub__stack {
		gap: 1.5rem;
	}

	.home-hub__greeting {
		margin-bottom: 0.5rem;
	}

	.home-hub__input {
		max-width: 100%;
	}

	.quick-links {
		gap: clamp(0.125rem, 0.05rem + 0.5vw, 0.25rem);
	}

	.section-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding-top: 0.5rem;
	}

	.section-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border: 0;
		background: transparent;
		padding: 0;
		color: var(--color-primary);
		font: inherit;
		font-size: 0.9375rem;
		line-height: 1.25;
		cursor: pointer;
		transition: color 0.2s ease-in-out;
	}

	.section-link:hover,
	.section-link:focus-visible {
		color: var(--color-secondary);
	}

	.section-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	:global(.section-link__icon) {
		width: 1rem;
		height: 1rem;
	}

	.finance-view {
		--finance-expand-duration: 520ms;
		--finance-expand-ease: cubic-bezier(0.22, 1, 0.36, 1);
		--finance-slide-duration: 480ms;
		--finance-slide-delay: 340ms;
		--finance-slide-stagger: 90ms;

		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 48rem;
		min-height: 0;
		max-height: 100%;
		margin-inline: auto;
		background: var(--color-background);
		border-radius: var(--radius-lg);
		padding: 1.75rem 1.5rem;
		color: var(--color-primary);
		transform-origin: center center;
		overflow: hidden;
		animation: finance-view-expand var(--finance-expand-duration) var(--finance-expand-ease) both;
	}

	.finance-view__enter {
		animation: finance-slide-in var(--finance-slide-duration) var(--finance-expand-ease) both;
		animation-delay: calc(
			var(--finance-slide-delay) + var(--enter-index, 0) * var(--finance-slide-stagger)
		);
	}

	.finance-view__enter:not(.finance-view__body) {
		flex-shrink: 0;
	}

	.finance-view__body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	@keyframes finance-view-expand {
		from {
			opacity: 0;
			transform: scale(0.9);
		}

		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes finance-slide-in {
		from {
			opacity: 0;
			transform: translateY(1.25rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.finance-view,
		.finance-view__enter {
			animation: none;
		}
	}

	.finance-view :global(.finance-panel) {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.finance-view__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem 1.5rem;
		margin: 0;
		flex-wrap: wrap;
	}

	.finance-view__title {
		margin: 0;
		font-size: 1.875rem;
		font-weight: 500;
		line-height: 1.2;
		color: var(--color-primary);
	}

	@media (min-width: 640px) {
		.finance-view {
			padding: 2rem 2.25rem;
		}

		.finance-view__title {
			font-size: 2.25rem;
		}
	}

	.finance-view .section-link {
		color: var(--color-primary);
	}

	.finance-view .section-link:hover,
	.finance-view .section-link:focus-visible {
		color: var(--color-secondary);
	}
</style>
