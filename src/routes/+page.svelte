<script lang="ts">
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/send-to-gemini';
	import { getWelcomeMessage } from '$data/personal-info';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import QuickLink from '$lib/components/QuickLink.svelte';
	import TransactionList from '$lib/components/TransactionList.svelte';
	import WeatherDisplay from '$lib/components/WeatherDisplay.svelte';
	import { quickLinks } from '$lib/quick-links';

	let { data } = $props();

	const welcomeHeading = getWelcomeMessage();

	let prompt = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}
</script>

<div class="relative flex h-full min-h-0 w-full flex-col">
	<div class="absolute start-0 top-0 z-20">
		{#await data.weather}
			<div
				class="h-10 w-28 animate-pulse rounded-full border border-border bg-background/80 shadow-lg sm:h-11 sm:w-32"
				aria-hidden="true"
			></div>
		{:then weather}
			<WeatherDisplay weather={weather.weather} error={weather.weatherError} />
		{/await}
	</div>

	<div class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain">
		<div class="flex min-h-full w-full flex-col justify-center gap-6">
			<h1 class="text-center text-3xl font-medium text-primary sm:text-4xl">
				{welcomeHeading}
			</h1>

			<form class="w-full" onsubmit={handleSubmit}>
				<Input bind:value={prompt}>
					{#snippet leadingIcon()}
						<InputIcon src={geminiIcon} alt="Gemini" />
					{/snippet}
					{#snippet trailingIcon()}
						<InputSubmit />
					{/snippet}
				</Input>
			</form>

			<nav class="flex w-full items-center justify-between gap-1" aria-label="Quick links">
				{#each quickLinks as link (link.href)}
					<QuickLink
						href={link.href}
						icon={link.icon}
						ariaLabel={link.ariaLabel}
						external={link.external}
					/>
				{/each}
			</nav>

			{#await data.finances}
				<div
					class="h-72 w-full shrink-0 animate-pulse rounded-xl border border-border bg-background/80 shadow-lg"
					aria-hidden="true"
				></div>
			{:then finances}
				<TransactionList
					class="w-full shrink-0"
					accounts={finances.accounts}
					balancesError={finances.accountBalancesError}
					transactions={finances.transactions}
					error={finances.transactionsError}
				/>
			{/await}
		</div>
	</div>
</div>
