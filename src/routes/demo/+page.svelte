<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	/** Placeholder art (add files under `static/assets/` to match the original demo). */
	const bgImages = [
		'https://picsum.photos/seed/liquidgl0/1600/1000',
		'https://picsum.photos/seed/liquidgl1/1600/1000',
		'https://picsum.photos/seed/liquidgl2/1600/1000',
		'https://picsum.photos/seed/liquidgl3/1600/1000',
		'https://picsum.photos/seed/liquidgl4/1600/1000'
	];

	function loadScript(src: string, integrity?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) {
				resolve();
				return;
			}
			const s = document.createElement('script');
			s.src = src;
			s.async = false;
			s.crossOrigin = 'anonymous';
			if (integrity) s.integrity = integrity;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error(`Failed to load ${src}`));
			document.head.appendChild(s);
		});
	}

	onMount(() => {
		if (!browser) return;

		let cancelled = false;

		async function boot() {
			await loadScript(
				'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
				'sha384-HOvlOYPIs/zjoIkWUGXkVmXsjr8GuZLV+Q+rcPwmJOVZVpvTSXQChiN4t9Euv9Vc'
			);
			await loadScript(
				'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
				'sha384-P8VzCVnT9NBUkMrpcIZrJbA7EBjJvh/fJS6PmP+4nLIM284DtsImIv8D0fFjIkeh'
			);
			await loadScript(
				'https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.min.js',
				'sha384-Acb30yI/vfD0avseYDdQ569JquIZO1ofi2uyltUYzH7CvCSm6bX4L3VGqbj7fTBS'
			);
			await loadScript(
				'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
				'sha384-li4UtcFCH6QeUqR4JyV58/VgTprMuz9aauj+oWtew7V4Y7ZVjnvz5px9Y3UCG0Ea'
			);
			await loadScript(
				'https://code.jquery.com/jquery-3.7.1.min.js',
				'sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs'
			);
			await loadScript(
				'https://cdn.jsdelivr.net/npm/jquery.ripples@0.6.3/dist/jquery.ripples.min.js',
				'sha384-C38Bo9dzWIuuaYEd6arYPKe6K8fk4+SvHcmLhtHPHAPILd+/5Oz5IB2Es8lwdB8O'
			);

			while (
				!cancelled &&
				(typeof window.html2canvas !== 'function' || typeof window.liquidGL !== 'function')
			) {
				await new Promise((r) => setTimeout(r, 50));
			}
			if (cancelled) return;

			const navToggle = document.querySelector<HTMLButtonElement>('.demo-nav .nav-toggle');
			const navContainer = document.querySelector<HTMLElement>('.demo-nav .nav-container');

			if (navToggle && navContainer) {
				navToggle.addEventListener('click', () => {
					const isExpanded = navContainer.classList.contains('expanded');
					navContainer.classList.toggle('expanded');
					navToggle.setAttribute('aria-expanded', String(!isExpanded));
				});

				document.addEventListener('click', (e) => {
					if (!navContainer.contains(e.target as Node)) {
						navContainer.classList.remove('expanded');
						navToggle.setAttribute('aria-expanded', 'false');
					}
				});

				document.addEventListener('keydown', (e) => {
					if (e.key === 'Escape' && navContainer.classList.contains('expanded')) {
						navContainer.classList.remove('expanded');
						navToggle.setAttribute('aria-expanded', 'false');
					}
				});
			}

			function resetLiquidGLRenderer() {
				const r = window.__liquidGLRenderer__;
				if (r?.canvas) r.canvas.remove();
				delete window.__liquidGLRenderer__;
			}

			function initializeliquidGL() {
				resetLiquidGLRenderer();

				const glassEffect = window.liquidGL!({
					snapshot: 'body',
					target: '.demo-page .menu-wrap',
					resolution: 2,
					refraction: 0,
					bevelDepth: 0.052,
					bevelWidth: 0.211,
					frost: 2,
					shadow: true,
					specular: true,
					tilt: false,
					tiltFactor: 5,
					reveal: 'fade'
				});

				const lensList = Array.isArray(glassEffect) ? glassEffect : [glassEffect];
				const firstLens = lensList[0];

				const Lil = (window as unknown as { lil?: { GUI: new () => { addFolder: (n: string) => Record<string, unknown> } } })
					.lil;
				if (firstLens && Lil?.GUI) {
					const gui = new Lil.GUI();
					const glassFolder = gui.addFolder('liquidGL Effect') as {
						add: (...args: unknown[]) => { onChange: (fn: (v: unknown) => void) => unknown };
						close: () => void;
					};

					const updateAll = (key: string, value: unknown) => {
						lensList.forEach((ln) => {
							if (!ln) return;
							(ln.options as Record<string, unknown>)[key] = value;
							if (key === 'shadow') ln.setShadow(value as boolean);
							if (key === 'tilt') ln.setTilt(value as boolean);
						});
					};

					glassFolder
						.add(firstLens.options, 'refraction', 0, 0.1, 0.001)
						.onChange((v: unknown) => updateAll('refraction', v));
					glassFolder
						.add(firstLens.options, 'bevelDepth', 0, 0.2, 0.001)
						.onChange((v: unknown) => updateAll('bevelDepth', v));
					glassFolder
						.add(firstLens.options, 'bevelWidth', 0, 0.5, 0.001)
						.onChange((v: unknown) => updateAll('bevelWidth', v));
					glassFolder.add(firstLens.options, 'frost', 0, 10, 0.1).onChange((v: unknown) => updateAll('frost', v));
					glassFolder.add(firstLens.options, 'magnify', 1, 5, 0.1).onChange((v: unknown) => updateAll('magnify', v));
					glassFolder.add(firstLens.options, 'shadow').onChange((v: unknown) => updateAll('shadow', v));
					glassFolder.add(firstLens.options, 'specular').onChange((v: unknown) => updateAll('specular', v));
					glassFolder.add(firstLens.options, 'tilt').onChange((v: unknown) => updateAll('tilt', v));
					glassFolder
						.add(firstLens.options, 'tiltFactor', 0, 25, 0.1)
						.onChange((v: unknown) => updateAll('tiltFactor', v));
					glassFolder
						.add(firstLens.options, 'reveal', ['none', 'fade'])
						.onChange((v: unknown) => updateAll('reveal', v));
					glassFolder.close();
				}
			}

			initializeliquidGL();

			const jq = window.jQuery;
			if (jq) {
				jq('.demo-page .ripples').each(function (this: HTMLElement) {
					jq(this).ripples({
						resolution: 512,
						dropRadius: 20,
						perturbance: 0.04,
						interactive: true
					});
				});
			}

			function syncScroll() {
				window.liquidGL?.syncWith?.({});
			}
			if (document.readyState === 'complete') {
				syncScroll();
			} else {
				window.addEventListener('load', syncScroll, { once: true });
			}
		}

		void boot();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		if (!browser) return;
		const r = window.__liquidGLRenderer__;
		if (r?.canvas) r.canvas.remove();
		delete window.__liquidGLRenderer__;
		document.querySelector('.lil-gui')?.remove();
	});
