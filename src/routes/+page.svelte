<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount, tick } from 'svelte';
	import {
		Sidebar,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarInset,
		SidebarMenu,
		SidebarMenuButton,
		SidebarMenuItem,
		SidebarProvider,
		SidebarTrigger
	} from '$lib/components/ui/sidebar/index.js';
	import House from 'phosphor-svelte/lib/House';
	import ChartBar from 'phosphor-svelte/lib/ChartBar';
	import Folder from 'phosphor-svelte/lib/Folder';
	import ChatCircle from 'phosphor-svelte/lib/ChatCircle';
	import Gear from 'phosphor-svelte/lib/Gear';
	import Question from 'phosphor-svelte/lib/Question';
	import User from 'phosphor-svelte/lib/User';

	const WALLPAPER_URLS = Object.values(
		import.meta.glob<string>('$lib/assets/backgrounds/*.{png,jpg,jpeg,webp,avif}', {
			eager: true,
			query: '?url',
			import: 'default'
		})
	);

	/** Matches liquidGL docs: snapshot + class on the glass target */
	const LIQUID_GL_OPTIONS = {
		snapshot: 'body',
		target: '.liquid-glass-sidebar .liquidGL',
		resolution: 2.0,
		refraction: 0,
		bevelDepth: 0.052,
		bevelWidth: 0.211,
		frost: 2,
		shadow: true,
		specular: true,
		/* not "fade": fade animates inline opacity on the lens; it can end at 0 and hide all UI text/icons */
		reveal: 'none' as const,
		tilt: false,
		tiltFactor: 5,
		magnify: 1
	};

	const navItems = [
		{ label: 'Home', icon: House },
		{ label: 'Dashboard', icon: ChartBar },
		{ label: 'Projects', icon: Folder },
		{ label: 'Messages', icon: ChatCircle }
	];

	const utilItems = [
		{ label: 'Settings', icon: Gear },
		{ label: 'Help', icon: Question }
	];

	/** Picked on the client so SSR and hydration stay aligned. */
	let wallpaperUrl = $state<string | undefined>(undefined);

	function resetLiquidGLRenderer() {
		if (!browser) return;
		const r = window.__liquidGLRenderer__;
		if (r?.canvas) {
			r.canvas.remove();
		}
		delete window.__liquidGLRenderer__;
	}

	/** liquidGL’s html2canvas pass ignores `position: fixed` — refresh after the bg image paints. */
	function refreshLiquidGLSnapshot() {
		void window.__liquidGLRenderer__?.captureSnapshot?.();
	}

	/**
	 * liquidGL mounts its canvas on `document.body` last, so it paints above the whole app.
	 * Also, if the canvas stays behind `.app-shell`, transparent UI composites to the in-page
	 * wallpaper instead of the WebGL layer — the glass never shows. Demo-1/4 keep backdrop →
	 * canvas → chrome; we mirror that by inserting the canvas between wallpaper and the anchor.
	 */
	function mountLiquidGLCanvasInHomeStack() {
		const r = window.__liquidGLRenderer__;
		const canvas = r?.canvas;
		const home = document.querySelector('.home-page');
		const anchor = home?.querySelector('.liquid-glass-anchor');
		if (!canvas || !home || !anchor || !canvas.parentNode) return;
		if (canvas.parentNode !== home) {
			home.insertBefore(canvas, anchor);
		}
		/* Above .home-wallpaper (0), below .liquid-glass-anchor (2); overrides addLens z when maxZ=0 */
		canvas.style.zIndex = '1';
		refreshLiquidGLSnapshot();
	}

	onMount(() => {
		if (WALLPAPER_URLS.length > 0) {
			wallpaperUrl = WALLPAPER_URLS[Math.floor(Math.random() * WALLPAPER_URLS.length)];
		}

		let cancelled = false;

		async function waitForScripts() {
			while (
				!cancelled &&
				(typeof window.html2canvas !== 'function' || typeof window.liquidGL !== 'function')
			) {
				await new Promise((r) => setTimeout(r, 50));
			}
		}

		async function initLiquidGlass() {
			if (cancelled) return;
			if (!window.matchMedia('(min-width: 768px)').matches) return;
			if (!document.querySelector('.liquid-glass-sidebar .liquidGL')) return;

			/*
			 * demos/animation-demo.html: liquidGL.syncWith() uses the GSAP ticker so the lens
			 * keeps updating during CSS width transitions (sidebar collapse) and other motion.
			 * liquidGL expects window.gsap.ScrollTrigger to exist (ESM gsap does not attach it).
			 */
			const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
				import('gsap'),
				import('gsap/ScrollTrigger')
			]);
			if (cancelled) return;
			gsap.registerPlugin(ScrollTrigger);
			Object.assign(gsap, { ScrollTrigger });
			(window as Window & { gsap: typeof gsap }).gsap = gsap;

			resetLiquidGLRenderer();

			try {
				window.liquidGL!({
					...LIQUID_GL_OPTIONS,
					on: {
						init() {
							requestAnimationFrame(() => {
								mountLiquidGLCanvasInHomeStack();
							});
							if (import.meta.env.DEV) {
								console.log('liquidGL ready');
							}
						}
					}
				});
			} catch (e) {
				console.error('liquidGL:', e);
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

		async function run() {
			await tick();
			await waitForScripts();
			await initLiquidGlass();
		}

		void run();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		resetLiquidGLRenderer();
	});
