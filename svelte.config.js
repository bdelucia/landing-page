import adapter from '@sveltejs/adapter-auto';
import { existsSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const personalConfigLocal = resolve(root, 'src/data/personal-info.local.ts');
const personalConfigResolved = existsSync(personalConfigLocal)
	? personalConfigLocal
	: resolve(root, 'src/data/personal-info.example.ts');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		alias: {
			$data: resolve(root, 'src/data'),
			// Not under $data — Vite would resolve $data/personal-config as src/data/personal-config
			'$personal-config': personalConfigResolved
		}
	}
};

export default config;
