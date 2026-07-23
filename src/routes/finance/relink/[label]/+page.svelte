<script lang="ts">
	import PlaidRelinkPanel from '$lib/components/finance/PlaidRelinkPanel.svelte';

	let { data } = $props();
</script>

<PlaidRelinkPanel
	configured={data.configured}
	linked={data.linked}
	items={data.items}
	focusSlug={data.focusSlug}
	autoOpen={data.autoOpen}
/>
