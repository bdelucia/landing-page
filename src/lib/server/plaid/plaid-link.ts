import { CountryCode, Products } from 'plaid';
import type { PlaidConfig, PlaidLinkedItem } from '$data/api-config.types';
import { getPlaidLinkedItems } from '$lib/server/config/integration-config';
import { resolvePlaidItemLabel, plaidItemSlug } from '$lib/plaid/plaid-item-slug';
import { createPlaidClient, formatPlaidApiError } from '$lib/server/plaid/plaid';
import { invalidatePlaidItemRegistry } from '$lib/server/plaid/plaid-item-registry';
import { savePlaidTokenOverride } from '$lib/server/plaid/plaid-token-overrides';

export type PlaidItemStatus = {
	label: string;
	slug: string;
	itemId: string | null;
	needsRelink: boolean;
	error: string | null;
};

export function findLinkedItemBySlug(
	plaid: PlaidConfig,
	slug: string
): PlaidLinkedItem | null {
	const normalizedSlug = slug.trim().toLowerCase();

	for (const item of getPlaidLinkedItems(plaid)) {
		const label = resolvePlaidItemLabel(item);
		if (plaidItemSlug(label) === normalizedSlug) {
			return item;
		}
	}

	return null;
}

export async function getPlaidItemStatuses(plaid: PlaidConfig): Promise<PlaidItemStatus[]> {
	const client = createPlaidClient(plaid);
	const statuses: PlaidItemStatus[] = [];

	for (const item of getPlaidLinkedItems(plaid)) {
		const label = resolvePlaidItemLabel(item);
		const slug = plaidItemSlug(label);

		try {
			const response = await client.itemGet({ access_token: item.accessToken });
			const itemError = response.data.item.error;
			const needsRelink = itemError?.error_code === 'ITEM_LOGIN_REQUIRED';

			statuses.push({
				label,
				slug,
				itemId: response.data.item.item_id,
				needsRelink,
				error: needsRelink
					? (itemError.display_message ?? itemError.error_message ?? 'Login required')
					: null
			});
		} catch (error) {
			const message = formatPlaidApiError(error);
			const needsRelink =
				message.toLowerCase().includes('login') ||
				message.toLowerCase().includes('item_login_required');

			statuses.push({
				label,
				slug,
				itemId: item.itemId ?? null,
				needsRelink,
				error: message
			});
		}
	}

	return statuses;
}

export async function createUpdateLinkToken(
	plaid: PlaidConfig,
	item: PlaidLinkedItem
): Promise<string> {
	const client = createPlaidClient(plaid);
	const response = await client.linkTokenCreate({
		user: { client_user_id: 'owner' },
		client_name: 'landing-page',
		country_codes: [CountryCode.Us],
		language: 'en',
		products: [Products.Transactions, Products.Investments],
		access_token: item.accessToken
	});

	return response.data.link_token;
}

export type ExchangePublicTokenResult = {
	accessToken: string;
	itemId: string;
	label: string;
};

export async function exchangePublicTokenForItem(
	plaid: PlaidConfig,
	publicToken: string,
	label: string
): Promise<ExchangePublicTokenResult> {
	const client = createPlaidClient(plaid);
	const response = await client.itemPublicTokenExchange({ public_token: publicToken });
	const accessToken = response.data.access_token;
	const itemId = response.data.item_id;

	savePlaidTokenOverride(label, accessToken);
	invalidatePlaidItemRegistry();

	return { accessToken, itemId, label };
}
