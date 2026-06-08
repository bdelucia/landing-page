import { bankBrandColor } from '$lib/hooks/finances/account-balances';
import {
	accountSeriesKey,
	type AccountBalanceChartPoint,
	type BankAccountDetail,
	type BankAccountItem
} from '$lib/hooks/finances/bank-accounts';
import { chartColorForAccount, type ChartConfig } from '$lib/components/ui/chart/chart-utils';
import { formatChartDayLabel, isoInstantToDayKey } from '$lib/hooks/chart/chart-date';
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

function toDayKey(snapshotTime: string): string {
	return isoInstantToDayKey(snapshotTime);
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

function latestSnapshotPerAccountDay(rows: SnapshotRow[]): SnapshotRow[] {
	const latest = new Map<string, SnapshotRow>();

	for (const row of rows) {
		const mapKey = `${toDayKey(row.snapshotTime)}\0${row.accountId}`;
		const existing = latest.get(mapKey);
		if (!existing || row.snapshotTime > existing.snapshotTime) {
			latest.set(mapKey, row);
		}
	}

	return [...latest.values()].sort((a, b) => a.snapshotTime.localeCompare(b.snapshotTime));
}

function pivotSnapshots(
	rows: SnapshotRow[],
	accounts: BankAccountItem[],
	itemIsDebt = false
): AccountBalanceChartPoint[] {
	const debtByAccountId = new Map(
		accounts.map((account) => [account.id, account.isDebt ?? itemIsDebt])
	);
	const byDay = new Map<string, AccountBalanceChartPoint>();

	for (const row of rows) {
		const seriesKey = accountSeriesKey(row.accountId);
		const dayKey = toDayKey(row.snapshotTime);
		const existing = byDay.get(dayKey) ?? {
			date: formatChartDayLabel(dayKey),
			sortDate: dayKey
		};

		const isDebt = debtByAccountId.get(row.accountId) ?? itemIsDebt;
		const balance = row.balanceCurrent;
		existing[seriesKey] = isDebt ? -Math.abs(balance) : balance;
		byDay.set(dayKey, existing);
	}

	return [...byDay.values()].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

function fetchSnapshotRows({
	accountIds,
	itemLabel,
	itemId,
	tableName
}: FetchSnapshotInput): SnapshotRow[] {
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
		SELECT
			snapshot_time AS snapshotTime,
			plaid_account_id AS accountId,
			account_name AS accountName,
			account_mask AS accountMask,
			COALESCE(balance_current, balance_available) AS balanceCurrent
		FROM ${tableName}
		WHERE (${scopeClauses.join(' OR ')})
			AND COALESCE(balance_current, balance_available) IS NOT NULL
		ORDER BY snapshot_time ASC
	`);

	const rows = statement.all(...params) as Array<{
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
	const snapshotRows = latestSnapshotPerAccountDay(
		fetchSnapshotRows({
			accountIds: accounts.map((account) => account.id),
			itemLabel: bankLabel,
			itemId,
			tableName
		})
	);
	const chartData = pivotSnapshots(snapshotRows, accounts, itemIsDebt);
	const headerAccounts = accountsForChartHeader(accounts, snapshotRows);

	return {
		accounts,
		headerAccounts,
		chartData,
		chartConfig,
		isDummyData: useDummyData
	};
}
