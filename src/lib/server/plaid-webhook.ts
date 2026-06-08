import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { recordPlaidBalanceSnapshotForItem } from '$lib/server/plaid-balance-snapshots';
import { personalSecrets } from '$lib/server/personal-secrets';
import { isPlaidConfigured } from '$lib/server/integration-config';
import { createPlaidClient } from '$lib/server/plaid';
import type { PlaidConfig } from '$data/personal-info.types';

type PlaidWebhookPayload = {
	webhook_type?: string;
	webhook_code?: string;
	item_id?: string;
};

const BALANCE_REFRESH_CODES = new Set([
	'SYNC_UPDATES_AVAILABLE',
	'DEFAULT_UPDATE',
	'TRANSACTIONS_REMOVED',
	'INITIAL_UPDATE',
	'HISTORICAL_UPDATE'
]);

const BALANCE_REFRESH_TYPES = new Set([
	'TRANSACTIONS',
	'INVESTMENTS_TRANSACTIONS',
	'HOLDINGS',
	'LIABILITIES'
]);

function shouldRefreshBalances(payload: PlaidWebhookPayload): boolean {
	const webhookType = payload.webhook_type?.trim();
	const webhookCode = payload.webhook_code?.trim();

	if (!webhookType || !webhookCode) {
		return false;
	}

	return BALANCE_REFRESH_TYPES.has(webhookType) && BALANCE_REFRESH_CODES.has(webhookCode);
}

function decodeBase64Url(value: string): Buffer {
	return Buffer.from(value, 'base64url');
}

function jwkToPem(jwk: { x: string; y: string; crv?: string }): string {
	const publicKey = createPublicKey({
		key: {
			kty: 'EC',
			crv: jwk.crv ?? 'P-256',
			x: jwk.x,
			y: jwk.y
		},
		format: 'jwk'
	});

	return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

async function fetchVerificationKey(plaid: PlaidConfig, keyId: string) {
	const client = createPlaidClient(plaid);
	const response = await client.webhookVerificationKeyGet({ key_id: keyId });
	return response.data.key;
}

export async function verifyPlaidWebhookRequest(
	rawBody: string,
	verificationHeader: string | null,
	plaid: PlaidConfig
): Promise<{ ok: true } | { ok: false; reason: string }> {
	if (process.env.PLAID_WEBHOOK_SKIP_VERIFICATION === '1') {
		return { ok: true };
	}

	if (!verificationHeader?.trim()) {
		return { ok: false, reason: 'Missing Plaid-Verification header' };
	}

	const parts = verificationHeader.split('.');
	if (parts.length !== 3) {
		return { ok: false, reason: 'Invalid Plaid-Verification JWT format' };
	}

	let header: { alg?: string; kid?: string };
	let payload: { request_body_sha256?: string };

	try {
		header = JSON.parse(decodeBase64Url(parts[0]!).toString('utf8')) as {
			alg?: string;
			kid?: string;
		};
		payload = JSON.parse(decodeBase64Url(parts[1]!).toString('utf8')) as {
			request_body_sha256?: string;
		};
	} catch {
		return { ok: false, reason: 'Unable to decode Plaid-Verification JWT' };
	}

	if (header.alg !== 'ES256' || !header.kid) {
		return { ok: false, reason: 'Unsupported Plaid-Verification JWT header' };
	}

	if (!payload.request_body_sha256) {
		return { ok: false, reason: 'Missing request_body_sha256 claim' };
	}

	const bodyHash = createHash('sha256').update(rawBody).digest('hex');
	const claimedHash = payload.request_body_sha256;

	if (
		bodyHash.length !== claimedHash.length ||
		!timingSafeEqual(Buffer.from(bodyHash), Buffer.from(claimedHash))
	) {
		return { ok: false, reason: 'Webhook body hash mismatch' };
	}

	try {
		const jwk = await fetchVerificationKey(plaid, header.kid);
		if (!jwk?.x || !jwk?.y) {
			return { ok: false, reason: 'Plaid verification key missing coordinates' };
		}

		const publicKey = createPublicKey({ key: jwkToPem(jwk), format: 'pem' });
		const signature = decodeBase64Url(parts[2]!);
		const signedData = `${parts[0]}.${parts[1]}`;
		const valid = verify(
			'sha256',
			Buffer.from(signedData),
			{ key: publicKey, dsaEncoding: 'ieee-p1363' },
			signature
		);

		if (!valid) {
			return { ok: false, reason: 'Invalid Plaid-Verification signature' };
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Webhook verification failed';
		return { ok: false, reason: message };
	}

	return { ok: true };
}

export type HandlePlaidWebhookResult = {
	accepted: boolean;
	refreshed: boolean;
	itemId: string | null;
	webhookType: string | null;
	webhookCode: string | null;
	message: string;
};

export async function handlePlaidWebhook(rawBody: string): Promise<HandlePlaidWebhookResult> {
	let payload: PlaidWebhookPayload;

	try {
		payload = JSON.parse(rawBody) as PlaidWebhookPayload;
	} catch {
		return {
			accepted: false,
			refreshed: false,
			itemId: null,
			webhookType: null,
			webhookCode: null,
			message: 'Invalid JSON payload'
		};
	}

	const webhookType = payload.webhook_type?.trim() ?? null;
	const webhookCode = payload.webhook_code?.trim() ?? null;
	const itemId = payload.item_id?.trim() ?? null;

	if (!isPlaidConfigured(personalSecrets)) {
		return {
			accepted: true,
			refreshed: false,
			itemId,
			webhookType,
			webhookCode,
			message: 'Plaid is not configured'
		};
	}

	if (!shouldRefreshBalances(payload)) {
		return {
			accepted: true,
			refreshed: false,
			itemId,
			webhookType,
			webhookCode,
			message: 'Webhook acknowledged without balance refresh'
		};
	}

	if (!itemId) {
		return {
			accepted: true,
			refreshed: false,
			itemId,
			webhookType,
			webhookCode,
			message: 'Balance webhook missing item_id'
		};
	}

	const result = await recordPlaidBalanceSnapshotForItem(itemId);

	return {
		accepted: true,
		refreshed: result.inserted > 0,
		itemId,
		webhookType,
		webhookCode,
		message:
			result.inserted > 0
				? `Stored ${result.inserted} balance snapshot row(s)`
				: (result.message ?? 'No balance rows inserted')
	};
}
