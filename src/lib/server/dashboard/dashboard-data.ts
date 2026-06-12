import type {
	DashboardFinances,
	DashboardNews,
	DashboardWeather
} from '$lib/hooks/dashboard/dashboard-data';
import { apiSecrets } from '$lib/server/config/secrets';
import { isPlaidLinked } from '$lib/server/config/integration-config';
import { loadLatestBalancesFromDb } from '$lib/server/balances/latest-balance-snapshots';
import { prepareBalanceSnapshots } from '$lib/server/balances/sandbox-balance-snapshots';
import { withCache } from '$lib/server/db/cache';
import { fetchCurrentWeather } from '$lib/server/weather/open-weather';
import {
	fetchRecentTransactions,
	DASHBOARD_TRANSACTION_FETCH_COUNT
} from '$lib/server/plaid/plaid-transactions';
import { syncInvestmentContributions } from '$lib/server/investments/investment-contributions';
import { loadNewsArticlesFromDb } from '$lib/server/news/news-store';
import {
	getConfiguredNewsCategories,
	syncNews,
	type NewsSyncResult
} from '$lib/server/news/news-sync';

export type {
	DashboardFinances,
	DashboardNews,
	DashboardWeather
} from '$lib/hooks/dashboard/dashboard-data';

export function loadDashboardWeather(): Promise<DashboardWeather> {
	return fetchCurrentWeather()
		.then(({ weather, error }) => ({ weather, weatherError: error }))
		.catch((error: unknown) => ({
			weather: null,
			weatherError: error instanceof Error ? error.message : 'Failed to load weather'
		}));
}

/** Re-sync at most this often when the page is loaded without a cron job running. */
const NEWS_LAZY_SYNC_TTL_MS = 10 * 60 * 1000;
/** Consider stored news stale after this long without a sync. */
const NEWS_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function isNewsStale(lastSyncedAt: string | null): boolean {
	if (!lastSyncedAt) return true;
	// SQLite datetime('now') has no timezone suffix but is UTC.
	const syncedAt = new Date(
		lastSyncedAt.endsWith('Z') || lastSyncedAt.includes('+') ? lastSyncedAt : `${lastSyncedAt}Z`
	);
	return Date.now() - syncedAt.getTime() > NEWS_STALE_AFTER_MS;
}

export async function loadDashboardNews(): Promise<DashboardNews> {
	try {
		let syncResult: NewsSyncResult | null = null;
		const stored = loadNewsArticlesFromDb();

		// Configured sources that have no stored articles yet — e.g. an API key
		// was just added after the last sync ran.
		const missingCategories = getConfiguredNewsCategories().filter(
			(category) => !stored.categoriesPresent.includes(category)
		);

		// The cron job normally keeps the table fresh; this lazy sync covers
		// first runs, newly added API keys, and local dev. The cache key includes
		// the missing categories so adding a key bypasses the previous cached sync,
		// while still stopping every page load from re-syncing.
		if (stored.isEmpty || missingCategories.length > 0 || isNewsStale(stored.lastSyncedAt)) {
			syncResult = await withCache(
				`news:lazy-sync:${missingCategories.join('+') || 'fresh'}`,
				NEWS_LAZY_SYNC_TTL_MS,
				() => syncNews()
			);
		}

		const refreshed = syncResult ? loadNewsArticlesFromDb() : stored;
		const errors: DashboardNews['errors'] = {};
		for (const failure of syncResult?.failures ?? []) {
			errors[failure.category] = failure.error;
		}

		return {
			articles: refreshed.articles,
			errors,
			lastSyncedAt: refreshed.lastSyncedAt
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load news';
		return {
			articles: [],
			errors: { ai: message, gaming: message, local: message },
			lastSyncedAt: null
		};
	}
}

export async function loadDashboardFinances(): Promise<DashboardFinances> {
	try {
		const transactionsResult = await fetchRecentTransactions(DASHBOARD_TRANSACTION_FETCH_COUNT);

		if (!isPlaidLinked(apiSecrets)) {
			return {
				transactions: transactionsResult.transactions,
				transactionsError: transactionsResult.error,
				accounts: [],
				accountBalancesError: 'Plaid access token is not set in secrets.local.ts',
				bankAccountDetails: {},
				bankAccountDetailsError: 'Plaid access token is not set in secrets.local.ts'
			};
		}

		if (apiSecrets.plaid.environment === 'sandbox') {
			await prepareBalanceSnapshots(apiSecrets.plaid);
		} else {
			await syncInvestmentContributions(apiSecrets.plaid);
		}

		const balances = loadLatestBalancesFromDb(apiSecrets.plaid);

		return {
			transactions: transactionsResult.transactions,
			transactionsError: transactionsResult.error,
			accounts: balances.accounts,
			accountBalancesError: balances.error,
			bankAccountDetails: balances.byItemId,
			bankAccountDetailsError: balances.error
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Failed to load account data';
		return {
			transactions: [],
			transactionsError: message,
			accounts: [],
			accountBalancesError: message,
			bankAccountDetails: {},
			bankAccountDetailsError: message
		};
	}
}
