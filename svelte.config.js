import adapter from '@sveltejs/adapter-node';
import { existsSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const secretsLocal = resolve(root, 'src/data/secrets.local.ts');
const secretsResolved = existsSync(secretsLocal)
	? secretsLocal
	: resolve(root, 'src/data/secrets.example.ts');

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
			// Not under $data — Vite would resolve $data/secrets-config as src/data/secrets-config
			'$secrets-config': secretsResolved
		}
	}
};

export default config;
