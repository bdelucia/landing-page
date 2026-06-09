import type { InvestmentTransaction } from 'plaid';
import { isInvestingAccountLabel } from '$lib/hooks/finances/account-balances';
import { apiSecrets } from '$lib/server/config/secrets';
import { getPlaidLinkedItems, isPlaidLinked } from '$lib/server/config/integration-config';
import { getDatabase } from '$lib/server/db/database';
import {
	snapshotBalanceAmount,
	type LatestSnapshotRow
} from '$lib/server/balances/latest-balance-snapshots';
import { createPlaidClient } from '$lib/server/plaid/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';
import type { InvestmentAccountStats } from '$lib/hooks/finances/investment-stats';
import {
	contributionsAsOf,
	type InvestmentContributionTimeline
} from '$lib/hooks/finances/investment-contribution-timeline';
import { isoInstantToDayKey } from '$lib/hooks/chart/chart-date';
import {
	readInvestmentBaselineAmount,
	resolveInvestmentTrackingStartDate,
	isAfterTrackingStart
} from '$lib/server/investments/investment-baseline-config';
import {
	classifyInvestmentTransaction,
	findDividendReinvestmentPairs
} from '$lib/server/investments/investment-transaction-rules';

export type { InvestmentAccountStats } from '$lib/hooks/finances/investment-stats';

export const INVESTMENT_CONTRIBUTION_TOTALS_TABLE = 'investment_contribution_totals';
export const INVESTMENT_PROCESSED_TRANSACTIONS_TABLE = 'investment_processed_transactions';
export const INVESTMENT_ACCOUNT_HISTORY_TABLE = 'investment_account_history';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

function readBaselines(): Record<string, number> {
	return apiSecrets.investmentBaselines ?? {};
}

function clearProcessedTransactions(itemLabel: string): void {
	const db = getDatabase();

	db.prepare(
		`DELETE FROM ${INVESTMENT_PROCESSED_TRANSACTIONS_TABLE} WHERE plaid_item_label = ?`
	).run(itemLabel.trim());
}

function storeContributionTotal(itemLabel: string, amount: number): void {
	const db = getDatabase();
	const now = new Date().toISOString();
	const trimmedLabel = itemLabel.trim();

	db.prepare(
		`
		INSERT INTO ${INVESTMENT_CONTRIBUTION_TOTALS_TABLE} (
			plaid_item_label,
			total_contributions,
			updated_at
		)
		VALUES (?, ?, ?)
		ON CONFLICT(plaid_item_label) DO UPDATE SET
			total_contributions = excluded.total_contributions,
			updated_at = excluded.updated_at
	`
	).run(trimmedLabel, roundMoney(amount), now);
}

function readContributionTotal(itemLabel: string): number | null {
	const db = getDatabase();
	const row = db
		.prepare(
			`SELECT total_contributions AS totalContributions FROM ${INVESTMENT_CONTRIBUTION_TOTALS_TABLE} WHERE plaid_item_label = ?`
		)
		.get(itemLabel) as { totalContributions: number } | undefined;

	return row ? roundMoney(row.totalContributions) : null;
}

function seedContributionTotal(itemLabel: string, amount: number): void {
	storeContributionTotal(itemLabel, amount);
}

function sumContributionDeltas(itemLabel: string, trackingStartDate: string | null): number {
	const db = getDatabase();
	const trimmedLabel = itemLabel.trim();

	if (!trackingStartDate) {
		return 0;
	}

	const row = db
		.prepare(
			`
			SELECT COALESCE(SUM(contribution_delta), 0) AS totalDelta
			FROM ${INVESTMENT_PROCESSED_TRANSACTIONS_TABLE}
			WHERE plaid_item_label = ?
				AND transaction_date > ?
		`
		)
		.get(trimmedLabel, trackingStartDate) as { totalDelta: number };

	return roundMoney(row.totalDelta ?? 0);
}

function markTransactionProcessed(
	itemLabel: string,
	transaction: InvestmentTransaction,
	contributionDelta: number
): void {
	const db = getDatabase();

	db.prepare(
		`
		INSERT INTO ${INVESTMENT_PROCESSED_TRANSACTIONS_TABLE} (
			investment_transaction_id,
			plaid_item_label,
			contribution_delta,
			transaction_date,
			processed_at
		)
		VALUES (?, ?, ?, ?, ?)
	`
	).run(
		transaction.investment_transaction_id,
		itemLabel,
		roundMoney(contributionDelta),
		transaction.date,
		new Date().toISOString()
	);
}

function ensureBaselineTotals(): void {
	const baselines = readBaselines();

	for (const [itemLabel, amount] of Object.entries(baselines)) {
		if (!Number.isFinite(amount)) continue;
		seedContributionTotal(itemLabel.trim(), amount);
	}
}

function toDateString(daysAgo: number): string {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString().slice(0, 10);
}

