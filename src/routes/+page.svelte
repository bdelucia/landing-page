<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/send-to-gemini';
	import { getWelcomeMessage } from '$data/personal-info';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import QuickLink from '$lib/components/QuickLink.svelte';
	import TransactionList from '$lib/components/TransactionList.svelte';
	import WeatherDisplay from '$lib/components/WeatherDisplay.svelte';
	import { quickLinks } from '$lib/quick-links';
	import SettingsIcon from '~icons/material-symbols/settings-rounded';

	let { data } = $props();

	const welcomeHeading = getWelcomeMessage();

	let prompt = $state('');
	let sheetOpen = $state(false);
	let activePanel = $state<'theming' | 'configuration' | null>(null);

	const panelTitle = $derived(
		activePanel === 'theming'
			? 'Theming'
			: activePanel === 'configuration'
				? 'Configuration'
				: ''
	);

	function openSettingsPanel(panel: 'theming' | 'configuration') {
		activePanel = panel;
		sheetOpen = true;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}
</script>

<div class="relative flex h-full min-h-0 w-full flex-col">
	<div class="absolute start-0 top-0 z-20">
		<WeatherDisplay weather={data.weather} error={data.weatherError} />
	</div>

	<div class="absolute end-0 top-0 z-20">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="inline-flex size-10 items-center justify-center rounded-full border-2 border-transparent bg-background text-primary transition-[border-color] duration-200 ease-in-out hover:border-secondary focus-visible:border-secondary data-[state=open]:border-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
				aria-label="Settings"
			>
				<SettingsIcon aria-hidden="true" class="size-6" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					class="min-w-40 rounded-lg border border-border bg-background p-1 text-sm text-primary shadow-lg outline-none"
					sideOffset={8}
					align="end"
				>
					<DropdownMenu.Item
						class="flex cursor-default select-none items-center rounded-md px-3 py-2 outline-none focus-visible:outline-none data-highlighted:bg-surface-raised"
						onSelect={() => openSettingsPanel('theming')}
					>
						Theming
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="flex cursor-default select-none items-center rounded-md px-3 py-2 outline-none focus-visible:outline-none data-highlighted:bg-surface-raised"
						onSelect={() => openSettingsPanel('configuration')}
					>
						Configuration
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</div>

	<div class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-6">
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

		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
			<TransactionList
				class="w-full"
				transactions={data.transactions}
				error={data.transactionsError}
			/>
		</div>
	</div>
</div>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content class="sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>{panelTitle}</Sheet.Title>
			<Sheet.Description>
				{#if activePanel === 'theming'}
					Customize colors and appearance.
				{:else if activePanel === 'configuration'}
					Adjust app settings and preferences.
				{/if}
			</Sheet.Description>
		</Sheet.Header>
	</Sheet.Content>
</Sheet.Root>
