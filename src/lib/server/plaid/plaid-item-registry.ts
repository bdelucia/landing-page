import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import { getDatabase } from '$lib/server/db/database';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid/plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';

const METADATA_KEY = 'plaid_item_id_by_label';

type Registry = {
	byItemId: Map<string, PlaidLinkedItem>;
	itemIdByAccessToken: Map<string, string>;
};

let cachedRegistry: Registry | null = null;

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
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

function loadPersistedItemLabels(): Map<string, string> {
	ensureMetadataTable();
	const db = getDatabase();
	const row = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get(METADATA_KEY) as
		| { value: string }
		| undefined;

	if (!row) return new Map();

	try {
		const parsed = JSON.parse(row.value) as Record<string, string>;
		return new Map(Object.entries(parsed));
	} catch {
		return new Map();
	}
}

function persistItemLabels(byItemId: Map<string, string>): void {
	ensureMetadataTable();
	const db = getDatabase();
	const value = JSON.stringify(Object.fromEntries(byItemId));

	db.prepare(
		`
		INSERT INTO app_metadata (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`
	).run(METADATA_KEY, value);
}

function linkedItemFromLabel(
	plaid: PlaidConfig,
	label: string,
	persistedItemId: string
): PlaidLinkedItem | null {
	for (const item of getPlaidLinkedItems(plaid)) {
		if (resolveItemLabel(item) === label) {
			return {
				...item,
				itemId: item.itemId ?? persistedItemId
			};
		}
	}

	return null;
}

function registryFromConfiguredItemIds(plaid: PlaidConfig): Registry {
	const byItemId = new Map<string, PlaidLinkedItem>();
	const itemIdByAccessToken = new Map<string, string>();

	for (const item of getPlaidLinkedItems(plaid)) {
		if (item.itemId) {
			byItemId.set(item.itemId, item);
			itemIdByAccessToken.set(item.accessToken, item.itemId);
		}
	}

	return { byItemId, itemIdByAccessToken };
}

/** Resolves Plaid webhook `item_id` values to linked Items using stored access tokens. */
export async function ensurePlaidItemRegistry(plaid: PlaidConfig): Promise<Registry> {
	if (cachedRegistry) {
		return cachedRegistry;
	}

	const registry = registryFromConfiguredItemIds(plaid);
	const persistedLabels = loadPersistedItemLabels();
	const labelsToPersist = new Map<string, string>();
	const client = createPlaidClient(plaid);

	for (const item of getPlaidLinkedItems(plaid)) {
		const label = resolveItemLabel(item);

		if (item.itemId) {
			labelsToPersist.set(item.itemId, label);
			continue;
		}

		const knownItemId = [...registry.itemIdByAccessToken.entries()].find(
			([accessToken]) => accessToken === item.accessToken
		)?.[1];

		if (knownItemId) {
			continue;
		}

		for (const [persistedItemId, persistedLabel] of persistedLabels.entries()) {
			if (persistedLabel !== label) continue;

			const linkedItem = linkedItemFromLabel(plaid, label, persistedItemId);
			if (!linkedItem) continue;

			registry.byItemId.set(persistedItemId, linkedItem);
			registry.itemIdByAccessToken.set(item.accessToken, persistedItemId);
			labelsToPersist.set(persistedItemId, label);
		}

		if (registry.itemIdByAccessToken.has(item.accessToken)) {
			continue;
		}

		try {
			const response = await client.itemGet({ access_token: item.accessToken });
			const discoveredItemId = response.data.item.item_id;

			registry.byItemId.set(discoveredItemId, {
				...item,
				itemId: discoveredItemId
			});
			registry.itemIdByAccessToken.set(item.accessToken, discoveredItemId);
			labelsToPersist.set(discoveredItemId, label);
		} catch (error) {
			console.warn(
				`Failed to resolve Plaid item_id for "${label}" via itemGet: ${formatPlaidApiError(error)}`
			);
		}
	}

	persistItemLabels(labelsToPersist);
	cachedRegistry = registry;

	return registry;
}

export async function findLinkedItemByPlaidItemId(
	plaid: PlaidConfig,
	plaidItemId: string
): Promise<PlaidLinkedItem | null> {
	for (const item of getPlaidLinkedItems(plaid)) {
		if (item.itemId === plaidItemId) {
			return item;
		}
	}

	const registry = await ensurePlaidItemRegistry(plaid);
	return registry.byItemId.get(plaidItemId) ?? null;
}

export async function resolvePlaidItemIdForItem(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<string | null> {
	if (item.itemId) {
		return item.itemId;
	}

	const registry = await ensurePlaidItemRegistry(plaid);
	return registry.itemIdByAccessToken.get(item.accessToken) ?? null;
}
