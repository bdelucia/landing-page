<script lang="ts">
	let {
		class: className = '',
		rounded = 'md'
	}: {
		class?: string;
		rounded?: 'md' | 'full' | 'lg';
	} = $props();

	const roundedClass = $derived(
		{
			md: 'rounded-md',
			full: 'rounded-full',
			lg: 'rounded-lg'
		}[rounded]
	);
</script>

<span
	class="bg-primary/10 block shrink-0 animate-pulse {roundedClass} {className}"
	aria-hidden="true"
></span>
