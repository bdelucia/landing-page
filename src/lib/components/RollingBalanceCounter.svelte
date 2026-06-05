<script lang="ts">
	import {
		formatDebtBalanceLabel,
		formatUsdBalance,
		isDebtAccountLabel
	} from '$lib/account-balances';
	import { onMount } from 'svelte';

	const balanceRanges: Record<string, [number, number]> = {
		AZFCU: [800, 28_000],
		Robinhood: [8_000, 180_000],
		Fidelity: [15_000, 520_000],
		'Capital One': [120, 9_500],
		PayPal: [0, 4_200]
	};

	const SETTLE_DURATION_MS = 1_500;
	const ROLL_TIME_CONSTANT_MS = 180;

	let {
		label,
		value = undefined,
		isDebt: isDebtProp,
		staticLabel,
		size = 'sm',
		class: className = ''
	}: {
		label?: string;
		value?: number | null;
		isDebt?: boolean;
		staticLabel?: string;
		size?: 'sm' | 'lg';
		class?: string;
	} = $props();

	const isDebt = $derived(isDebtProp ?? (label ? isDebtAccountLabel(label) : false));
	const balanceTextClass = $derived(isDebt ? 'text-debt' : 'text-primary');
	const sizeClass = $derived(size === 'lg' ? 'text-xl' : 'text-sm');

	let displayValue = $state(0);
	let phase = $state<'rolling' | 'settling' | 'settled'>('rolling');

	function resolveRange(): [number, number] {
		if (!label) {
			return [40_000, 620_000];
		}

		return balanceRanges[label.trim()] ?? [500, 50_000];
	}

	function randomInRange(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}

	function roundCents(amount: number): number {
		return Math.round(amount * 100) / 100;
	}

	function formatAmount(amount: number): string {
		return isDebt ? formatDebtBalanceLabel(amount) : formatUsdBalance(amount);
	}

	function easeOutCubic(t: number): number {
		return 1 - (1 - t) ** 3;
	}

	const displayLabel = $derived(
		staticLabel ??
			(value != null && phase === 'settled' ? formatAmount(value) : formatAmount(displayValue))
	);

	onMount(() => {
		if (staticLabel) {
			return;
		}

		const [min, max] = resolveRange();
		let current = roundCents(randomInRange(min, max));
		let wanderTarget = randomInRange(min, max);
		let settleFrom: number | null = null;
		let settleStart = 0;
		let frameId = 0;
		let lastTime = performance.now();

		displayValue = current;

		const tick = (now: number) => {
			const elapsed = now - lastTime;
			lastTime = now;

			if (phase === 'settled') {
				displayValue = value ?? current;
				return;
			}

			const target = value;

			if (target == null) {
				settleFrom = null;
				phase = 'rolling';

				if (Math.abs(wanderTarget - current) < (max - min) * 0.02) {
					wanderTarget = randomInRange(min, max);
				}

				current = roundCents(
					current + (wanderTarget - current) * Math.min(1, elapsed / ROLL_TIME_CONSTANT_MS)
				);
			} else {
				if (settleFrom == null) {
					settleFrom = current;
					settleStart = now;
					phase = 'settling';
				}

				const progress = Math.min(1, (now - settleStart) / SETTLE_DURATION_MS);
				current = roundCents(settleFrom + (target - settleFrom) * easeOutCubic(progress));

				if (progress >= 1) {
					current = target;
					phase = 'settled';
				}
			}

			displayValue = current;
			frameId = requestAnimationFrame(tick);
		};

		frameId = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frameId);
	});
</script>

<span
	class="shrink-0 font-semibold tabular-nums {sizeClass} {balanceTextClass} {className}"
	aria-hidden={staticLabel ? undefined : true}
>
	{displayLabel}
</span>
