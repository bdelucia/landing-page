// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		html2canvas?: (
			element: Element,
			options?: Record<string, unknown>
		) => Promise<HTMLCanvasElement>;
		liquidGL?: ((options?: Record<string, unknown>) => unknown) & {
			syncWith?: (config?: Record<string, unknown>) => {
				lenis?: unknown;
				locomotiveScroll?: unknown;
			};
			registerDynamic?: (elements: unknown) => void;
		};
		__liquidGLRenderer__?: {
			canvas: HTMLCanvasElement;
			captureSnapshot?: () => Promise<boolean | void>;
		};
		/** jQuery + ripples plugin (loaded only on /demo) */
		jQuery?: {
			(sel: string): {
				each: (fn: (this: HTMLElement) => void) => void;
			};
			(el: Element): {
				ripples: (opts: Record<string, unknown>) => void;
			};
		};
	}
}

export {};
