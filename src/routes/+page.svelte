<script lang="ts">
	import { onMount } from 'svelte';
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

	onMount(() => {
		const check = setInterval(() => {
			if (typeof (window as any).liquidGL === 'function') {
				clearInterval(check);
				(window as any).liquidGL({
					target: '[data-slot="sidebar-inner"]',
					snapshot: 'body',
					resolution: 2.0,
					refraction: 0,
					bevelDepth: 0.052,
					bevelWidth: 0.211,
					frost: 2,
					shadow: true,
					specular: true,
					reveal: 'fade',
					tilt: false,
					magnify: 1
				});
			}
		}, 100);

		return () => clearInterval(check);
	});
</script>

<SidebarProvider>
	<Sidebar variant="floating" class="liquid-glass-sidebar">
		<SidebarHeader class="p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex size-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold backdrop-blur-sm"
				>
					A
				</div>
				<span class="text-base font-semibold tracking-tight">Acme Inc</span>
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

		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg">
						<div
							class="flex size-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
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
		<header class="flex h-14 items-center gap-2 px-4">
			<SidebarTrigger class="text-white/80 hover:bg-white/10 hover:text-white" />
		</header>
		<div class="flex flex-1 items-center justify-center p-6">
			<div class="text-center">
				<h1 class="text-4xl font-bold tracking-tight text-white drop-shadow-lg">Welcome</h1>
				<p class="mt-3 text-lg text-white/60">Liquid Glass Sidebar</p>
			</div>
		</div>
	</SidebarInset>
</SidebarProvider>

<style>
	:global([data-slot='sidebar-inner'].liquid-glass-target) {
		background-color: transparent !important;
		box-shadow: none !important;
	}

	:global(.liquid-glass-sidebar [data-slot='sidebar-inner']) {
		background-color: transparent !important;
		box-shadow: none !important;
	}

	:global([data-slot='sidebar']:has(.liquid-glass-sidebar)) {
		--sidebar-foreground: oklch(1 0 0 / 90%);
		--sidebar-accent: oklch(1 0 0 / 10%);
		--sidebar-accent-foreground: oklch(1 0 0 / 95%);
		--sidebar-primary: oklch(1 0 0 / 95%);
		--sidebar-primary-foreground: oklch(1 0 0 / 95%);
		--sidebar-border: oklch(1 0 0 / 10%);
		--sidebar-ring: oklch(1 0 0 / 20%);
	}
</style>
