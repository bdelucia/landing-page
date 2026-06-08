# landing-page

Personal SvelteKit landing page with Plaid balances, weather, and quick links.

## Secrets (local config)

After cloning, copy the example file and add any API integrations you use:

```sh
cp src/data/secrets.example.ts src/data/secrets.local.ts
```

Edit `src/data/secrets.local.ts` with your keys. That file is **gitignored** so secrets are not committed. Field docs and allowed values are in [`src/data/api-config.types.ts`](src/data/api-config.types.ts) (IDE hover on each property).

- **`openWeather`** — `apiKey` (needs [One Call 3.0](https://openweathermap.org/api/one-call-3) subscription), `zipCode`, `countryCode` (ISO alpha-2), `units` (`metric` | `imperial` | `standard`)
- **`plaid`** — `clientId`, `secret`, `environment`, `accessToken` (one linked institution; all accounts under it), optional `itemId`, or `items[]` for multiple banks (each with `accessToken` and optional `label`)

Import secrets from `$lib/server/config/secrets` in `+server.ts` / `+page.server.ts` only — not from `.svelte` files. Use `isOpenWeatherConfigured`, `isPlaidConfigured`, and `isPlaidLinked` before calling each API.

If `secrets.local.ts` is missing, the app falls back to `secrets.example.ts` so installs and CI still build.

## Gemini integration

Submitting a prompt from this landing page opens `https://gemini.google.com/app?q=…` with your text in the query string. Google Gemini does not use that parameter on its own—you need a browser extension to read `?q=` and fill (and submit) the prompt on the Gemini page.

**Firefox:** Install [Gemini URL Search](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/). Without it, you will reach Gemini but the prompt will not be applied automatically.

The extension’s [setup instructions](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/) also describe an optional `@g` address-bar shortcut (`https://gemini.google.com/app?q=%s`). The landing page uses the same URL pattern, so you do not need `@g` when submitting from this site.

## Developing

```sh
pnpm install
pnpm dev
```

## Building

```sh
pnpm build
pnpm preview   # smoke-test the Node server (adapter-node)
```

## Deploy (Docker)

Uses `@sveltejs/adapter-node` with `Dockerfile` and `docker-compose.yml`. Copy [`.env.docker.example`](.env.docker.example) to `.env`, set `BALANCE_LOG_CRON_TOKEN` and optional `ORIGIN`, then:

```sh
pnpm deploy:docker
```

The app binds to `127.0.0.1:${HOST_PORT:-3001}` on the host. SQLite data persists in `./data/`. Use `pnpm update-balances` (or cron + `scripts/run-balance-log.sh`) to refresh balances when webhooks are unavailable.
