<script lang="ts">
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/hooks/gemini/send-to-gemini';
	import { getWelcomeMessage } from '$lib/hooks/greeting/time-of-day-greeting';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import QuickLinkFolder from '$lib/components/quick-links/QuickLinkFolder.svelte';
	import TransactionList, {
		type FinancePanel,
		type SpendingView
	} from '$lib/components/transactions/TransactionList.svelte';
	import FinanceAccountList from '$lib/components/finance/FinanceAccountList.svelte';
	import NewsPanel from '$lib/components/news/NewsPanel.svelte';
	import WeatherDisplay from '$lib/components/weather/WeatherDisplay.svelte';
	import WeatherDisplaySkeleton from '$lib/components/weather/WeatherDisplaySkeleton.svelte';
	import { quickLinkFolders } from '$lib/hooks/links/quick-links';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	let { data } = $props();

	type PageView = 'home' | 'finance' | 'news';

	const welcomeHeading = getWelcomeMessage();

	let prompt = $state('');
	let activeView = $state<PageView>('home');
	let financePanel = $state<FinancePanel>('overview');
	let spendingView = $state<SpendingView>('chart');
	let selectedAccountId = $state<string | null>(null);
	let subAccountFilterBankId = $state<string | null>(null);
	let subAccountFilterEnabledIds = $state<string[]>([]);

	function selectAccount(accountId: string | null) {
		selectedAccountId = accountId;
	}

	$effect(() => {
		const bankId = selectedAccountId;

		if (!bankId) {
			subAccountFilterBankId = null;
			subAccountFilterEnabledIds = [];
			return;
		}

		let cancelled = false;

		void data.finances.then((finances) => {
			if (cancelled || selectedAccountId !== bankId) return;

			const accountIds = (finances.bankAccountDetails[bankId]?.accounts ?? []).map(
				(account) => account.id
			);

			if (subAccountFilterBankId !== bankId) {
				subAccountFilterBankId = bankId;
				subAccountFilterEnabledIds = accountIds;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}

	function showFinance() {
		activeView = 'finance';
		financePanel = 'overview';
		spendingView = 'chart';
	}

	function showNews() {
		activeView = 'news';
	}

	function showHome() {
		activeView = 'home';
		financePanel = 'overview';
		spendingView = 'chart';
		selectedAccountId = null;
	}

	function showSpending() {
		financePanel = 'spending';
		spendingView = 'chart';
	}

	function showFinanceOverview() {
		financePanel = 'overview';
		spendingView = 'chart';
	}

	function showSpendingChart() {
		spendingView = 'chart';
	}

	function handleFinanceBack() {
		if (financePanel === 'spending' && spendingView === 'all') {
			showSpendingChart();
			return;
		}

		if (financePanel === 'spending') {
			showFinanceOverview();
			return;
		}

		showHome();
	}

	const financeBackLabel = $derived(
		financePanel === 'spending' && spendingView === 'all'
			? 'Spending'
			: financePanel === 'spending'
				? 'Finances'
				: 'Home'
	);

	const financePageTitle = $derived(
		financePanel === 'spending' && spendingView === 'all'
			? 'Transactions'
			: financePanel === 'spending'
				? 'Spending'
				: 'Finances'
	);
</script>

<div class="page" class:page--finance={activeView !== 'home'}>
	<div
		class="weather-slot flex w-full justify-center lg:absolute lg:start-0 lg:top-0 lg:z-20 lg:w-auto lg:justify-start"
		class:weather-slot--visible={activeView === 'home'}
		class:weather-slot--hidden={activeView !== 'home'}
	>
		{#await data.weather}
			<div class="weather-widget">
				<WeatherDisplaySkeleton />
			</div>
		{:then weather}
			<div class="weather-widget weather-widget--ready">
				<WeatherDisplay weather={weather.weather} error={weather.weatherError} />
			</div>
		{/await}
	</div>

	{#if activeView === 'home'}
		<div class="home-hub mx-auto flex w-full max-w-3xl items-center justify-center py-8">
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

				<nav
					class="quick-links flex w-full items-start justify-between"
					aria-label="Quick link folders"
				>
					{#each quickLinkFolders as folder, index (folder.id)}
						<QuickLinkFolder
							{folder}
							align={index === 0
								? 'start'
								: index === quickLinkFolders.length - 1
									? 'end'
									: 'center'}
						/>
					{/each}
				</nav>

				<div class="section-links">
					<button type="button" class="section-link" onclick={showFinance}>
						Finances
						<ArrowRightIcon class="section-link__icon" aria-hidden="true" />
					</button>
					<button type="button" class="section-link" onclick={showNews}>
						News
						<ArrowRightIcon class="section-link__icon" aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>
	{:else if activeView === 'finance'}
		<div class="finance-view">
			<button
				type="button"
				class="finance-view__enter section-link section-link--back self-start"
				style="--enter-index: 0"
				onclick={handleFinanceBack}
			>
				<ArrowLeftIcon class="section-link__icon" aria-hidden="true" />
				{financeBackLabel}
			</button>

			<div class="finance-view__enter finance-view__header" style="--enter-index: 1">
				<div class="finance-view__title-wrap">
					{#key financePageTitle}
						<h1 class="finance-view__title finance-view__title--enter">
							{financePageTitle}
						</h1>
					{/key}
				</div>

				{#await data.finances then finances}
					{#if !finances.accountBalancesError && finances.accounts.length > 0}
						<FinanceAccountList
							accounts={finances.accounts}
							bankAccountDetails={finances.bankAccountDetails}
							{selectedAccountId}
							bind:subAccountFilterEnabledIds
							subAccountMenuEnabled={financePanel === 'spending'}
							onAccountSelect={selectAccount}
							inline
						/>
					{/if}
				{/await}
			</div>

			<div class="finance-view__enter finance-view__body" style="--enter-index: 2">
				<TransactionList
					finances={data.finances}
					bind:selectedAccountId
					bind:spendingView
					bind:subAccountFilterEnabledIds
					panel={financePanel}
					onViewSpending={showSpending}
					class="w-full"
				/>
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
				<div class="finance-view__title-wrap">
					<h1 class="finance-view__title finance-view__title--enter">News</h1>
				</div>
			</div>

			<div class="finance-view__enter finance-view__body" style="--enter-index: 2">
				<NewsPanel news={data.news} class="w-full" />
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		position: relative;
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		width: 100%;
	}

	.page--finance {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.weather-slot {
		--weather-toggle-duration: 480ms;
		--weather-toggle-ease: cubic-bezier(0.22, 1, 0.36, 1);

		transform-origin: top center;
	}

	.weather-slot--visible {
		animation-name: weather-slot-enter;
		animation-duration: var(--weather-toggle-duration);
		animation-timing-function: var(--weather-toggle-ease);
		animation-fill-mode: both;
	}

	.weather-slot--hidden {
		position: absolute;
		top: 0;
		pointer-events: none;
		animation-name: weather-slot-exit;
		animation-duration: var(--weather-toggle-duration);
		animation-timing-function: var(--weather-toggle-ease);
		animation-fill-mode: both;
	}

	.weather-widget--ready {
		animation: weather-widget-enter 420ms var(--weather-toggle-ease) both;
	}

	@keyframes weather-slot-enter {
		from {
			opacity: 0;
			transform: translateY(-1rem) scale(0.96);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes weather-slot-exit {
		from {
			opacity: 1;
			transform: translateY(0);
		}

		to {
			opacity: 0;
			transform: translateY(-1rem);
		}
	}

	@keyframes weather-widget-enter {
		from {
			opacity: 0;
			transform: scale(0.94);
		}

		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.weather-slot--visible,
		.weather-slot--hidden,
		.weather-widget--ready {
			animation: none;
		}
	}

	.home-hub {
		flex: 1;
	}

	.home-hub__stack {
		gap: 1.5rem;
	}

	.home-hub__greeting {
		--greeting-enter-duration: 520ms;
		--greeting-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);

		margin-bottom: 0.5rem;
		transform-origin: center center;
		animation: home-greeting-enter var(--greeting-enter-duration) var(--greeting-enter-ease) both;
	}

	@keyframes home-greeting-enter {
		from {
			opacity: 0;
			transform: translateY(2.5rem) scale(0.96);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.home-hub__greeting {
			animation: none;
		}
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
		position: relative;
		z-index: 2;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem 1.5rem;
		margin: 0;
		flex-wrap: wrap;
	}

	.finance-view__title-wrap {
		overflow: hidden;
		min-width: 0;
	}

	.finance-view__title {
		margin: 0;
		font-size: 1.875rem;
		font-weight: 500;
		line-height: 1.2;
		color: var(--color-primary);
	}

	.finance-view__title--enter {
		animation: finance-title-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes finance-title-enter {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.finance-view__title--enter {
			animation: none;
		}
	}

	@media (min-width: 640px) {
		.finance-view {
			padding: 2rem 2.25rem;
		}

		.finance-view__title {
			font-size: 2.25rem;
		}
	}

	/* Mobile: finance/news views fill the screen and scroll as a single container */
	@media (max-width: 639px) {
		.page--finance {
			overflow: visible;
		}

		.finance-view {
			--finance-view-scrollbar-thumb: var(--color-secondary);

			flex: 0 0 auto;
			width: auto;
			max-width: none;
			height: 100dvh;
			max-height: none;
			/* Offset the layout's 2rem content padding so the view reaches every edge */
			margin: -2rem;
			border-radius: 0;
			overflow-x: hidden;
			overflow-y: auto;
			scrollbar-gutter: stable;
			scrollbar-width: thin;
			scrollbar-color: var(--finance-view-scrollbar-thumb) transparent;
		}

		.finance-view::-webkit-scrollbar {
			width: 4px;
		}

		.finance-view::-webkit-scrollbar-track {
			margin-block: 0.125rem;
			background: transparent;
		}

		.finance-view::-webkit-scrollbar-thumb {
			border-radius: var(--radius-full);
			background-color: var(--finance-view-scrollbar-thumb);
		}

		.finance-view__body {
			flex: 0 0 auto;
			min-height: auto;
			overflow: visible;
		}

		.finance-view :global(.finance-panel),
		.finance-view :global(.news-panel) {
			flex: 0 0 auto;
			min-height: auto;
			overflow: visible;
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
