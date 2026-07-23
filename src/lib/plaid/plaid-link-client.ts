export type PlaidLinkOnSuccessMetadata = {
	institution?: {
		name?: string;
		institution_id?: string;
	};
	accounts?: Array<{ id: string; name: string; mask: string | null }>;
	link_session_id?: string;
};

export type PlaidLinkHandler = {
	open: () => void;
	destroy: () => void;
};

export type PlaidLinkCreateOptions = {
	token: string;
	onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
	onExit?: (error: { display_message?: string; error_message?: string } | null) => void;
	onEvent?: (eventName: string, metadata: Record<string, unknown>) => void;
};

declare global {
	interface Window {
		Plaid?: {
			create: (options: PlaidLinkCreateOptions) => PlaidLinkHandler;
		};
	}
}

export {};
