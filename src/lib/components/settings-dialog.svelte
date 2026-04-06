<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import Check from 'phosphor-svelte/lib/Check';
	import { cn } from '$lib/utils.js';
	import { wallpaperEntries } from '$lib/wallpaper.js';
	import { tick } from 'svelte';

	const APPLY_MIN_MS = 1800;

	function sleep(ms: number) {
		return new Promise<void>((r) => setTimeout(r, ms));
	}

	let {
		open = $bindable(false),
		currentWallpaper = $bindable<string | undefined>(undefined),
		onApply
	}: {
		open?: boolean;
		currentWallpaper?: string | undefined;
		onApply?: (url: string, filename: string) => void | Promise<void>;
	} = $props();

	let selectedUrl = $state<string | undefined>(undefined);
	let applying = $state(false);
	const dirty = $derived(selectedUrl !== undefined && selectedUrl !== currentWallpaper);

	$effect(() => {
		if (open) {
			selectedUrl = currentWallpaper;
		}
	});

	async function handleApply() {
		if (!selectedUrl) return;
		const entry = wallpaperEntries.find((e) => e.url === selectedUrl);
		if (!entry) return;
		applying = true;
		try {
			const started = Date.now();
			await onApply?.(selectedUrl, entry.filename);
			const elapsed = Date.now() - started;
			if (elapsed < APPLY_MIN_MS) await sleep(APPLY_MIN_MS - elapsed);
		} catch {
			applying = false;
			return;
		}
		currentWallpaper = selectedUrl;
		/* Close first so we never drop the overlay while the dialog is still open (avoids a flash). */
		open = false;
		await tick();
		applying = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog bind:open>
	<!--
		Do not put `relative` on DialogContent — tw-merge drops `fixed` in favor of `relative`,
		which breaks `fixed left-1/2 top-1/2 -translate-x/y` centering. Anchor the overlay on
		this inner wrapper instead.
	-->
	<DialogContent class="max-w-xl overflow-hidden sm:max-w-2xl">
		<div class="relative">
			<div
				class="settings-dialog-panel flex flex-col gap-4"
				class:settings-dialog-panel--hidden={applying}
				aria-hidden={applying}
			>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>Personalize your experience.</DialogDescription>
				</DialogHeader>

				<div class="space-y-3">
					<h3 class="text-sm font-medium text-foreground">Wallpaper</h3>
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
						{#each wallpaperEntries as { url, name }}
							{@const selected = selectedUrl === url}
							<button
								type="button"
								class={cn(
									'relative flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors',
									selected ? 'bg-accent ring-2 ring-primary' : 'hover:bg-accent/50'
								)}
								onclick={() => (selectedUrl = url)}
							>
								<div class="relative aspect-video w-full overflow-hidden rounded-md">
									<img
										src={url}
										alt={name}
										class="size-full object-cover"
										loading="lazy"
										draggable="false"
									/>
									{#if selected}
										<div class="absolute inset-0 flex items-center justify-center bg-black/45">
											<Check class="size-5 text-white drop-shadow-md" weight="bold" />
										</div>
									{/if}
								</div>
								<span class={cn('max-w-full truncate text-xs', selected ? 'text-foreground font-medium' : 'text-muted-foreground')}>
									{name}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onclick={handleCancel}>Cancel</Button>
					<Button disabled={!dirty} onclick={handleApply}>Apply</Button>
				</DialogFooter>
			</div>

			<!-- Always in DOM (no {#if} mount flash); painted last. Hides thumbnails from repainting under the spinner. -->
			<div
				class="settings-apply-overlay absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 rounded-lg bg-popover text-popover-foreground"
				class:settings-apply-overlay--off={!applying}
				role="status"
				aria-live="polite"
				aria-busy={applying}
			>
				<Spinner class="size-10 text-primary" aria-hidden="true" />
				<p class="text-sm font-medium text-foreground">Updating wallpaper…</p>
			</div>
		</div>
	</DialogContent>
</Dialog>

<style>
	/* Hide panel while loading so images don’t repaint under the spinner. */
	.settings-dialog-panel--hidden {
		visibility: hidden;
		pointer-events: none;
	}

	.settings-apply-overlay {
		contain: paint;
		isolation: isolate;
		transform: translateZ(0);
	}

	.settings-apply-overlay--off {
		visibility: hidden;
		pointer-events: none;
		opacity: 0;
	}

	.settings-apply-overlay--off :global(svg) {
		animation: none !important;
	}
</style>
