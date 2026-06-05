import type { BankAccountItem } from '$lib/bank-accounts';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	getDatabase
} from '$lib/server/database';

export const DUMMY_SNAPSHOT_HISTORY_DAYS = 365 * 2;

/** Bump when generation logic changes so stale snapshots are rebuilt. */
export const DUMMY_BALANCE_GENERATOR_VERSION = 6;

export type DummySnapshotAccount = {
	accountId: string;
	accountName: string;
	accountMask: string | null;
	accountType: string | null;
	accountSubtype: string | null;
	balance: number;
};

type AccountKind = 'checking' | 'savings' | 'credit' | 'investment' | 'default';

type Rng = () => number;

type DayContext = {
	dayIndex: number;
	totalDays: number;
	year: number;
	month: number;
	dayOfMonth: number;
	dayOfWeek: number;
	isWeekend: boolean;
};

type AccountSimulation = {
	kind: AccountKind;
	scale: number;
	payrollAmount: number;
	payrollInterval: number;
	payrollPhase: number;
	rentAmount: number;
	utilityAmount: number;
	utilityDay: number;
	subscriptionAmount: number;
	subscriptionDay: number;
	grocerySpend: number;
	dailySpendChance: number;
	monthlyContribution: number;
	marketVolatility: number;
	transferAmount: number;
	creditPaymentDay: number;
};

function hashSeed(seed: string): number {
	let hash = 0;

	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	return hash || 1;
}

