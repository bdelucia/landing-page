import adapter from '@sveltejs/adapter-node';
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
		// adapter-node: self-hosted Node server (Docker on Pi, etc.)
		adapter: adapter(),
		alias: {
			$data: resolve(root, 'src/data'),
			// Not under $data — Vite would resolve $data/personal-config as src/data/personal-config
			'$personal-config': personalConfigResolved
		}
	}
};

export default config;
