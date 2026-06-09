import { bankBrandColor, isInvestingAccountLabel } from '$lib/hooks/finances/account-balances';
import {
	accountSeriesKey,
	type AccountBalanceChartPoint,
	type BankAccountDetail,
	type BankAccountItem
} from '$lib/hooks/finances/bank-accounts';
import { chartColorForAccount, type ChartConfig } from '$lib/components/ui/chart/chart-utils';
import {
	currentChartDayKey,
	formatChartDayLabel,
	isoInstantToDayKey,
	iterDayKeysInRange,
	parseSnapshotInstant
} from '$lib/hooks/chart/chart-date';
import { resolveScopedAccountIdsForItem } from '$lib/server/balances/snapshot-item-scope';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';
import { loadInvestmentContributionTimeline } from '$lib/server/investments/investment-contributions';

type SnapshotRow = {
	snapshotTime: string;
	accountId: string;
	accountName: string;
	accountMask: string | null;
	balanceCurrent: number;
};

type BuildHistoryInput = {
	accounts: BankAccountItem[];
	bankLabel?: string;
	itemId?: string | null;
	itemIsDebt?: boolean;
	useDummyData: boolean;
};

type FetchSnapshotInput = {
	accountIds: string[];
	itemLabel?: string;
	itemId?: string | null;
	tableName: typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE | typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE;
};

function toDayKey(snapshotTime: string): string {
	return isoInstantToDayKey(snapshotTime);
}

function compareSnapshotTimes(left: string, right: string): number {
	return parseSnapshotInstant(left).getTime() - parseSnapshotInstant(right).getTime();
}

function buildChartConfig(accounts: BankAccountItem[], bankLabel?: string): ChartConfig {
	const config: ChartConfig = {};
	const bankColor = bankLabel ? bankBrandColor(bankLabel) : null;

	for (const [index, account] of accounts.entries()) {
		const key = accountSeriesKey(account.id);
		config[key] = {
			label: account.typeLabel,
			color: bankColor ?? chartColorForAccount(account.typeLabel, index)
		};
	}

	return config;
}

function latestMaskByAccountId(rows: SnapshotRow[]): Map<string, string | null> {
	const latest = new Map<string, { snapshotTime: string; mask: string | null }>();

	for (const row of rows) {
		const existing = latest.get(row.accountId);
		if (!existing || compareSnapshotTimes(row.snapshotTime, existing.snapshotTime) > 0) {
			latest.set(row.accountId, {
				snapshotTime: row.snapshotTime,
				mask: row.accountMask
			});
		}
	}

	return new Map([...latest.entries()].map(([accountId, entry]) => [accountId, entry.mask]));
}

function hasChartHeaderMask(
	account: BankAccountItem,
	latestMaskByAccount: Map<string, string | null>
): boolean {
	if (latestMaskByAccount.has(account.id)) {
		const mask = latestMaskByAccount.get(account.id);
		return mask != null && mask.trim().length > 0;
	}

	return account.mask != null && account.mask.trim().length > 0;
}

function accountsForChartHeader(
	accounts: BankAccountItem[],
	snapshotRows: SnapshotRow[]
): BankAccountItem[] {
	const latestMaskByAccount = latestMaskByAccountId(snapshotRows);
	return accounts.filter(
		(account) => account.forceChartHeader || hasChartHeaderMask(account, latestMaskByAccount)
	);
}

function latestSnapshotPerAccountDay(rows: SnapshotRow[]): SnapshotRow[] {
	const latest = new Map<string, SnapshotRow>();

	for (const row of rows) {
		const mapKey = `${toDayKey(row.snapshotTime)}\0${row.accountId}`;
		const existing = latest.get(mapKey);
		if (!existing || compareSnapshotTimes(row.snapshotTime, existing.snapshotTime) > 0) {
			latest.set(mapKey, row);
		}
	}

	return [...latest.values()].sort((a, b) => compareSnapshotTimes(a.snapshotTime, b.snapshotTime));
}

function signedBalance(balance: number, isDebt: boolean): number {
	return isDebt ? -Math.abs(balance) : balance;
}