function createRng(seed: string): Rng {
	let state = hashSeed(seed);

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

function rngBetween(rng: Rng, min: number, max: number): number {
	return min + rng() * (max - min);
}

function rngInt(rng: Rng, min: number, max: number): number {
	return Math.floor(rngBetween(rng, min, max + 1));
}

function rngChance(rng: Rng, probability: number): boolean {
	return rng() < probability;
}

function inferAccountKind(account: DummySnapshotAccount): AccountKind {
	const type = (account.accountType ?? '').toLowerCase();
	const subtype = (account.accountSubtype ?? '').toLowerCase();
	const name = (account.accountName ?? '').toLowerCase();
	const combined = `${type} ${subtype} ${name}`;

	if (type === 'credit' || subtype.includes('credit card') || combined.includes('credit card')) {
		return 'credit';
	}

	if (
		type === 'investment' ||
		subtype.includes('401') ||
		subtype.includes('ira') ||
		subtype.includes('brokerage') ||
		subtype.includes('hsa') ||
		combined.includes('401k') ||
		combined.includes('roth') ||
		combined.includes('brokerage') ||
		combined.includes('hsa')
	) {
		return 'investment';
	}

	if (
		subtype.includes('savings') ||
		subtype.includes('money market') ||
		subtype.includes('cd') ||
		combined.includes('savings') ||
		combined.includes('money market')
	) {
		return 'savings';
	}

	if (subtype.includes('checking') || type === 'depository') {
		return 'checking';
	}

	return 'default';
}

function buildAccountSimulation(account: DummySnapshotAccount, rng: Rng): AccountSimulation {
	const kind = inferAccountKind(account);
	const refBalance = Math.max(Math.abs(account.balance), 500);
	const scale = refBalance / 4_000;

	return {
		kind,
		scale,
		payrollAmount: rngBetween(rng, 2_200, 5_800) * scale,
		payrollInterval: rngChance(rng, 0.85) ? 14 : 7,
		payrollPhase: rngInt(rng, 0, 13),
		rentAmount: rngBetween(rng, 950, 2_400) * scale,
		utilityAmount: rngBetween(rng, 65, 210) * Math.min(scale, 1.4),
		utilityDay: rngInt(rng, 3, 9),
		subscriptionAmount: rngBetween(rng, 12, 85) * Math.min(scale, 1.2),
		subscriptionDay: rngInt(rng, 10, 22),
		grocerySpend: rngBetween(rng, 45, 175) * Math.min(scale, 1.3),
		dailySpendChance: rngBetween(rng, 0.45, 0.88),
		monthlyContribution: rngBetween(rng, 150, 900) * scale,
		marketVolatility: rngBetween(rng, 0.004, 0.018),
		transferAmount: rngBetween(rng, 120, 650) * scale,
		creditPaymentDay: rngInt(rng, 24, 28)
	};
}

function dayContextForIndex(dayIndex: number, totalDays: number): DayContext {
	const date = new Date();
	date.setUTCHours(12, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - (totalDays - 1 - dayIndex));

	const dayOfWeek = date.getUTCDay();

	return {
		dayIndex,
		totalDays,
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		dayOfMonth: date.getUTCDate(),
		dayOfWeek,
		isWeekend: dayOfWeek === 0 || dayOfWeek === 6
	};
}

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

type TickerKind = 'checking' | 'savings';

type TickerProfile = {
	volatility: number;
	downsideFactor: number;
	upsideFactor: number;
	positiveSpikeBias: number;
	spikeChance: number;
	spikeMagnitude: number;
	gapChance: number;
	gapMagnitude: number;
	bridgeVolatility: number;
	microNoise: number;
};

type TickerStartOptions = {
	startAboveTargetChance: number;
	startAboveRange: [number, number];
	startBelowRange: [number, number];
	minStartMultiplier: number;
};

function buildTickerProfile(account: DummySnapshotAccount, kind: TickerKind): TickerProfile {
	const rng = createRng(`${account.accountId}:ticker-profile:${kind}`);
	const ref = Math.max(Math.abs(account.balance), 2_500);

	if (kind === 'savings') {
		return {
			volatility: rngBetween(rng, 0.028, 0.085),
			downsideFactor: rngBetween(rng, 0.45, 0.68),
			upsideFactor: rngBetween(rng, 0.95, 1.18),
			positiveSpikeBias: rngBetween(rng, 0.68, 0.82),
			spikeChance: rngBetween(rng, 0.04, 0.085),
			spikeMagnitude: rngBetween(rng, 0.08, 0.22),
			gapChance: rngBetween(rng, 0.02, 0.045),
			gapMagnitude: rngBetween(rng, 0.12, 0.32),
			bridgeVolatility: ref * rngBetween(rng, 0.012, 0.038),
			microNoise: ref * rngBetween(rng, 0.006, 0.02)
		};
	}

	return {
		volatility: rngBetween(rng, 0.045, 0.13),
		downsideFactor: 1,
		upsideFactor: 1,
		positiveSpikeBias: 0.5,
		spikeChance: rngBetween(rng, 0.055, 0.11),
		spikeMagnitude: rngBetween(rng, 0.12, 0.32),
		gapChance: rngBetween(rng, 0.028, 0.06),
		gapMagnitude: rngBetween(rng, 0.2, 0.48),
		bridgeVolatility: ref * rngBetween(rng, 0.018, 0.055),
		microNoise: ref * rngBetween(rng, 0.01, 0.03)
	};
}

function generateRelativeTickerPrices(
	accountId: string,
	totalDays: number,
	profile: TickerProfile
): number[] {
	const prices = [1];

	for (let dayIndex = 1; dayIndex < totalDays; dayIndex += 1) {
		const dayRng = createRng(`${accountId}:ticker:${dayIndex}`);
		let dailyReturn = rngBetween(
			dayRng,
			-profile.volatility * profile.downsideFactor,
			profile.volatility * profile.upsideFactor
		);

		if (rngChance(dayRng, profile.spikeChance)) {
			const direction = rngChance(dayRng, profile.positiveSpikeBias) ? 1 : -1;
			dailyReturn +=
				direction * rngBetween(dayRng, profile.spikeMagnitude * 0.35, profile.spikeMagnitude);
		}

		if (rngChance(dayRng, profile.gapChance)) {
			const direction = rngChance(dayRng, profile.positiveSpikeBias) ? 1 : -1;
			dailyReturn += direction * rngBetween(dayRng, profile.gapMagnitude * 0.4, profile.gapMagnitude);
		}

		const nextPrice = prices[dayIndex - 1] * (1 + dailyReturn);
		prices.push(Math.max(nextPrice, 0.05));
	}

	return prices;
}

function mapTickerPricesToBalances(
	prices: number[],
	startBalance: number,
	endBalance: number
): number[] {
	const first = prices[0];
	const last = prices[prices.length - 1];
	const range = last - first;

	if (Math.abs(range) < 1e-6) {
		return prices.map((_, index) => {
			const progress = index / Math.max(prices.length - 1, 1);
			return Math.round(startBalance + (endBalance - startBalance) * progress);
		});
	}

	return prices.map((price) =>
		Math.round(startBalance + ((price - first) / range) * (endBalance - startBalance))
	);
}

function applyNoisyDrift(balances: number[], drift: number, accountId: string): number[] {
	if (drift === 0) {
		return balances;
	}

	const result = [...balances];
	const totalDays = balances.length;
	const startIndex = Math.max(1, Math.floor(totalDays * 0.15));
	const slots = totalDays - startIndex;
	const weights: number[] = [];

	for (let slot = 0; slot < slots; slot += 1) {
		weights.push(rngBetween(createRng(`${accountId}:drift-weight:${slot}`), 0.02, 1));
	}

	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	let applied = 0;

	for (let slot = 0; slot < slots - 1; slot += 1) {
		const share = Math.round(drift * (weights[slot] / totalWeight));
		result[startIndex + slot] += share;
		applied += share;
	}

	result[totalDays - 1] += drift - applied;
	return result;
}

function addBrownianBridgeNoise(
	balances: number[],
	accountId: string,
	volatility: number,
	targetEnd: number
): number[] {
	const totalDays = balances.length;
	const increments: number[] = [];

	for (let dayIndex = 0; dayIndex < totalDays - 1; dayIndex += 1) {
		increments.push(
			rngBetween(createRng(`${accountId}:bridge:${dayIndex}`), -volatility, volatility)
		);
	}

	const incrementTotal = increments.reduce((sum, increment) => sum + increment, 0);
	let cumulative = 0;

	return balances.map((balance, dayIndex) => {
		const progress = dayIndex / Math.max(totalDays - 1, 1);

		if (dayIndex > 0) {
			cumulative += increments[dayIndex - 1];
		}

		const bridge = cumulative - progress * incrementTotal;

		if (dayIndex === totalDays - 1) {
			return Math.round(targetEnd);
		}

		return Math.round(balance + bridge);
	});
}

function addMicroNoise(
	balances: number[],
	accountId: string,
	amplitude: number,
	targetEnd: number
): number[] {
	return balances.map((balance, dayIndex) => {
		if (dayIndex === 0 || dayIndex === balances.length - 1) {
			return dayIndex === balances.length - 1 ? Math.round(targetEnd) : balance;
		}

		const noiseRng = createRng(`${accountId}:micro:${dayIndex}`);
		return balance + Math.round(rngBetween(noiseRng, -amplitude, amplitude));
	});
}

function resolveDesiredStart(
	accountId: string,
	ref: number,
	minBalance: number,
	options: TickerStartOptions
): number {
	const startRng = createRng(`${accountId}:ticker-start`);
	const startsAboveTarget = rngChance(startRng, options.startAboveTargetChance);

	let desiredStart = startsAboveTarget
		? ref * rngBetween(startRng, options.startAboveRange[0], options.startAboveRange[1])
		: ref * rngBetween(startRng, options.startBelowRange[0], options.startBelowRange[1]);

	return Math.max(minBalance * options.minStartMultiplier, desiredStart);
}

function finalizeTickerBalances(
	balances: number[],
	accountId: string,
	profile: TickerProfile,
	targetEnd: number,
	minBalance: number
): number[] {
	let result = [...balances];

	let lowest = Math.min(...result);
	if (lowest < minBalance) {
		const lift = minBalance - lowest;
		result = result.map((balance) => balance + lift);
		result = applyNoisyDrift(
			result,
			targetEnd - result[result.length - 1],
			accountId
		);
	}

	result = addBrownianBridgeNoise(result, accountId, profile.bridgeVolatility, targetEnd);
	result = addMicroNoise(result, accountId, profile.microNoise, targetEnd);

	lowest = Math.min(...result.slice(0, -1));
	if (lowest < minBalance) {
		const lift = minBalance - lowest;
		result = result.map((balance, dayIndex) =>
			dayIndex === result.length - 1 ? balance : balance + lift
		);
		result = applyNoisyDrift(
			result,
			targetEnd - result[result.length - 1],
			accountId
		);
	}

	result[result.length - 1] = Math.round(targetEnd);

	return result.map((balance, dayIndex) => {
		if (dayIndex === result.length - 1) {
			return Math.round(targetEnd);
		}

		return Math.round(Math.max(minBalance, balance));
	});
}

function generateTickerBalances(
	account: DummySnapshotAccount,
	totalDays: number,
	kind: TickerKind,
	startOptions: TickerStartOptions,
	minBalance: number
): number[] {
	const profile = buildTickerProfile(account, kind);
	const ref = Math.max(Math.abs(account.balance), 2_500);
	const targetEnd = account.balance;
	const desiredStart = resolveDesiredStart(account.accountId, ref, minBalance, startOptions);
	const prices = generateRelativeTickerPrices(account.accountId, totalDays, profile);
	const balances = mapTickerPricesToBalances(prices, desiredStart, targetEnd);

	return finalizeTickerBalances(balances, account.accountId, profile, targetEnd, minBalance);
}

function generateCheckingTickerBalances(
	account: DummySnapshotAccount,
	totalDays: number
): number[] {
	const ref = Math.max(Math.abs(account.balance), 2_500);

	return generateTickerBalances(
		account,
		totalDays,
		'checking',
		{
			startAboveTargetChance: 0.68,
			startAboveRange: [1.15, 2.9],
			startBelowRange: [0.75, 1.45],
			minStartMultiplier: 2.2
		},
		Math.max(450, ref * 0.12)
	);
}

function generateSavingsTickerBalances(
	account: DummySnapshotAccount,
	totalDays: number
): number[] {
	const ref = Math.max(Math.abs(account.balance), 2_500);

	return generateTickerBalances(
		account,
		totalDays,
		'savings',
		{
			startAboveTargetChance: 0.32,
			startAboveRange: [0.92, 1.45],
			startBelowRange: [0.42, 0.88],
			minStartMultiplier: 1
		},
		Math.max(100, ref * 0.05)
	);
}

function creditDayDelta(simulation: AccountSimulation, day: DayContext, rng: Rng): number {
	let delta = 0;

	if (rngChance(rng, day.isWeekend ? 0.45 : 0.62)) {
		delta += rngBetween(rng, 8, 140) * Math.min(simulation.scale, 1.6);
	}

	if (rngChance(rng, 0.12)) {
		delta += rngBetween(rng, 25, 220) * simulation.scale;
	}

	if (day.dayOfWeek === 6 && rngChance(rng, 0.35)) {
		delta += rngBetween(rng, 40, 320) * simulation.scale;
	}

	if (day.dayOfMonth === simulation.creditPaymentDay) {
		delta -= rngBetween(rng, 400, 2_800) * simulation.scale;
	}

	if (day.dayOfMonth === 15 && rngChance(rng, 0.35)) {
		delta -= rngBetween(rng, 150, 900) * simulation.scale;
	}

	if (rngChance(rng, 0.015)) {
		delta += rngBetween(rng, 200, 1_400) * simulation.scale;
	}

	return delta;
}

function investmentDayDelta(simulation: AccountSimulation, day: DayContext, rng: Rng): number {
	const drift = simulation.marketVolatility * simulation.scale * 4_000;
	let delta = rngBetween(rng, -drift, drift * 1.15);

	if (day.dayOfMonth === 1 || day.dayOfMonth === 15) {
		delta += simulation.monthlyContribution * rngBetween(rng, 0.45, 0.65);
	}

	if ((day.dayIndex + simulation.payrollPhase) % 30 === 0) {
		delta += simulation.monthlyContribution * rngBetween(rng, 0.15, 0.4);
	}

	if (rngChance(rng, 0.018)) {
		delta -= rngBetween(rng, 250, 2_200) * simulation.scale;
	}

	if (rngChance(rng, 0.01)) {
		delta += rngBetween(rng, 300, 1_800) * simulation.scale;
	}

	if (day.dayIndex > 0 && day.dayIndex % 63 === 0) {
		delta += rngBetween(rng, 80, 420) * simulation.scale;
	}

	return delta;
}

function defaultDayDelta(simulation: AccountSimulation, day: DayContext, rng: Rng): number {
	let delta = rngBetween(rng, -35, 35) * simulation.scale;

	if ((day.dayIndex + simulation.payrollPhase) % 14 === 0) {
		delta += simulation.payrollAmount * rngBetween(rng, 0.4, 0.9);
	}

	if (day.dayOfMonth === 1) {
		delta -= simulation.rentAmount * rngBetween(rng, 0.35, 0.75);
	}

	if (rngChance(rng, 0.25)) {
		delta -= rngBetween(rng, 5, 75) * simulation.scale;
	}

	return delta;
}

function dayDeltaForKind(
	kind: AccountKind,
	simulation: AccountSimulation,
	day: DayContext,
	rng: Rng
): number {
	switch (kind) {
		case 'credit':
			return creditDayDelta(simulation, day, rng);
		case 'investment':
			return investmentDayDelta(simulation, day, rng);
		default:
			return defaultDayDelta(simulation, day, rng);
	}
}

function generateDailyDeltas(account: DummySnapshotAccount, totalDays: number): number[] {
	const rng = createRng(account.accountId);
	const simulation = buildAccountSimulation(account, rng);
	const deltas: number[] = [];

	for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
		const day = dayContextForIndex(dayIndex, totalDays);
		const dayRng = createRng(`${account.accountId}:${dayIndex}`);
		const delta = dayDeltaForKind(simulation.kind, simulation, day, dayRng);

		deltas.push(roundMoney(delta));
	}

	return deltas;
}

