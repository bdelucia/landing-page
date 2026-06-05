<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.ico';
	import background from '$lib/assets/backgrounds/plane_trail_sky.jpg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<div class="bg" aria-hidden="true">
		<img class="bg-image" src={background} alt="" fetchpriority="high" />
	</div>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		position: relative;
		min-height: 100dvh;
		isolation: isolate;
	}

	.bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.bg-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	.content {
		position: relative;
		z-index: 1;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		padding: 2rem;
	}
</style>