function buildDailyChartPoints(
	rows: SnapshotRow[],
	accounts: BankAccountItem[],
	itemIsDebt = false
): AccountBalanceChartPoint[] {
	const reducedRows = latestSnapshotPerAccountDay(rows);
	if (reducedRows.length === 0) return [];

	const debtByAccountId = new Map(
		accounts.map((account) => [account.id, account.isDebt ?? itemIsDebt])
	);
	const balanceByAccountDay = new Map<string, Map<string, number>>();
	let minDayKey = toDayKey(reducedRows[0]!.snapshotTime);
	let maxDayKey = minDayKey;

	for (const row of reducedRows) {
		const dayKey = toDayKey(row.snapshotTime);
		minDayKey = dayKey < minDayKey ? dayKey : minDayKey;
		maxDayKey = dayKey > maxDayKey ? dayKey : maxDayKey;

		const accountDays = balanceByAccountDay.get(row.accountId) ?? new Map<string, number>();
		accountDays.set(dayKey, row.balanceCurrent);
		balanceByAccountDay.set(row.accountId, accountDays);
	}

	const todayKey = currentChartDayKey();
	if (todayKey > maxDayKey) {
		maxDayKey = todayKey;
	}

	const accountIds = [...balanceByAccountDay.keys()];
	const points: AccountBalanceChartPoint[] = [];

	for (const dayKey of iterDayKeysInRange(minDayKey, maxDayKey)) {
		const point: AccountBalanceChartPoint = {
			date: formatChartDayLabel(dayKey),
			sortDate: dayKey
		};

		for (const accountId of accountIds) {
			const accountDays = balanceByAccountDay.get(accountId);
			if (!accountDays) continue;

			const knownDays = [...accountDays.keys()].filter((knownDay) => knownDay <= dayKey);
			if (knownDays.length === 0) continue;

			const latestKnownDay = knownDays.sort().at(-1)!;
			const balance = accountDays.get(latestKnownDay);
			if (balance == null) continue;

			const isDebt = debtByAccountId.get(accountId) ?? itemIsDebt;
			point[accountSeriesKey(accountId)] = signedBalance(balance, isDebt);
		}

		if (Object.keys(point).length > 2) {
			points.push(point);
		}
	}

	return points;
}

function fetchSnapshotRows(input: FetchSnapshotInput): SnapshotRow[] {
	const scopedAccountIds = resolveScopedAccountIdsForItem({
		itemLabel: input.itemLabel ?? '',
		itemId: input.itemId,
		tableName: input.tableName,
		accountIds: input.accountIds
	});
	if (scopedAccountIds.length === 0) return [];

	const placeholders = scopedAccountIds.map(() => '?').join(', ');
	const db = getDatabase();
	const statement = db.prepare(`
		SELECT
			snapshot_time AS snapshotTime,
			plaid_account_id AS accountId,
			account_name AS accountName,
			account_mask AS accountMask,
			COALESCE(balance_current, balance_available) AS balanceCurrent
		FROM ${input.tableName}
		WHERE plaid_account_id IN (${placeholders})
			AND COALESCE(balance_current, balance_available) IS NOT NULL
		ORDER BY snapshot_time ASC
	`);

	const rows = statement.all(...scopedAccountIds) as Array<{
		snapshotTime: string;
		accountId: string;
		accountName: string;
		accountMask: string | null;
		balanceCurrent: number;
	}>;

	return rows.map((row) => ({
		snapshotTime: row.snapshotTime,
		accountId: row.accountId,
		accountName: row.accountName,
		accountMask: row.accountMask,
		balanceCurrent: row.balanceCurrent
	}));
}

export function buildAccountBalanceHistory({
	accounts,
	bankLabel,
	itemId = null,
	itemIsDebt = false,
	useDummyData
}: BuildHistoryInput): BankAccountDetail {
	const chartConfig = buildChartConfig(accounts, bankLabel);

	if (accounts.length === 0 || !bankLabel) {
		return {
			accounts,
			headerAccounts: [],
			chartData: [],
			chartConfig,
			isDummyData: useDummyData
		};
	}

	const tableName = useDummyData
		? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE
		: ACCOUNT_BALANCE_SNAPSHOTS_TABLE;
	const snapshotRows = fetchSnapshotRows({
		accountIds: accounts.map((account) => account.id),
		itemLabel: bankLabel,
		itemId,
		tableName
	});
	const chartData = buildDailyChartPoints(snapshotRows, accounts, itemIsDebt);
	const headerAccounts = accountsForChartHeader(accounts, snapshotRows);
	const investmentContributionTimeline = isInvestingAccountLabel(bankLabel)
		? (loadInvestmentContributionTimeline(bankLabel, useDummyData) ?? undefined)
		: undefined;

	return {
		accounts,
		headerAccounts,
		chartData,
		chartConfig,
		isDummyData: useDummyData,
		investmentContributionTimeline
	};
}
