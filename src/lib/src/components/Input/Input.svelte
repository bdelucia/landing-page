<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { setInputContext } from './input-context';

	type Props = HTMLInputAttributes & {
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
		...inputProps
	}: Props = $props();

	setInputContext({
		get hasValue() {
			return value.trim().length > 0;
		}
	});
</script>

<div
	class="flex h-16 w-full max-w-3xl items-center gap-4 rounded-full border-2 border-transparent bg-background px-4 transition-[border-color] duration-200 hover:border-secondary focus-within:border-secondary {wrapperClass}"
>
	{#if leadingIcon}
		{@render leadingIcon()}
	{/if}

	<input
		type="text"
		bind:value
		{placeholder}
		class="flex-grow bg-transparent text-xl text-primary placeholder:text-muted-foreground focus:outline-none {inputClass}"
		{...inputProps}
	/>

	{#if trailingIcon}
		{@render trailingIcon()}
	{/if}
</div>
