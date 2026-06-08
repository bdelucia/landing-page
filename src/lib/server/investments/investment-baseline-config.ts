import { apiSecrets } from '$lib/server/config/secrets';
import {
	fetchEarliestSnapshotDate,
	snapshotTableForEnvironment
} from '$lib/server/investments/investment-snapshot-dates';

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

/** Baseline contribution total from secrets for one investment item label. */
export function readInvestmentBaselineAmount(itemLabel: string): number | null {
	const amount = apiSecrets.investmentBaselines?.[itemLabel.trim()];

	if (amount == null || !Number.isFinite(amount)) {
		return null;
	}

	return roundMoney(amount);
}

/** Optional manual fallback when no balance snapshots exist yet. */
export function readInvestmentTrackingStartDateFromSecrets(): string | null {
	const date = apiSecrets.investmentTrackingStartDate?.trim();

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return null;
	}

	return date;
}

/**
 * First day Plaid deposit/withdrawal deltas apply. Defaults to the earliest balance
 * snapshot date in SQLite so `investmentBaselines` stays "contributions before tracking".
 */
export function resolveInvestmentTrackingStartDate(
	itemLabel: string,
	useDummyData = false
): string | null {
	return (
		fetchEarliestSnapshotDate(itemLabel.trim(), snapshotTableForEnvironment(useDummyData)) ??
		readInvestmentTrackingStartDateFromSecrets()
	);
}

export function isOnOrAfterTrackingStart(
	transactionDate: string,
	itemLabel: string,
	useDummyData = false
): boolean {
	const trackingStartDate = resolveInvestmentTrackingStartDate(itemLabel, useDummyData);

	if (!trackingStartDate) {
		return false;
	}

	return transactionDate >= trackingStartDate;
}
