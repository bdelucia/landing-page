import { bankBrandColor } from '$lib/hooks/finances/account-balances';
import {
	accountSeriesKey,
	type AccountBalanceChartPoint,
	type BankAccountDetail,
	type BankAccountItem
} from '$lib/hooks/finances/bank-accounts';
import { chartColorForAccount, type ChartConfig } from '$lib/components/ui/chart/chart-utils';
import {
	formatChartDayLabel,
	isoInstantToDayKey,
	iterDayKeysInRange,
	parseSnapshotInstant
} from '$lib/hooks/chart/chart-date';
import {
	ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE,
	ACCOUNT_BALANCE_SNAPSHOTS_TABLE,
	getDatabase
} from '$lib/server/db/database';

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

export type BalanceChartItemDiagnostics = {
	label: string;
	scopedAccountCount: number;
	fetchedRowCount: number;
	fetchedDistinctSnapshotDays: number;
	chartPointCount: number;
	chartDayRange: { start: string | null; end: string | null };
	chartSortDates: string[];
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

function resolveScopedAccountIds({
	accountIds,
	itemLabel,
	itemId,
	tableName
}: FetchSnapshotInput): string[] {
	const scopeClauses: string[] = [];
	const params: Array<string> = [];

	if (itemLabel) {
		scopeClauses.push('plaid_item_label = ?');
		params.push(itemLabel);
	}

	if (itemId) {
		scopeClauses.push('plaid_item_id = ?');
		params.push(itemId);
	}

	if (accountIds.length > 0) {
		const placeholders = accountIds.map(() => '?').join(', ');
		scopeClauses.push(`plaid_account_id IN (${placeholders})`);
		params.push(...accountIds);
	}

	if (scopeClauses.length === 0) return [];

	const db = getDatabase();
	const statement = db.prepare(`
		SELECT DISTINCT plaid_account_id AS accountId
		FROM ${tableName}
		WHERE (${scopeClauses.join(' OR ')})
	`);

	const rows = statement.all(...params) as Array<{ accountId: string }>;
	return rows.map((row) => row.accountId);
}

function fetchSnapshotRows(input: FetchSnapshotInput): SnapshotRow[] {
	const scopedAccountIds = resolveScopedAccountIds(input);
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

function distinctSnapshotDays(rows: SnapshotRow[]): number {
	return new Set(rows.map((row) => toDayKey(row.snapshotTime))).size;
}

export function diagnoseBalanceChartForItem({
	accounts,
	bankLabel,
	itemId = null,
	useDummyData
}: Omit<BuildHistoryInput, 'itemIsDebt'>): BalanceChartItemDiagnostics {
	const label = bankLabel ?? 'unknown';
	const tableName = useDummyData
		? ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE
		: ACCOUNT_BALANCE_SNAPSHOTS_TABLE;

	if (accounts.length === 0 || !bankLabel) {
		return {
			label,
			scopedAccountCount: 0,
			fetchedRowCount: 0,
			fetchedDistinctSnapshotDays: 0,
			chartPointCount: 0,
			chartDayRange: { start: null, end: null },
			chartSortDates: []
		};
	}

	const scopedAccountIds = resolveScopedAccountIds({
		accountIds: accounts.map((account) => account.id),
		itemLabel: bankLabel,
		itemId,
		tableName
	});
	const snapshotRows = fetchSnapshotRows({
		accountIds: accounts.map((account) => account.id),
		itemLabel: bankLabel,
		itemId,
		tableName
	});
	const chartData = buildDailyChartPoints(snapshotRows, accounts);

	return {
		label,
		scopedAccountCount: scopedAccountIds.length,
		fetchedRowCount: snapshotRows.length,
		fetchedDistinctSnapshotDays: distinctSnapshotDays(snapshotRows),
		chartPointCount: chartData.length,
		chartDayRange: {
			start: chartData[0]?.sortDate ?? null,
			end: chartData.at(-1)?.sortDate ?? null
		},
		chartSortDates: chartData.map((point) => point.sortDate)
	};
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

	return {
		accounts,
		headerAccounts,
		chartData,
		chartConfig,
		isDummyData: useDummyData
	};
}
