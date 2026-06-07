<script lang="ts">
	import { formatUsdBalance } from '$lib/account-balances';

	const SETTLE_DURATION_MS = 200;

	let {
		value,
		format = formatUsdBalance,
		class: className = ''
	}: {
		value: number;
		format?: (amount: number) => string;
		class?: string;
	} = $props();

	let displayValue = $state(value);
	let isAnimating = $state(false);
	let frameId = 0;
	let initialized = false;

	function roundCents(amount: number): number {
		return Math.round(amount * 100) / 100;
	}

	function easeOutCubic(t: number): number {
		return 1 - (1 - t) ** 3;
	}

	$effect(() => {
		const target = value;

		if (!initialized) {
			displayValue = target;
			initialized = true;
			return;
		}

		if (Math.abs(displayValue - target) < 0.005) {
			displayValue = target;
			isAnimating = false;
			return;
		}

		const from = displayValue;
		const start = performance.now();
		let cancelled = false;

		isAnimating = true;
		cancelAnimationFrame(frameId);

		const tick = (now: number) => {
			if (cancelled) return;

			const progress = Math.min(1, (now - start) / SETTLE_DURATION_MS);
			displayValue = roundCents(from + (target - from) * easeOutCubic(progress));

			if (progress < 1) {
				frameId = requestAnimationFrame(tick);
			} else {
				displayValue = target;
				isAnimating = false;
			}
		};

		frameId = requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			cancelAnimationFrame(frameId);
		};
	});
</script>

<span class="tabular-nums {className}">
	{format(isAnimating ? displayValue : value)}
</span>
