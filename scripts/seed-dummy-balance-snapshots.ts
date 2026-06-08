import { personalSecrets } from '../src/data/personal-info.local.ts';
import type { PlaidConfig, PlaidLinkedItem } from '../src/data/personal-info.types.ts';
import {
	dummySnapshotAccountFromBankItem,
	ensureDummyBalanceSnapshots
} from '../src/lib/server/dummy-balance-snapshots.ts';
import { getDatabase } from '../src/lib/server/database.ts';
import { createPlaidClient } from '../src/lib/server/plaid.ts';

function hasValue(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function getPlaidLinkedItems(plaid: PlaidConfig): PlaidLinkedItem[] {
	if (plaid.items?.length) {
		return plaid.items.filter((item) => hasValue(item.accessToken));
	}
	if (hasValue(plaid.accessToken)) {
		return [{ accessToken: plaid.accessToken, itemId: plaid.itemId }];
	}
	return [];
}

function isPlaidLinked(): boolean {
	const plaid = personalSecrets.plaid;
	return (
		!!plaid &&
		hasValue(plaid.clientId) &&
		hasValue(plaid.secret) &&
		getPlaidLinkedItems(plaid).length > 0
	);
}

function resolveItemLabel(item: PlaidLinkedItem): string {
	return item.label?.trim() || 'Account';
}

async function main(): Promise<void> {
	if (!isPlaidLinked()) {
		console.error('Plaid is not configured in personal-info.local.ts');
		process.exit(1);
	}

	const { plaid } = personalSecrets;
	if (!plaid) {
		process.exit(1);
	}

	if (plaid.environment !== 'sandbox') {
		console.error('Refusing to seed dummy snapshots unless plaid.environment is sandbox.');
		process.exit(1);
	}

	getDatabase();
	const client = createPlaidClient(plaid);
	const linkedItems = getPlaidLinkedItems(plaid);
	let totalAccounts = 0;

	for (const item of linkedItems) {
		const itemLabel = resolveItemLabel(item);
		const response = await client.accountsBalanceGet({ access_token: item.accessToken });
		const seedAccounts = response.data.accounts.map((account) =>
			dummySnapshotAccountFromBankItem(
				{
					id: account.account_id,
					itemId: item.itemId ?? item.accessToken,
					typeLabel: account.subtype ?? account.type ?? 'Account',
					mask: account.mask?.trim() ?? null,
					balanceLabel: '',
					balance: account.balances.current ?? account.balances.available ?? 0
				},
				account.name,
				account.type ?? null,
				account.subtype ?? null
			)
		);

		ensureDummyBalanceSnapshots(seedAccounts, itemLabel, item.itemId ?? null);
		totalAccounts += seedAccounts.length;
		console.log(`Seeded ${seedAccounts.length} account(s) for ${itemLabel}`);
	}

	console.log(`Done. Ensured 2 years of dummy snapshots for ${totalAccounts} account(s).`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
