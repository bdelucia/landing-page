<script lang="ts">
	import { Arc } from 'layerchart';
	import type { ComponentProps } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	const SLICE_MOTION_MS = 480;

	type ArcProps = ComponentProps<typeof Arc>;

	type Props = Omit<ArcProps, 'startAngle' | 'endAngle'> & {
		startAngle?: number;
		endAngle?: number;
		isActive?: boolean;
		isDimmed?: boolean;
	};

	let {
		startAngle = 0,
		endAngle = 0,
		isActive = false,
		isDimmed = false,
		strokeWidth = 0,
		...arcProps
	}: Props = $props();

	const animatedStart = new Tween(0, {
		duration: SLICE_MOTION_MS,
		easing: cubicOut
	});

	const animatedEnd = new Tween(0, {
		duration: SLICE_MOTION_MS,
		easing: cubicOut
	});

	$effect(() => {
		const instant = prefersReducedMotion.current;

		void animatedStart.set(startAngle, instant ? { duration: 0 } : undefined);
		void animatedEnd.set(endAngle, instant ? { duration: 0 } : undefined);
	});
</script>

<g
	class="spending-chart__arc-wrap"
	class:spending-chart__arc-wrap--active={isActive}
	class:spending-chart__arc-wrap--dimmed={isDimmed}
>
	<Arc
		{...arcProps}
		{strokeWidth}
		startAngle={animatedStart.current}
		endAngle={animatedEnd.current}
	/>
</g>
