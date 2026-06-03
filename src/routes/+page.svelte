<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/send-to-gemini';
	import { Input, InputIcon, InputSubmit } from '$lib/components/input/index.js';
	import SettingsIcon from '~icons/material-symbols/settings-rounded';

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

<div class="flex h-full w-full flex-col">
	<div class="flex shrink-0 justify-end">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="inline-flex size-10 items-center justify-center rounded-full border-2 border-transparent bg-surface-raised text-primary transition-[border-color] duration-200 ease-in-out hover:border-secondary focus-visible:border-secondary data-[state=open]:border-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
				aria-label="Settings"
			>
				<SettingsIcon aria-hidden="true" class="size-6" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					class="min-w-40 rounded-lg border border-border bg-surface-raised p-1 text-sm text-primary shadow-lg outline-none"
					sideOffset={8}
					align="end"
				>
					<DropdownMenu.Item
						class="flex cursor-default select-none items-center rounded-md px-3 py-2 outline-none focus-visible:outline-none data-highlighted:bg-surface"
						onSelect={() => openSettingsPanel('theming')}
					>
						Theming
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="flex cursor-default select-none items-center rounded-md px-3 py-2 outline-none focus-visible:outline-none data-highlighted:bg-surface"
						onSelect={() => openSettingsPanel('configuration')}
					>
						Configuration
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</div>

	<div class="flex flex-1 flex-col items-center justify-center px-4">
		<div class="flex w-full max-w-3xl flex-col items-center gap-8">
			<h1 class="text-center text-3xl font-medium text-primary sm:text-4xl">
				welcome back Bobbeh...
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
