import { getDatabase } from '$lib/server/db/database';
import type { PlaidLinkedItem } from '$data/api-config.types';

const METADATA_KEY = 'plaid_access_token_by_label';

function ensureMetadataTable(): void {
	const db = getDatabase();
	db.exec(`
		CREATE TABLE IF NOT EXISTS app_metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);
}

export function loadPlaidTokenOverrides(): Map<string, string> {
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

export function savePlaidTokenOverride(label: string, accessToken: string): void {
	ensureMetadataTable();
	const normalizedLabel = label.trim();
	const overrides = loadPlaidTokenOverrides();
	overrides.set(normalizedLabel, accessToken.trim());

	const db = getDatabase();
	db.prepare(
		`
		INSERT INTO app_metadata (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`
	).run(METADATA_KEY, JSON.stringify(Object.fromEntries(overrides)));
}

export function applyPlaidTokenOverrides(items: PlaidLinkedItem[]): PlaidLinkedItem[] {
	const overrides = loadPlaidTokenOverrides();
	if (overrides.size === 0) return items;

	return items.map((item) => {
		const label = item.label?.trim() || 'Account';
		const overrideToken = overrides.get(label);
		if (!overrideToken) return item;

		return {
			...item,
			accessToken: overrideToken
		};
	});
}
