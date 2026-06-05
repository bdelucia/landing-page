import azfcuIcon from '$lib/assets/logos/azfcu.jpeg';
import capitalOneIcon from '$lib/assets/logos/capital_one.png';
import fidelityIcon from '$lib/assets/logos/fidelity.jpeg';
import paypalIcon from '$lib/assets/logos/paypal_logo.png';
import robinhoodIcon from '$lib/assets/logos/robinhood.png';
import type { AccountBalanceKey } from '$lib/account-balances';

const iconsByLabel: Record<AccountBalanceKey, string> = {
	AZFCU: azfcuIcon,
	Robinhood: robinhoodIcon,
	Fidelity: fidelityIcon,
	'Capital One': capitalOneIcon,
	PayPal: paypalIcon
};

export function accountBalanceIcon(label: string): string | undefined {
	const key = label.trim() as AccountBalanceKey;
	return iconsByLabel[key];
}