</script>

<svelte:head>
	<title>Demo 1 – liquidGL (SvelteKit)</title>
	<meta name="description" content="liquidGL demo ported from demos/demo-1.html" />
</svelte:head>

<div class="demo-page">
	<nav class="global-nav demo-nav" aria-label="Demo navigation">
		<div class="nav-container">
			<button
				class="nav-toggle"
				type="button"
				aria-expanded="false"
				aria-label="Toggle navigation menu"
			>
				<span>Demos</span>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M8 11L3 6h10l-5 5z" />
				</svg>
			</button>
			<div class="nav-menu">
				<a href="/" class="nav-item">Home</a>
				<a href="/demo" class="nav-item active">D1 – Nav bar</a>
			</div>
		</div>
	</nav>

	<div class="ripples" aria-hidden="true"></div>

	<div class="main-content">
		{#each bgImages as src, i}
			<div class="image-container">
				<img src={src} alt="" loading={i < 2 ? 'eager' : 'lazy'} />
			</div>
		{/each}
	</div>

	<div class="menu-anchor">
		<a
			href="https://github.com/naughtyduk/liquidGL"
			class="menu-link-wrapper"
			target="_blank"
			rel="noopener noreferrer"
		>
			<div class="menu-wrap">
				<div class="menu-logo-wrap">
					<span class="menu-logo-fallback" aria-hidden="true">liquidGL</span>
				</div>
				<div class="menu-items-wrap">
					<div class="menu-item-stack">
						<p class="menu-item-text">liquidGL by NaughtyDuk©</p>
						<div class="download-wrapper">
							<div class="download-link">
								<span class="download-icon" aria-hidden="true">↓</span>
								<p class="small-text-link">Download</p>
							</div>
							<p class="version-text">v1.0.0</p>
						</div>
					</div>
				</div>
			</div>
		</a>
	</div>
</div>

<style>
	:global(html.demo-liquid-page) {
		scroll-behavior: auto;
	}

	.demo-page {
		--text-color: #333333;
		--bg-color: #f0f0f0;
		box-sizing: border-box;
		margin: 0;
		min-height: 100dvh;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background-color: var(--bg-color);
		color: var(--text-color);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		line-height: 1.5;
	}

	.demo-page *,
	.demo-page *::before,
	.demo-page *::after {
		box-sizing: border-box;
	}

	.global-nav {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 10000;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	.nav-container {
		background: rgb(9 9 11 / 85%);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		border: 0.5px solid #1e1e20;
		overflow: hidden;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 16px rgb(0 0 0 / 20%);
	}

	.nav-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: transparent;
		border: none;
		color: #fafafa;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		width: 100%;
		text-align: left;
		transition: all 0.2s ease;
	}

	.nav-toggle:hover {
		background: rgb(39 39 42 / 50%);
	}

	.nav-toggle svg {
		width: 16px;
		height: 16px;
		fill: currentColor;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.nav-container.expanded) .nav-toggle svg {
		transform: rotate(180deg);
	}

	.nav-menu {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.nav-container.expanded) .nav-menu {
		max-height: 300px;
	}

	.nav-item {
		display: block;
		padding: 10px 16px;
		color: #a1a1aa;
		text-decoration: none;
		font-size: 13px;
		font-weight: 400;
		transition: all 0.2s ease;
		border-top: 0.5px solid #1e1e20;
		position: relative;
		cursor: pointer;
	}

	.nav-item:hover {
		background: rgb(39 39 42 / 50%);
		color: #fafafa;
	}

	.nav-item.active {
		color: #fafafa;
		background: rgb(39 39 42 / 30%);
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: #fafafa;
	}

	.image-container {
		overflow: clip;
		position: relative;
		z-index: 1;
		transform: translate3d(0, 0, 0);
		height: 100svh;
		padding: 5vw;
		background: #ececec;
	}

	.image-container img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		will-change: transform;
		border-radius: 2.5vw;
	}

	.menu-anchor {
		z-index: 9999;
		justify-content: center;
		align-items: center;
		display: flex;
		position: fixed;
		inset: 0;
		pointer-events: none;
		mix-blend-mode: difference;
	}

	.menu-anchor a {
		pointer-events: auto;
		text-decoration: none;
	}

	.menu-link-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.menu-wrap {
		display: flex;
		align-items: center;
		padding: 1rem;
		gap: 1rem;
		border-radius: 1.5vw;
		justify-content: flex-start;
		position: relative;
		overflow: clip;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px) saturate(180%);
		will-change: transform;
	}

	.menu-item-stack {
		display: flex;
		flex-direction: column;
	}

	.menu-logo-wrap,
	.menu-items-wrap,
	.menu-item-text {
		z-index: 3;
	}

	.menu-items-wrap {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.menu-item-text {
		color: #b7b7b7;
		font-weight: 700;
		letter-spacing: -0.04rem;
	}

	.small-text-link {
		font-size: 0.8rem;
		color: #b7b7b7;
		font-weight: 600;
		letter-spacing: -0.02rem;
		margin: 0;
	}

	.menu-logo-fallback {
		display: inline-block;
		font-weight: 800;
		font-size: 0.85rem;
		color: #b7b7b7;
		letter-spacing: -0.03em;
	}

	.download-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.download-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
	}

	.download-icon {
		font-size: 0.75rem;
		line-height: 1;
		opacity: 0.85;
	}

	.version-text {
		font-size: 0.75rem;
		color: #b7b7b7;
		letter-spacing: 0.02rem;
		font-weight: 500;
		margin: 0;
	}

	.ripples {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		filter: invert(1);
		opacity: 0.3;
		pointer-events: auto;
	}

	:global(.lil-gui) {
		--focus-color: #f5f5f5;
		--number-color: #f5f5f5;
	}

	:global(.lil-gui.autoPlace) {
		z-index: 10000;
	}

	@media (max-width: 768px) {
		.global-nav {
			top: 0.5rem;
			left: 0.5rem;
		}

		.nav-toggle {
			padding: 10px 14px;
			font-size: 13px;
		}

		.nav-item {
			padding: 8px 14px;
			font-size: 12px;
		}

		.image-container {
			height: 100svh;
		}

		.menu-anchor {
			bottom: 1rem;
		}

		.menu-wrap {
			border-radius: 5vw;
		}
	}
</style>