function balancesFromDeltas(deltas: number[], targetEndBalance: number): number[] {
	let cumulative = 0;
	const relative = deltas.map((delta) => {
		cumulative += delta;
		return cumulative;
	});
	const offset = targetEndBalance - relative[relative.length - 1];

	return relative.map((value) => Math.round(value + offset));
}

function generateAccountBalances(account: DummySnapshotAccount, totalDays: number): number[] {
	const kind = inferAccountKind(account);

	if (kind === 'checking') {
		return generateCheckingTickerBalances(account, totalDays);
	}

	if (kind === 'savings') {
		return generateSavingsTickerBalances(account, totalDays);
	}

	if (kind === 'credit') {
		return balancesFromDeltas(generateDailyDeltas(account, totalDays), account.balance).map(
			(balance) => Math.max(0, balance)
		);
	}

	return balancesFromDeltas(generateDailyDeltas(account, totalDays), account.balance);
}

function snapshotTimeForDay(dayOffset: number, totalDays: number): string {
	const date = new Date();
	date.setUTCHours(12, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - (totalDays - 1 - dayOffset));

	return date.toISOString();
}

function ensureMetadataTable(): void {
	const db = getDatabase();
	db.exec(`
		CREATE TABLE IF NOT EXISTS app_metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);
}

function getMetadata(key: string): string | null {
	ensureMetadataTable();
	const db = getDatabase();
	const row = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get(key) as
		| { value: string }
		| undefined;

	return row?.value ?? null;
}

function setMetadata(key: string, value: string): void {
	ensureMetadataTable();
	const db = getDatabase();
	db.prepare(`
		INSERT INTO app_metadata (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`).run(key, value);
}

function clearAllDummySnapshots(): void {
	const db = getDatabase();
	db.prepare(`DELETE FROM ${ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE}`).run();
}

function ensureDummyGeneratorVersion(): void {
	const versionKey = 'dummy_balance_generator_version';
	const storedVersion = getMetadata(versionKey);

	if (storedVersion === String(DUMMY_BALANCE_GENERATOR_VERSION)) {
		return;
	}

	clearAllDummySnapshots();
	setMetadata(versionKey, String(DUMMY_BALANCE_GENERATOR_VERSION));
}

function hasDummySnapshots(accountId: string): boolean {
	const db = getDatabase();
	const row = db
		.prepare(
			`SELECT 1 AS found FROM ${ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE} WHERE plaid_account_id = ? LIMIT 1`
		)
		.get(accountId) as { found: 1 } | undefined;

	return row?.found === 1;
}

function insertDummySnapshotsForAccount(
	account: DummySnapshotAccount,
	itemLabel: string,
	itemId: string | null,
	totalDays: number
): number {
	const db = getDatabase();
	const balances = generateAccountBalances(account, totalDays);
	const insert = db.prepare(`
		INSERT INTO ${ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE} (
			snapshot_time,
			plaid_item_label,
			plaid_item_id,
			plaid_account_id,
			account_name,
			account_mask,
			account_type,
			account_subtype,
			balance_current,
			balance_available,
			balance_limit,
			iso_currency_code,
			unofficial_currency_code,
			source
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy')
	`);

	db.exec('BEGIN');
	try {
		for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
			const balance = balances[dayIndex];

			insert.run(
				snapshotTimeForDay(dayIndex, totalDays),
				itemLabel,
				itemId,
				account.accountId,
				account.accountName,
				account.accountMask,
				account.accountType,
				account.accountSubtype,
				balance,
				balance,
				null,
				'USD',
				null
			);
		}

		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}

	return totalDays;
}

export function ensureDummyBalanceSnapshots(
	accounts: DummySnapshotAccount[],
	itemLabel: string,
	itemId: string | null,
	totalDays = DUMMY_SNAPSHOT_HISTORY_DAYS
): void {
	ensureDummyGeneratorVersion();

	for (const account of accounts) {
		if (hasDummySnapshots(account.accountId)) continue;
		insertDummySnapshotsForAccount(account, itemLabel, itemId, totalDays);
	}
}

export function dummySnapshotAccountFromBankItem(
	account: BankAccountItem,
	accountName: string,
	accountType: string | null,
	accountSubtype: string | null
): DummySnapshotAccount {
	return {
		accountId: account.id,
		accountName,
		accountMask: account.mask,
		accountType,
		accountSubtype,
		balance: account.balance
	};
}
