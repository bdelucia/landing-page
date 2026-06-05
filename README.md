# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Personal info (local config)

After cloning, copy the example file and edit it for yourself:

```sh
cp src/data/personal-info.example.ts src/data/personal-info.local.ts
```

Edit `src/data/personal-info.local.ts` with your name, welcome text, and any API blocks you use. That file is **gitignored** so secrets are not committed.

- **`personalInfo`** — safe for UI (`displayName`, optional `welcomeMessage`). Import from `$data/personal-info`.
- **`personalSecrets`** — server only. Optional objects per integration (omit to disable). Field docs and allowed values are in [`src/data/api-config.types.ts`](src/data/api-config.types.ts) (IDE hover on each property).
  - **`openWeather`** — `apiKey` (needs [One Call 3.0](https://openweathermap.org/api/one-call-3) subscription), `zipCode`, `countryCode` (ISO alpha-2), `units` (`metric` | `imperial` | `standard`)
  - **`plaid`** — `clientId`, `secret`, `environment`, `accessToken` (one linked institution; all accounts under it), optional `itemId`, or `items[]` for multiple banks (each with `accessToken` and optional `label`)

Import secrets from `$lib/server/personal-secrets` in `+server.ts` / `+page.server.ts` only — not from `.svelte` files. Use `isOpenWeatherConfigured`, `isPlaidConfigured`, and `isPlaidLinked` before calling each API.

If `personal-info.local.ts` is missing, the app falls back to `personal-info.example.ts` so installs and CI still build.

## Gemini integration

Submitting a prompt from this landing page opens `https://gemini.google.com/app?q=…` with your text in the query string. Google Gemini does not use that parameter on its own—you need a browser extension to read `?q=` and fill (and submit) the prompt on the Gemini page.

**Firefox:** Install [Gemini URL Search](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/). Without it, you will reach Gemini but the prompt will not be applied automatically.

The extension’s [setup instructions](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/) also describe an optional `@g` address-bar shortcut (`https://gemini.google.com/app?q=%s`). The landing page uses the same URL pattern, so you do not need `@g` when submitting from this site.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.14.0 create --template minimal --types ts --add prettier eslint --install pnpm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
pnpm run build
pnpm run preview   # smoke-test the Node server (adapter-node)
```

## Deploy (Docker on Raspberry Pi + Tailscale)

The project uses `@sveltejs/adapter-node` with a `Dockerfile` and `docker-compose.yml`. Access is intended **only over Tailscale**, not the public web.

See **[docs/deploy-raspberry-pi.md](docs/deploy-raspberry-pi.md)** for setup, secrets, Tailscale Serve, and reboot behavior.
