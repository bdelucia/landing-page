<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount, tick } from 'svelte';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarHeader,
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
		reveal: 'fade' as const,
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

			resetLiquidGLRenderer();

			try {
				window.liquidGL!({
					...LIQUID_GL_OPTIONS,
					on: {
						init() {
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
				window.liquidGL?.syncWith?.({ gsap: false });
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

		<div
			class="pointer-events-none fixed inset-0 z-30 flex min-h-0 min-w-0 md:pointer-events-none"
		>
			<div class="pointer-events-auto flex min-h-svh min-w-0 flex-1">
				<Sidebar variant="floating" collapsible="icon" class="liquid-glass-sidebar" liquidGlass>
					<SidebarHeader class="!p-0 border-b border-white/10 pb-4">
						<div
							class="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
						>
							<SidebarTrigger
								class="shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
							/>
							<div
								class="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden"
							>
								<div
									class="liquidglass-logo-mark flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm font-bold text-white/95 shadow-sm backdrop-blur-sm"
								>
									A
								</div>
								<span class="truncate text-base font-semibold tracking-tight text-[#e4e4e7]"
									>Acme Inc</span
								>
							</div>
						</div>
					</SidebarHeader>

					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Navigation</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{#each navItems as { label, icon: Icon }}
										<SidebarMenuItem>
											<SidebarMenuButton tooltipContent={label}>
												<Icon />
												<span>{label}</span>
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
												<Icon />
												<span>{label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									{/each}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>

					<SidebarFooter class="!p-0 border-t border-white/10 pt-4">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton size="lg">
									<div
										class="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-sm"
									>
										<User />
									</div>
									<div class="flex flex-col gap-0.5 leading-none">
										<span class="font-medium">John Doe</span>
										<span class="text-xs opacity-60">john@acme.com</span>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
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

	/*
	 * liquidGL “menu-wrap” look (from demos/demo-1.html): soft border, fallback blur,
	 * demo greys (#b7b7b7 accents), nav-like hovers.
	 */
	:global(.liquid-glass-sidebar [data-slot='sidebar-inner'].liquidGL.menu-wrap) {
		background-color: transparent !important;
		box-shadow: none !important;
		backdrop-filter: blur(20px) saturate(180%);
	}

	/* liquidGL sets the lens to pointer-events: none; re-enable interaction on real UI */
	:global(.liquid-glass-sidebar .liquidGL.menu-wrap .content) {
		pointer-events: auto;
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

	:global(.liquid-glass-sidebar [data-slot='sidebar-footer'] .text-xs.opacity-60) {
		color: #b7b7b7 !important;
		opacity: 1 !important;
	}
</style>
