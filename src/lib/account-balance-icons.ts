import azfcuIcon from '$lib/assets/logos/azfcu.jpeg';
import fidelityIcon from '$lib/assets/logos/fidelity.jpeg';
import robinhoodIcon from '$lib/assets/logos/robinhood.png';
import type { AccountBalanceKey } from '$lib/account-balances';

const iconsByLabel: Record<AccountBalanceKey, string> = {
	AZFCU: azfcuIcon,
	Robinhood: robinhoodIcon,
	Fidelity: fidelityIcon
};

export function accountBalanceIcon(label: string): string | undefined {
	const key = label.trim() as AccountBalanceKey;
	return iconsByLabel[key];
}
