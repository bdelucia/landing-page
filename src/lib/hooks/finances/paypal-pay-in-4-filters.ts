import { transactionDayKey } from '$lib/hooks/finances/spending-time-range';
import type { TransactionItem } from '$lib/hooks/finances/transactions';

const PAYPAL_BANK_LABEL = 'PayPal';
const PAY_IN_4_INSTALLMENT_COUNT = 4;
const AMOUNT_TOLERANCE_CENTS = 1;

function amountCents(amount: number): number {
	return Math.round(Math.abs(amount) * 100);
}

function isPayPalPayIn4Transaction(transaction: TransactionItem): boolean {
	return (
		transaction.bankLabel === PAYPAL_BANK_LABEL && /pay\s*in\s*4/i.test(transaction.merchant)
	);
}

function payPalDayGroupKey(transaction: TransactionItem): string {
	return `${transaction.sourceId}:${transactionDayKey(transaction)}`;
}

/**
 * PayPal Pay in 4 posts the installment and the full purchase amount on the same day.
 * For spending, keep the installment and drop the duplicate full-loan charge.
 */
export function filterPayPalPayIn4LoanDuplicates(
	transactions: TransactionItem[]
): TransactionItem[] {
	const byPayPalDay = new Map<string, TransactionItem[]>();

	for (const transaction of transactions) {
		if (transaction.bankLabel !== PAYPAL_BANK_LABEL) continue;

		const key = payPalDayGroupKey(transaction);
		const group = byPayPalDay.get(key) ?? [];
		group.push(transaction);
		byPayPalDay.set(key, group);
	}

	const excludeIds = new Set<string>();

	for (const group of byPayPalDay.values()) {
		const payIn4Transactions = group.filter(isPayPalPayIn4Transaction);
		if (payIn4Transactions.length === 0) continue;

		for (const installment of payIn4Transactions) {
			const installmentCents = amountCents(installment.amount);
			if (installmentCents === 0) continue;

			const loanCents = installmentCents * PAY_IN_4_INSTALLMENT_COUNT;

			for (const candidate of group) {
				if (candidate.id === installment.id) continue;

				const candidateCents = amountCents(candidate.amount);
				if (Math.abs(candidateCents - loanCents) <= AMOUNT_TOLERANCE_CENTS) {
					excludeIds.add(candidate.id);
					break;
				}
			}
		}
	}

	if (excludeIds.size === 0) return transactions;

	return transactions.filter((transaction) => !excludeIds.has(transaction.id));
}

export function prepareSpendingTransactions(transactions: TransactionItem[]): TransactionItem[] {
	return filterPayPalPayIn4LoanDuplicates(transactions);
}
