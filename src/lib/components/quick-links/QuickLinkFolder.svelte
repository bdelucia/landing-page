<script lang="ts">
	import type { QuickLinkFolder } from '$lib/hooks/links/quick-links';
	import QuickLink from './QuickLink.svelte';

	type Props = {
		folder: QuickLinkFolder;
		/** Horizontal anchor for the popup, to keep edge folders on-screen */
		align?: 'start' | 'center' | 'end';
		class?: string;
	};

	let { folder, align = 'center', class: className = '' }: Props = $props();

	let open = $state(false);
	let container = $state<HTMLDivElement>();
	let triggerButton = $state<HTMLButtonElement>();
	let closeTimer = 0;

	const popupId = $derived(`folder-popup-${folder.id}`);
	const previewIcons = $derived(folder.links.slice(0, 4));

	function cancelClose() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = 0;
		}
	}

	function openPopup() {
		cancelClose();
		open = true;
	}

	function scheduleClose() {
		cancelClose();
		closeTimer = window.setTimeout(() => {
			open = false;
		}, 140);
	}

	function closeNow() {
		cancelClose();
		open = false;
	}

	function toggle() {
		if (open) {
			closeNow();
		} else {
			openPopup();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.stopPropagation();
			closeNow();
			triggerButton?.focus();
		}
	}

	function handleFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (next && container?.contains(next)) return;
		closeNow();
	}

	$effect(() => {
		if (!open) return;

		function onPointerDown(event: PointerEvent) {
			if (container && !container.contains(event.target as Node)) {
				closeNow();
			}
		}

		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	});
</script>

<!--
	The wrapper only coordinates pointer/focus affordances for the popup; the
	accessible control is the <button> and the popup links inside it. Escape and
	focus-out handling live here so they work wherever focus sits in the group.
-->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container}
	class="folder {className}"
	onmouseenter={openPopup}
	onmouseleave={scheduleClose}
	onkeydown={handleKeydown}
	onfocusout={handleFocusOut}
>
	<button
		bind:this={triggerButton}
		type="button"
		class="folder-tile focus-visible:outline-focus rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
		class:folder-tile--open={open}
		aria-haspopup="true"
		aria-expanded={open}
		aria-controls={popupId}
		onclick={toggle}
	>
		<span class="folder-tile__thumb shadow-lg">
			{#each previewIcons as item (item.href)}
				<span class="folder-tile__mini">
					{#if item.icon}
						<img src={item.icon} alt="" class="folder-tile__mini-icon" aria-hidden="true" />
					{/if}
				</span>
			{/each}
		</span>
		<span class="folder-tile__label">{folder.label}</span>
	</button>

	<div
		id={popupId}
		class="folder-popup folder-popup--{align}"
		class:folder-popup--open={open}
		role="group"
		aria-label="{folder.label} quick links"
		inert={!open}
		onmouseenter={openPopup}
		onmouseleave={scheduleClose}
	>
		<div class="folder-popup__panel">
			<p class="folder-popup__title">{folder.label}</p>
			<div class="folder-popup__grid">
				{#each folder.links as link (link.href)}
					<QuickLink
						href={link.href}
						ariaLabel={link.ariaLabel}
						icon={link.icon}
						external={link.external}
					/>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.folder {
		position: relative;
		display: inline-flex;
	}

	.folder-tile {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.25rem, 0.125rem + 0.5vw, 0.375rem);
		padding: 0;
		border: 0;
		background: transparent;
		font: inherit;
		cursor: pointer;
	}

	.folder-tile__thumb {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: clamp(0.15rem, 0.05rem + 0.4vw, 0.3rem);
		width: clamp(2.75rem, 2rem + 5vw, 4rem);
		height: clamp(2.75rem, 2rem + 5vw, 4rem);
		padding: clamp(0.3rem, 0.2rem + 0.4vw, 0.45rem);
		border-radius: clamp(0.5rem, 0.35rem + 0.5vw, 0.75rem);
		border: 2px solid var(--color-border);
		background-color: var(--color-background);
		transition: border-color 0.2s ease-in-out;
	}

	.folder:hover .folder-tile__thumb,
	.folder-tile:focus-visible .folder-tile__thumb,
	.folder-tile--open .folder-tile__thumb {
		border-color: var(--color-secondary);
	}

	.folder-tile__mini {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		min-height: 0;
	}

	.folder-tile__mini-icon {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.folder-tile__label {
		font-size: clamp(0.625rem, 0.5rem + 0.35vw, 0.75rem);
		line-height: 1;
		color: var(--color-primary);
	}

	.folder-popup {
		--tx: -50%;

		position: absolute;
		top: 100%;
		left: 50%;
		z-index: 30;
		padding-top: 0.6rem;
		width: max-content;
		max-width: min(20rem, calc(100vw - 1.5rem));
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transform: translate(var(--tx), -0.5rem) scale(0.9);
		transform-origin: top center;
		transition:
			opacity 0.2s ease,
			transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
			visibility 0.22s;
	}

	.folder-popup--start {
		--tx: 0%;

		left: 0;
		transform-origin: top left;
	}

	.folder-popup--end {
		--tx: 0%;

		left: auto;
		right: 0;
		transform-origin: top right;
	}

	.folder-popup--open {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translate(var(--tx), 0) scale(1);
	}

	.folder-popup__panel {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.875rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
		background-color: var(--color-surface);
		box-shadow:
			0 18px 40px -12px rgb(0 0 0 / 55%),
			0 2px 8px rgb(0 0 0 / 30%);
	}

	.folder-popup__title {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}

	.folder-popup__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem 0.625rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.folder-popup {
			transition:
				opacity 0.01ms,
				visibility 0.01ms;
			transform: translate(var(--tx), 0) scale(1);
		}
	}
</style>
