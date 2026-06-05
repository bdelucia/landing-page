<script lang="ts">
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/send-to-gemini';
	import { getWelcomeMessage } from '$data/personal-info';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import QuickLink from '$lib/components/QuickLink.svelte';
	import TransactionList from '$lib/components/TransactionList.svelte';
	import TransactionListSkeleton from '$lib/components/TransactionListSkeleton.svelte';
	import WeatherDisplay from '$lib/components/WeatherDisplay.svelte';
	import WeatherDisplaySkeleton from '$lib/components/WeatherDisplaySkeleton.svelte';
	import { quickLinks } from '$lib/quick-links';

	let { data } = $props();

	const welcomeHeading = getWelcomeMessage();

	let prompt = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}
</script>

<div class="relative w-full">
	<div
		class="mx-auto flex w-full max-w-3xl min-h-[calc(100dvh-4rem)] flex-col justify-center gap-6 py-8"
	>
		<div class="weather-slot flex w-full justify-center lg:absolute lg:start-0 lg:top-0 lg:z-20 lg:w-auto lg:justify-start">
			{#await data.weather}
				<WeatherDisplaySkeleton />
			{:then weather}
				<WeatherDisplay weather={weather.weather} error={weather.weatherError} />
			{/await}
		</div>

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

		{#await data.finances}
			<TransactionListSkeleton class="w-full shrink-0" />
		{:then finances}
			<TransactionList
				class="w-full shrink-0"
				accounts={finances.accounts}
				balancesError={finances.accountBalancesError}
				bankAccountDetails={finances.bankAccountDetails}
				transactions={finances.transactions}
				error={finances.transactionsError}
			/>
		{/await}
	</div>
</div>

<style>
	.quick-links {
		gap: clamp(0.125rem, 0.05rem + 0.5vw, 0.25rem);
	}
</style>