</script>

<SidebarProvider class="home-shell min-h-svh w-full">
	<div class="home-page relative h-svh min-h-svh w-full">
		<div class="home-wallpaper" aria-hidden="true">
			{#if wallpaperUrl}
				<img
					class="home-wallpaper-img"
					src={wallpaperUrl}
					alt=""
					fetchpriority="high"
					onload={refreshLiquidGLSnapshot}
				/>
			{/if}
		</div>

		<!--
			Demo-1 / demo-4 pattern: viewport anchor (cf. .menu-anchor / .marquee-anchor).
			The WebGL canvas is moved beside this layer (see mountLiquidGLCanvasInHomeStack):
			wallpaper z-0 → canvas z-1 → this shell z-2 so glass composites above the backdrop.
		-->
		<div
			class="liquid-glass-anchor pointer-events-none fixed inset-0 flex min-h-0 min-w-0 md:pointer-events-none"
		>
			<div class="pointer-events-auto flex min-h-svh min-w-0 flex-1">
				<Sidebar variant="floating" collapsible="icon" class="liquid-glass-sidebar" liquidGlass>
					<div class="border-b border-white/10 pb-4 group-data-[collapsible=icon]:pb-2">
						<div
							class="flex items-center justify-start group-data-[collapsible=icon]:justify-center"
						>
							<span class="liquid-glass-trigger-pill shrink-0">
								<SidebarTrigger
									class="text-zinc-100 hover:bg-white/10 hover:text-white"
								/>
							</span>
						</div>
					</div>

					<div class="menu-items-wrap">
						<div
							class="home-menu-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-auto no-scrollbar"
							data-sidebar="content"
						>
							<SidebarGroup>
								<SidebarGroupLabel>Navigation</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{#each navItems as { label, icon: Icon }}
											<SidebarMenuItem>
												<SidebarMenuButton tooltipContent={label}>
													<span class="liquid-glass-icon-pill" aria-hidden="true">
														<Icon class="size-4 text-zinc-100" />
													</span>
													<span class="liquid-glass-nav-label">{label}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										{/each}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>

							<SidebarGroup>
								<SidebarGroupLabel>Support</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{#each utilItems as { label, icon: Icon }}
											<SidebarMenuItem>
												<SidebarMenuButton tooltipContent={label}>
													<span class="liquid-glass-icon-pill" aria-hidden="true">
														<Icon class="size-4 text-zinc-100" />
													</span>
													<span class="liquid-glass-nav-label">{label}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										{/each}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</div>

						<div class="home-menu-footer border-t border-white/10 pt-4">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton size="lg">
										<div
											class="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-950/90 text-zinc-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
										>
											<User class="size-4" />
										</div>
										<div class="flex flex-col gap-0.5 leading-none">
											<span class="font-medium">John Doe</span>
											<span class="text-xs opacity-60">john@acme.com</span>
										</div>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</div>
					</div>
				</Sidebar>

				<SidebarInset class="!bg-transparent">
					<header class="flex h-14 items-center gap-2 px-4 md:hidden">
						<SidebarTrigger class="text-white/80 hover:bg-white/10 hover:text-white" />
					</header>
					<div class="flex flex-1 items-center justify-center p-6">
						<div class="text-center">
							<h1 class="text-4xl font-bold tracking-tight text-white drop-shadow-lg">Welcome</h1>
							<p class="mt-3 text-lg text-white/60">Liquid Glass Sidebar</p>
							<p class="mt-4">
								<a
									href="/demo"
									class="text-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white"
									>liquidGL demo (NaughtyDuk)</a
								>
							</p>
						</div>
					</div>
				</SidebarInset>
			</div>
		</div>
	</div>
</SidebarProvider>

<style>
	:global(.app-shell:has(.home-shell) .bg) {
		display: none !important;
	}

	/*
	 * Must not use position:fixed here — liquidGL’s snapshot ignores fixed nodes, so the glass
	 * would have nothing to refract. Absolute inside .home-page keeps the backdrop in the capture.
	 */
	.home-wallpaper {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		background: linear-gradient(155deg, #14141f 0%, #1c2433 45%, #0d1826 100%);
	}

	.home-wallpaper-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	/* Full-viewport overlay shell — z-index above canvas (see mountLiquidGLCanvasInHomeStack); `fixed` is from Tailwind classes */
	.liquid-glass-anchor {
		z-index: 2;
	}

	/*
	 * Empty `.liquidGL.menu-wrap` backdrop only (see sidebar.svelte). No text inside — liquidGL
	 * sets opacity on the lens node; UI lives in `.liquid-glass-ui` sibling. No CSS backdrop here.
	 */
	:global(.liquid-glass-sidebar .liquidGL.menu-wrap) {
		overflow: clip;
		box-shadow: none !important;
	}

	/* Foreground chrome — not a descendant of .liquidGL, so lens opacity never hides it */
	:global(.liquid-glass-sidebar .liquid-glass-ui) {
		isolation: isolate;
		transform: translateZ(0);
		color: #b7b7b7;
	}

	:global(.liquid-glass-sidebar .menu-items-wrap) {
		display: flex;
		flex-direction: column;
		flex: 1 1 0%;
		min-height: 0;
		gap: 0.75rem;
	}

	:global(.liquid-glass-icon-pill) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 0.5rem;
		background: rgb(24 24 27 / 0.92);
		padding: 0.375rem;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
	}

	/*
	 * Collapsed icon rail: menu buttons are size-8 (32px). Default p-2 + icon pill padding
	 * overflows — drop pill chrome, zero padding, center the glyph.
	 */
	:global([data-slot='sidebar'][data-collapsible='icon'] .liquid-glass-sidebar [data-slot='sidebar-menu-button']) {
		justify-content: center !important;
		gap: 0 !important;
		padding: 0 !important;
	}

	:global([data-slot='sidebar'][data-collapsible='icon'] .liquid-glass-icon-pill) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin: 0;
		background: transparent;
		box-shadow: none;
		width: 100%;
		height: 100%;
		min-width: 0;
	}

	:global([data-slot='sidebar'][data-collapsible='icon'] .liquid-glass-nav-label) {
		display: none !important;
	}

	:global(.liquid-glass-nav-label) {
		color: #e4e4e7;
	}

	:global(.liquid-glass-trigger-pill) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background: rgb(24 24 27 / 0.92);
		padding: 0.125rem;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
	}

	:global([data-slot='sidebar']:has(.liquid-glass-sidebar)) {
		--sidebar-foreground: #e4e4e7;
		--sidebar-accent: rgb(39 39 42 / 50%);
		--sidebar-accent-foreground: #fafafa;
		--sidebar-primary: #fafafa;
		--sidebar-primary-foreground: #18181b;
		--sidebar-border: rgb(255 255 255 / 12%);
		--sidebar-ring: rgb(255 255 255 / 25%);
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-group']) {
		padding-left: 0;
		padding-right: 0;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-group-label']) {
		color: #b7b7b7 !important;
		font-weight: 700 !important;
		letter-spacing: -0.04rem !important;
		text-transform: none;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-menu-button']) {
		color: #d4d4d8 !important;
		border-radius: 0.75rem;
		transition:
			background 0.2s ease,
			color 0.2s ease,
			opacity 0.2s ease;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-menu-button']:hover) {
		background: rgb(39 39 42 / 50%) !important;
		color: #fafafa !important;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-menu-button'] svg) {
		opacity: 0.85;
		transition: opacity 0.2s ease;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-menu-button']:hover svg) {
		opacity: 1;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-footer'] [data-slot='sidebar-menu-button']) {
		color: #e4e4e7;
	}

	:global([data-slot='sidebar'][data-collapsible='icon'] .home-menu-footer [data-slot='sidebar-menu-button']) {
		justify-content: center !important;
		padding: 0 !important;
		gap: 0 !important;
	}

	:global(
		[data-slot='sidebar'][data-collapsible='icon'] .home-menu-footer [data-slot='sidebar-menu-button'] > div:last-child
	) {
		display: none !important;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-footer'] .text-xs.opacity-60) {
		color: #b7b7b7 !important;
		opacity: 1 !important;
	}
</style>
