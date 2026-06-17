import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
import gmailIcon from '$lib/assets/logos/500px-Gmail_icon_(2026).svg.png';
import youtubeIcon from '$lib/assets/logos/500px-YouTube_full-color_icon_(2017).svg.png';
import redditIcon from '$lib/assets/logos/Reddit_Logo_Icon.svg';
import githubIcon from '$lib/assets/logos/GitHub_Invertocat_White.svg';
import paypalIcon from '$lib/assets/logos/paypal_logo.png';
import capitalOneIcon from '$lib/assets/logos/capital_one.png';
import arizonaFinancialIcon from '$lib/assets/logos/arizona-financial.png';
import fidelityIcon from '$lib/assets/logos/fidelity.jpeg';
import ewheelsIcon from '$lib/assets/logos/ewheels.png';
import googleDriveIcon from '$lib/assets/logos/google-drive.png';
import googleDocsIcon from '$lib/assets/logos/google-docs.png';
import facebookIcon from '$lib/assets/logos/facebook.png';
import linkedInIcon from '$lib/assets/logos/linkedin.png';
import instagramIcon from '$lib/assets/logos/instagram.png';
import xIcon from '$lib/assets/logos/x.png';
import amazonIcon from '$lib/assets/logos/amazon.png';
import neweggIcon from '$lib/assets/logos/newegg.jpg';
import costcoIcon from '$lib/assets/logos/costco.png';
import bestBuyIcon from '$lib/assets/logos/bestbuy.png';
import cursorIcon from '$lib/assets/logos/cursor.png';
import vercelIcon from '$lib/assets/logos/vercel.png';
import npmIcon from '$lib/assets/logos/npm.png';
import dockerIcon from '$lib/assets/logos/docker.png';

export type QuickLinkItem = {
	/** Destination URL */
	href: string;
	/** Accessible name shown below the icon */
	ariaLabel: string;
	/** Opens in a new tab with `noopener noreferrer` */
	external?: boolean;
	/** Local raster/SVG import used as an `<img>` source */
	icon?: string;
};

export type QuickLinkFolder = {
	/** Stable id, used for element ids and keying */
	id: string;
	/** Folder name shown under the tile and as the popup heading */
	label: string;
	links: QuickLinkItem[];
};

export const quickLinkFolders: QuickLinkFolder[] = [
	{
		id: 'google',
		label: 'Google',
		links: [
			{ href: 'https://gemini.google.com', ariaLabel: 'Gemini', icon: geminiIcon, external: true },
			{ href: 'https://mail.google.com', ariaLabel: 'Gmail', icon: gmailIcon, external: true },
			{ href: 'https://drive.google.com', ariaLabel: 'Drive', icon: googleDriveIcon, external: true },
			{ href: 'https://docs.google.com', ariaLabel: 'Docs', icon: googleDocsIcon, external: true },
			{ href: 'https://www.youtube.com', ariaLabel: 'YouTube', icon: youtubeIcon, external: true }
		]
	},
	{
		id: 'social',
		label: 'Social',
		links: [
			{ href: 'https://www.facebook.com', ariaLabel: 'Facebook', icon: facebookIcon, external: true },
			{ href: 'https://www.linkedin.com', ariaLabel: 'LinkedIn', icon: linkedInIcon, external: true },
			{ href: 'https://www.reddit.com', ariaLabel: 'Reddit', icon: redditIcon, external: true },
			{ href: 'https://x.com', ariaLabel: 'X', icon: xIcon, external: true },
			{
				href: 'https://www.instagram.com',
				ariaLabel: 'Instagram',
				icon: instagramIcon,
				external: true
			}
		]
	},
	{
		id: 'shopping',
		label: 'Shopping',
		links: [
			{ href: 'https://ewheels.com', ariaLabel: 'eWheels', icon: ewheelsIcon, external: true },
			{ href: 'https://www.amazon.com', ariaLabel: 'Amazon', icon: amazonIcon, external: true },
			{ href: 'https://www.newegg.com', ariaLabel: 'Newegg', icon: neweggIcon, external: true },
			{ href: 'https://www.costco.com', ariaLabel: 'Costco', icon: costcoIcon, external: true },
			{ href: 'https://www.bestbuy.com', ariaLabel: 'Best Buy', icon: bestBuyIcon, external: true }
		]
	},
	{
		id: 'coding',
		label: 'Coding',
		links: [
			{ href: 'https://github.com', ariaLabel: 'GitHub', icon: githubIcon, external: true },
			{ href: 'https://cursor.com', ariaLabel: 'Cursor', icon: cursorIcon, external: true },
			{ href: 'https://vercel.com', ariaLabel: 'Vercel', icon: vercelIcon, external: true },
			{ href: 'https://www.npmjs.com', ariaLabel: 'npm', icon: npmIcon, external: true },
			{ href: 'https://www.docker.com', ariaLabel: 'Docker', icon: dockerIcon, external: true }
		]
	},
	{
		id: 'financial',
		label: 'Financial',
		links: [
			{ href: 'https://www.paypal.com', ariaLabel: 'PayPal', icon: paypalIcon, external: true },
			{
				href: 'https://www.capitalone.com',
				ariaLabel: 'Capital One',
				icon: capitalOneIcon,
				external: true
			},
			{
				href: 'https://www.arizonafinancial.org',
				ariaLabel: 'Arizona Financial',
				icon: arizonaFinancialIcon,
				external: true
			},
			{
				href: 'https://netbenefits.fidelity.com',
				ariaLabel: 'NetBenefits',
				icon: fidelityIcon,
				external: true
			}
		]
	}
];
