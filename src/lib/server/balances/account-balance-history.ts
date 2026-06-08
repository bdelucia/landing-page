import { bankBrandColor } from '$lib/hooks/finances/account-balances';
import {
	accountSeriesKey,
	type AccountBalanceChartPoint,
	type BankAccountDetail,
	type BankAccountItem
} from '$lib/hooks/finances/bank-accounts';
import { chartColorForAccount, type ChartConfig } from '$lib/components/ui/chart/chart-utils';
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
	useDummyData: boolean;
};

function formatChartDate(isoDate: string): string {
	const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toDayKey(snapshotTime: string): string {
	return snapshotTime.slice(0, 10);
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
		if (!existing || row.snapshotTime > existing.snapshotTime) {
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

function pivotSnapshots(
	rows: SnapshotRow[],
	accounts: BankAccountItem[]
): AccountBalanceChartPoint[] {
	const accountKeys = new Map(
		accounts.map((account) => [account.id, accountSeriesKey(account.id)])
	);
	const byDay = new Map<string, AccountBalanceChartPoint>();

	for (const row of rows) {
		const seriesKey = accountKeys.get(row.accountId);
		if (!seriesKey) continue;

		const dayKey = toDayKey(row.snapshotTime);
		const existing = byDay.get(dayKey) ?? {
			date: formatChartDate(dayKey),
			sortDate: dayKey
		};

		const account = accounts.find((entry) => entry.id === row.accountId);
		const balance = row.balanceCurrent;
		existing[seriesKey] = account?.isDebt ? -Math.abs(balance) : balance;
		byDay.set(dayKey, existing);
	}

	return [...byDay.values()].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

function fetchSnapshotRows(
	accountIds: string[],
	tableName: typeof ACCOUNT_BALANCE_SNAPSHOTS_TABLE | typeof ACCOUNT_BALANCE_SNAPSHOTS_DUMMY_TABLE
): SnapshotRow[] {
	if (accountIds.length === 0) return [];

	const db = getDatabase();
	const placeholders = accountIds.map(() => '?').join(', ');
	const statement = db.prepare(`
		SELECT
			snapshot_time AS snapshotTime,
			plaid_account_id AS accountId,
			account_name AS accountName,
			account_mask AS accountMask,
			balance_current AS balanceCurrent
		FROM ${tableName}
		WHERE plaid_account_id IN (${placeholders})
			AND balance_current IS NOT NULL
		ORDER BY snapshot_time ASC
	`);

	const rows = statement.all(...accountIds) as Array<{
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
	useDummyData
}: BuildHistoryInput): BankAccountDetail {
	const chartConfig = buildChartConfig(accounts, bankLabel);

	if (accounts.length === 0) {
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
	const snapshotRows = fetchSnapshotRows(
		accounts.map((account) => account.id),
		tableName
	);
	const chartData = pivotSnapshots(snapshotRows, accounts);
	const headerAccounts = accountsForChartHeader(accounts, snapshotRows);

	return {
		accounts,
		headerAccounts,
		chartData,
		chartConfig,
		isDummyData: useDummyData
	};
}