async function fetchInvestmentTransactions(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<InvestmentTransaction[]> {
	const client = createPlaidClient(plaid);
	const transactions: InvestmentTransaction[] = [];
	const pageSize = 500;
	let offset = 0;

	while (true) {
		const response = await client.investmentsTransactionsGet({
			access_token: item.accessToken,
			start_date: toDateString(730),
			end_date: toDateString(0),
			options: { count: pageSize, offset }
		});

		transactions.push(...response.data.investment_transactions);

		if (response.data.investment_transactions.length < pageSize) {
			break;
		}

		offset += pageSize;
	}

	return transactions.sort((a, b) => {
		const byDate = a.date.localeCompare(b.date);
		if (byDate !== 0) return byDate;

		return a.investment_transaction_id.localeCompare(b.investment_transaction_id);
	});
}

async function syncContributionsForItem(plaid: PlaidConfig, item: PlaidLinkedItem): Promise<number> {
	const itemLabel = resolveItemLabel(item);

	if (!isInvestingAccountLabel(itemLabel)) {
		return 0;
	}

	const baseline = readInvestmentBaselineAmount(itemLabel);
	if (baseline == null) {
		return 0;
	}

	const trackingStartDate = resolveInvestmentTrackingStartDate(itemLabel, false);
	if (!trackingStartDate) {
		storeContributionTotal(itemLabel, baseline);
		return 0;
	}

	clearProcessedTransactions(itemLabel);

	const transactions = (await fetchInvestmentTransactions(plaid, item)).filter((transaction) =>
		isAfterTrackingStart(transaction.date, itemLabel, false)
	);
	const reinvestmentPairs = findDividendReinvestmentPairs(transactions);
	let applied = 0;

	for (const transaction of transactions) {
		const decision = classifyInvestmentTransaction(itemLabel, transaction, reinvestmentPairs);
		const rawDelta = decision.kind === 'contribution' ? decision.delta : 0;
		// Contributions are cumulative deposits only — never subtract on re-sync noise.
		const contributionDelta = rawDelta > 0 ? rawDelta : 0;

		if (contributionDelta !== 0) {
			applied += 1;
		}

		markTransactionProcessed(itemLabel, transaction, contributionDelta);
	}

	storeContributionTotal(itemLabel, roundMoney(baseline + sumContributionDeltas(itemLabel, trackingStartDate)));

	return applied;
}

function upsertInvestmentHistory(
	itemLabel: string,
	accountId: string,
	itemId: string | null,
	historyDate: string,
	balance: number,
	contributions: number
): void {
	const earnings = roundMoney(balance - contributions);
	const db = getDatabase();

	db.prepare(
		`
		INSERT INTO ${INVESTMENT_ACCOUNT_HISTORY_TABLE} (
			history_date,
			plaid_item_label,
			plaid_item_id,
			plaid_account_id,
			balance,
			contributions,
			earnings,
			source
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'plaid')
		ON CONFLICT(plaid_item_label, plaid_account_id, history_date) DO UPDATE SET
			plaid_item_id = excluded.plaid_item_id,
			balance = excluded.balance,
			contributions = excluded.contributions,
			earnings = excluded.earnings,
			synced_at = datetime('now')
	`
	).run(
		historyDate,
		itemLabel,
		itemId,
		accountId,
		roundMoney(balance),
		roundMoney(contributions),
		earnings
	);
}

function recordInvestmentHistoryForRows(rows: LatestSnapshotRow[], snapshotTime: string): void {
	const historyDate = isoInstantToDayKey(snapshotTime);
	const timelinesByLabel = new Map<string, InvestmentContributionTimeline>();

	for (const row of rows) {
		if (!isInvestingAccountLabel(row.itemLabel)) continue;

		const timeline =
			timelinesByLabel.get(row.itemLabel) ??
			loadInvestmentContributionTimeline(row.itemLabel, false) ??
			null;

		if (timeline) {
			timelinesByLabel.set(row.itemLabel, timeline);
		}

		const contributions = timeline
			? contributionsAsOf(historyDate, timeline)
			: readContributionTotal(row.itemLabel) ??
				readBaselines()[row.itemLabel] ??
				0;

		upsertInvestmentHistory(
			row.itemLabel,
			row.accountId,
			row.itemId,
			historyDate,
			snapshotBalanceAmount(row),
			contributions
		);
	}
}

export type SyncInvestmentContributionsResult = {
	processedTransactions: number;
	errors: string[];
};

export async function syncInvestmentContributions(
	plaid: PlaidConfig = apiSecrets.plaid!
): Promise<SyncInvestmentContributionsResult> {
	if (!isPlaidLinked(apiSecrets) || plaid.environment === 'sandbox') {
		ensureBaselineTotals();
		return { processedTransactions: 0, errors: [] };
	}

	ensureBaselineTotals();

	const linkedItems = getPlaidLinkedItems(plaid).filter((item) =>
		isInvestingAccountLabel(resolveItemLabel(item))
	);

	let processedTransactions = 0;
	const errors: string[] = [];

	for (const item of linkedItems) {
		try {
			processedTransactions += await syncContributionsForItem(plaid, item);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown error';
			errors.push(`${resolveItemLabel(item)}: ${message}`);
			console.error(
				`[investment-sync] Failed to sync contributions for "${resolveItemLabel(item)}": ${message}`
			);
		}
	}

	return { processedTransactions, errors };
}

export function recordInvestmentHistoryFromSnapshotRows(
	rows: Array<{
		snapshotTime: string;
		itemLabel: string;
		itemId: string | null;
		accountId: string;
		balanceCurrent: number | null;
		balanceAvailable: number | null;
	}>
): void {
	ensureBaselineTotals();

	recordInvestmentHistoryForRows(
		rows.map((row) => ({
			snapshotTime: row.snapshotTime,
			itemLabel: row.itemLabel,
			itemId: row.itemId,
			accountId: row.accountId,
			accountName: '',
			accountMask: null,
			accountType: null,
			accountSubtype: null,
			balanceCurrent: row.balanceCurrent,
			balanceAvailable: row.balanceAvailable
		})),
		rows[0]?.snapshotTime ?? new Date().toISOString()
	);
}

export function loadInvestmentContributionTimeline(
	itemLabel: string,
	useDummyData = false
): InvestmentContributionTimeline | null {
	if (!isInvestingAccountLabel(itemLabel)) {
		return null;
	}

	ensureBaselineTotals();

	const trimmedLabel = itemLabel.trim();
	const baseline = readInvestmentBaselineAmount(trimmedLabel);
	if (baseline == null) {
		return null;
	}

	const trackingStartDate = resolveInvestmentTrackingStartDate(trimmedLabel, useDummyData);
	const db = getDatabase();
	const rows = trackingStartDate
		? (db
				.prepare(
					`
			SELECT
				transaction_date AS transactionDate,
				contribution_delta AS contributionDelta
			FROM ${INVESTMENT_PROCESSED_TRANSACTIONS_TABLE}
			WHERE plaid_item_label = ?
				AND contribution_delta != 0
				AND transaction_date IS NOT NULL
				AND transaction_date > ?
			ORDER BY transaction_date ASC, investment_transaction_id ASC
		`
				)
				.all(trimmedLabel, trackingStartDate) as Array<{
				transactionDate: string;
				contributionDelta: number;
			}>)
		: [];

	const deltasByDate = new Map<string, number>();

	for (const row of rows) {
		deltasByDate.set(
			row.transactionDate,
			roundMoney((deltasByDate.get(row.transactionDate) ?? 0) + row.contributionDelta)
		);
	}

	return {
		baseline: roundMoney(baseline),
		trackingStartDate,
		steps: buildContributionTimelineSteps(baseline, trackingStartDate, deltasByDate)
	};
}

function buildContributionTimelineSteps(
	baseline: number,
	trackingStartDate: string | null,
	deltasByDate: Map<string, number>
): InvestmentContributionTimeline['steps'] {
	const steps: InvestmentContributionTimeline['steps'] = [];

	if (trackingStartDate) {
		steps.push({ sortDate: trackingStartDate, contributions: roundMoney(baseline) });
	}

	let running = roundMoney(baseline);

	for (const [sortDate, delta] of [...deltasByDate.entries()].sort(([left], [right]) =>
		left.localeCompare(right)
	)) {
		if (trackingStartDate && sortDate <= trackingStartDate) {
			continue;
		}

		if (delta <= 0) {
			continue;
		}

		running = roundMoney(running + delta);
		steps.push({ sortDate, contributions: running });
	}

	return steps;
}

function latestContributionsFromTimeline(timeline: InvestmentContributionTimeline): number {
	return timeline.steps.at(-1)?.contributions ?? timeline.baseline;
}

export function loadInvestmentAccountStats(
	itemLabel: string,
	balance: number | null
): InvestmentAccountStats | null {
	if (!isInvestingAccountLabel(itemLabel) || balance == null) {
		return null;
	}

	const timeline = loadInvestmentContributionTimeline(itemLabel);
	if (!timeline) {
		return null;
	}

	const contributions = latestContributionsFromTimeline(timeline);
	const earnings = roundMoney(balance - contributions);

	return {
		contributions,
		earnings,
		contributionsLabel: money.format(contributions),
		earningsLabel: money.format(earnings)
	};
}

export function loadInvestmentStatsByLabel(
	accounts: Array<{ label: string; balance: number | null }>
): Record<string, InvestmentAccountStats> {
	const stats: Record<string, InvestmentAccountStats> = {};

	for (const account of accounts) {
		const itemStats = loadInvestmentAccountStats(account.label, account.balance);
		if (itemStats) {
			stats[account.label] = itemStats;
		}
	}

	return stats;
}
