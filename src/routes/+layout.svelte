<script>import "../app.css";
import favicon from '$lib/assets/favicon.svg';
import { backgroundUrls, getDailyBackgroundUrl } from '$lib/backgrounds';

let { children } = $props();

const backgroundUrl = $derived(getDailyBackgroundUrl(backgroundUrls));</script>

<svelte:head>
	<link rel="icon" href="{favicon}" />
</svelte:head>

<div class="app-shell">
	{#if backgroundUrl}
		<div class="bg" aria-hidden="true">
			<div class="bg-image" style="background-image: url({backgroundUrl});"></div>
			<div class="bg-scrim"></div>
		</div>
	{/if}
	<div class="content">
		{@render children()}
	</div>
</div>


<style>
	:global(body) {
		margin: 0;
		min-height: 100dvh;
	}

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
		position: absolute;
		inset: -24px;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		opacity: 1;
	}

	.bg-scrim {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 120% 80% at 50% 40%,
			rgba(255, 255, 255, 0.06) 0%,
			rgba(8, 10, 18, 0.35) 55%,
			rgba(4, 6, 12, 0.55) 100%
		);
	}

	.content {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
	}
</style>
