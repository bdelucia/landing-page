import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
import gmailIcon from '$lib/assets/logos/500px-Gmail_icon_(2026).svg.png';
import githubIcon from '$lib/assets/logos/GitHub_Invertocat_White.svg';
import youtubeIcon from '$lib/assets/logos/500px-YouTube_full-color_icon_(2017).svg.png';
import redditIcon from '$lib/assets/logos/Reddit_Logo_Icon.svg';

export type QuickLinkItem = {
	href: string;
	icon: string;
	ariaLabel: string;
	external?: boolean;
};

export const quickLinks: QuickLinkItem[] = [
	{ href: 'https://gemini.google.com', icon: geminiIcon, ariaLabel: 'Gemini' },
	{ href: 'https://mail.google.com', icon: gmailIcon, ariaLabel: 'Gmail' },
	{ href: 'https://github.com', icon: githubIcon, ariaLabel: 'GitHub' },
	{ href: 'https://www.youtube.com', icon: youtubeIcon, ariaLabel: 'YouTube' },
	{ href: 'https://www.reddit.com', icon: redditIcon, ariaLabel: 'Reddit' }
];
