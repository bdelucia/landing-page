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
	class="block shrink-0 animate-pulse bg-primary/10 {roundedClass} {className}"
	aria-hidden="true"
></span>
