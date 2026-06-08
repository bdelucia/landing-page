import type { InvestmentTransaction } from 'plaid';

const REINVESTMENT_SUBTYPES = new Set([
	'dividend reinvestment',
	'interest reinvestment',
	'long-term capital gain reinvestment',
	'short-term capital gain reinvestment'
]);

const DIVIDEND_SUBTYPES = new Set([
	'dividend',
	'qualified dividend',
	'non-qualified dividend',
	'interest',
	'long-term capital gain',
	'short-term capital gain'
]);

const CASH_MOVEMENT_SUBTYPES = new Set([
	'deposit',
	'withdrawal',
	'contribution',
	'transfer',
	'distribution'
]);

export type InvestmentTransactionDecision =
	| { kind: 'contribution'; delta: number }
	| { kind: 'ignore'; reason: string };

function roundMoney(amount: number): number {
	return Math.round(amount * 100) / 100;
}

function absAmount(amount: number): number {
	return roundMoney(Math.abs(amount));
}

function hasSecurity(transaction: InvestmentTransaction): boolean {
	return Boolean(transaction.security_id?.trim());
}

function isCashMovementSubtype(subtype: string | undefined): boolean {
	if (!subtype) return false;
	return CASH_MOVEMENT_SUBTYPES.has(subtype);
}

/** External cash in/out — no linked security (e.g. bank transfer). */
export function isBankCashMovement(transaction: InvestmentTransaction): boolean {
	if (hasSecurity(transaction)) return false;

	if (transaction.type === 'cash' || transaction.type === 'fee') {
		return true;
	}

	return isCashMovementSubtype(transaction.subtype);
}

function isDividendSubtype(subtype: string | undefined): boolean {
	if (!subtype) return false;
	return DIVIDEND_SUBTYPES.has(subtype) || REINVESTMENT_SUBTYPES.has(subtype);
}

function isTransferLike(transaction: InvestmentTransaction): boolean {
	if (transaction.subtype === 'transfer') return true;
	if (transaction.type === 'transfer') return true;
	if (transaction.type === 'cash' && !hasSecurity(transaction)) return true;
	return false;
}

/** Dividend reinvestment reported as a single combined row. */
export function isStandaloneReinvestmentSubtype(transaction: InvestmentTransaction): boolean {
	return REINVESTMENT_SUBTYPES.has(transaction.subtype);
}

/** Match transfer + dividend on the same day for the same dollar amount. */
export function findDividendReinvestmentPairs(
	transactions: InvestmentTransaction[]
): Set<string> {
	const paired = new Set<string>();
	const byDate = new Map<string, InvestmentTransaction[]>();

	for (const transaction of transactions) {
		const day = transaction.date;
		const group = byDate.get(day) ?? [];
		group.push(transaction);
		byDate.set(day, group);
	}

	for (const dayTransactions of byDate.values()) {
		const dividends = dayTransactions.filter((transaction) =>
			isDividendSubtype(transaction.subtype)
		);
		const transfers = dayTransactions.filter((transaction) => isTransferLike(transaction));

		for (const dividend of dividends) {
			if (paired.has(dividend.investment_transaction_id)) continue;

			const match = transfers.find(
				(transfer) =>
					!paired.has(transfer.investment_transaction_id) &&
					absAmount(transfer.amount) === absAmount(dividend.amount)
			);

			if (match) {
				paired.add(dividend.investment_transaction_id);
				paired.add(match.investment_transaction_id);
			}
		}
	}

	return paired;
}

function isDividendReinvestment(
	transaction: InvestmentTransaction,
	reinvestmentPairs: Set<string>
): boolean {
	if (isStandaloneReinvestmentSubtype(transaction)) return true;
	return reinvestmentPairs.has(transaction.investment_transaction_id);
}

function contributionDeltaFromAmount(amount: number): number {
	return roundMoney(-amount);
}

/**
 * Decide how a Plaid investment transaction affects tracked contributions.
 * Earnings are always derived as balance minus contributions.
 */
export function classifyInvestmentTransaction(
	itemLabel: string,
	transaction: InvestmentTransaction,
	reinvestmentPairs: Set<string>
): InvestmentTransactionDecision {
	if (isDividendReinvestment(transaction, reinvestmentPairs)) {
		return { kind: 'ignore', reason: 'dividend reinvestment' };
	}

	const label = itemLabel.trim();

	if (label === 'Fidelity') {
		if (isBankCashMovement(transaction)) {
			return { kind: 'contribution', delta: contributionDeltaFromAmount(transaction.amount) };
		}

		if (transaction.subtype === 'contribution' || transaction.subtype === 'deposit') {
			return { kind: 'contribution', delta: contributionDeltaFromAmount(transaction.amount) };
		}

		return { kind: 'ignore', reason: 'in-account investment activity' };
	}

	if (label === 'Robinhood') {
		if (isBankCashMovement(transaction)) {
			return { kind: 'contribution', delta: contributionDeltaFromAmount(transaction.amount) };
		}

		return { kind: 'ignore', reason: 'in-account investment activity' };
	}

	return { kind: 'ignore', reason: 'unsupported investment item' };
}
