<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { tick } from 'svelte';
	import { setInputContext } from './input-context';

	type Props = HTMLTextareaAttributes & {
		value?: string;
		leadingIcon?: Snippet;
		trailingIcon?: Snippet;
		class?: string;
		inputClass?: string;
	};

	let {
		value = $bindable(''),
		placeholder = 'Ask a question...',
		leadingIcon,
		trailingIcon,
		class: wrapperClass = '',
		inputClass = '',
		rows = 1,
		...textareaProps
	}: Props = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let measureEl = $state<HTMLSpanElement | null>(null);
	let leadingEl = $state<HTMLDivElement | null>(null);
	let trailingEl = $state<HTMLDivElement | null>(null);
	let iconsStacked = $state(false);

	const hasLeading = $derived(!!leadingIcon);
	const hasTrailing = $derived(!!trailingIcon);

	setInputContext({
		get hasValue() {
			return value.trim().length > 0;
		}
	});

	function getInlineAvailableWidth(container: HTMLDivElement): number {
		const style = getComputedStyle(container);
		const padding =
			parseFloat(style.paddingLeft) +
			parseFloat(style.paddingRight);
		const gap = parseFloat(style.columnGap || style.gap) || 16;

		const leadingW = leadingEl?.offsetWidth ?? 0;
		const trailingW = trailingEl?.offsetWidth ?? 0;

		let gaps = 0;
		if (hasLeading && hasTrailing) gaps = gap * 2;
		else if (hasLeading || hasTrailing) gaps = gap;

		return container.clientWidth - padding - leadingW - trailingW - gaps;
	}

	function getLineHeight(textarea: HTMLTextAreaElement): number {
		const style = getComputedStyle(textarea);
		const lineHeight = parseFloat(style.lineHeight);
		if (!Number.isNaN(lineHeight)) return lineHeight;
		return parseFloat(style.fontSize) * 1.2;
	}

	function syncTextareaHeight(textarea: HTMLTextAreaElement) {
		if (iconsStacked) {
			textarea.style.height = 'auto';
			textarea.style.height = `${textarea.scrollHeight}px`;
		} else {
			textarea.style.height = '';
		}
	}

	async function updateLayout() {
		const container = containerEl;
		const textarea = textareaEl;
		const measure = measureEl;
		if (!container || !textarea || !measure) return;

		if (!value) {
			iconsStacked = false;
			textarea.style.height = '';
			return;
		}

		measure.textContent = value;
		const textWidth = measure.offsetWidth;
		const availableInline = getInlineAvailableWidth(container);
		const lineHeight = getLineHeight(textarea);
		const multiline =
			textarea.scrollHeight > lineHeight + 2 || value.includes('\n');

		iconsStacked = textWidth >= availableInline - 1 || multiline;

		await tick();
		syncTextareaHeight(textarea);
	}

	function handleInput() {
		void updateLayout();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			textareaEl?.form?.requestSubmit();
		}
	}

	$effect(() => {
		void value;
		void placeholder;
		void hasLeading;
		void hasTrailing;

		const container = containerEl;
		if (!container) return;

		let frame = 0;
		const observer = new ResizeObserver(() => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => void updateLayout());
		});
		observer.observe(container);

		void updateLayout();

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={containerEl}
	class="input-shell w-full max-w-3xl border-2 border-transparent bg-background hover:border-secondary focus-within:border-secondary {wrapperClass}"
	class:input-shell--stacked={iconsStacked}
	class:input-shell--leading={hasLeading}
	class:input-shell--trailing={hasTrailing}
>
	{#if leadingIcon}
		<div bind:this={leadingEl} class="input-adornment input-adornment--leading">
			{@render leadingIcon()}
		</div>
	{/if}

	<textarea
		bind:this={textareaEl}
		bind:value
		{placeholder}
		{rows}
		class="input-field min-w-0 resize-none bg-transparent text-primary placeholder:text-muted-foreground focus:outline-none {inputClass}"
		class:input-field--stacked={iconsStacked}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{...textareaProps}
	></textarea>

	{#if trailingIcon}
		<div bind:this={trailingEl} class="input-adornment input-adornment--trailing">
			{@render trailingIcon()}
		</div>
	{/if}

	<span bind:this={measureEl} class="input-measure" aria-hidden="true"></span>
</div>

<style>
	.input-shell {
		display: grid;
		min-height: clamp(2.75rem, 2rem + 2.5vw, 4rem);
		align-items: center;
		column-gap: clamp(0.5rem, 0.25rem + 1vw, 1rem);
		row-gap: clamp(0.5rem, 0.35rem + 0.5vw, 0.75rem);
		padding-inline: clamp(0.625rem, 0.25rem + 1.5vw, 1rem);
		/* Half of min-height — interpolates cleanly to stacked radius (not 9999px) */
		border-radius: clamp(1.25rem, 0.5rem + 3vw, 2rem);
		transition:
			border-color 0.2s ease,
			border-radius 0.28s cubic-bezier(0.22, 1, 0.36, 1);
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas: 'leading field trailing';
	}

	@media (prefers-reduced-motion: reduce) {
		.input-shell {
			transition: border-color 0.2s ease;
		}
	}

	.input-shell--stacked {
		align-items: start;
		border-radius: clamp(0.875rem, 0.5rem + 1.5vw, 1rem);
		padding: clamp(1rem, 0.75rem + 1.5vw, 1.5rem) clamp(1rem, 0.75rem + 1.5vw, 1.5rem)
			clamp(0.75rem, 0.5rem + 1vw, 1.125rem);
		row-gap: clamp(0.875rem, 0.5rem + 1.5vw, 1.25rem);
	}

	.input-shell--stacked .input-adornment--leading,
	.input-shell--stacked .input-adornment--trailing {
		align-self: end;
	}

	.input-shell--stacked.input-shell--leading.input-shell--trailing,
	.input-shell--stacked.input-shell--leading:not(.input-shell--trailing),
	.input-shell--stacked:not(.input-shell--leading).input-shell--trailing {
		grid-template-areas:
			'field field field'
			'leading . trailing';
	}

	.input-shell--stacked:not(.input-shell--leading).input-shell--trailing {
		grid-template-areas:
			'field field field'
			'. . trailing';
	}

	.input-shell--stacked.input-shell--leading:not(.input-shell--trailing) {
		grid-template-areas:
			'field field field'
			'leading . .';
	}

	.input-shell--stacked:not(.input-shell--leading):not(.input-shell--trailing) {
		grid-template-areas: 'field';
	}

	.input-shell:not(.input-shell--stacked):not(.input-shell--leading) {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'field trailing';
	}

	.input-shell:not(.input-shell--stacked):not(.input-shell--trailing) {
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-areas: 'leading field';
	}

	.input-shell:not(.input-shell--stacked):not(.input-shell--leading):not(
			.input-shell--trailing
		) {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'field';
	}

	.input-adornment--leading {
		grid-area: leading;
	}

	.input-adornment--trailing {
		grid-area: trailing;
	}

	.input-field {
		grid-area: field;
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		font-size: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
		line-height: 1.4;
	}

	.input-field--stacked {
		overflow: hidden;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: break-word;
		line-height: 1.5;
		padding: 0;
		vertical-align: top;
	}

	.input-adornment {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
	}

	.input-measure {
		position: absolute;
		visibility: hidden;
		height: auto;
		width: auto;
		white-space: pre;
		pointer-events: none;
		font-size: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
		line-height: 1.4;
	}
</style>
