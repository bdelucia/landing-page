# landing-page

A SvelteKit landing page I made for myself. 
Heavily vibe-coded. 
Uses my Linux rice palette (find it [here](https://github.com/bdelucia/HyprPanel-Config-Files))

## More about it:
- **Auth:** Hosted on a Raspberry Pi 5 using Docker and Tailscale.
  
  Tailscale makes it so only devices connected on the same Tailscale network can view the website. Tailscale is basically my auth for this website.
- **APIs:** Using Plaid webhooks, RAWG.io, newsAPI, hackernews and SteamGridDB APIs.

  All data from APIs are stored in the SQLite database, so I only have to wait on the database fetch, and not the API fetch. Webhooks and cron-jobs call the APIs.
- **AI integration:** Gemini search uses the [Gemini URL Search](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/) extension, instead of a Gemini API key.
  
  This takes advantage of Gemini's Personalization feature, as well as making sure I don't have to worry about API token usage/payments.
- **Database:** Uses SQLite for the database.
  
  Supports dev & prod env-switching. Dev database is in /database and prod is on my Raspberry Pi.

# Pages

As this is a locally hosted website, I unfortunately can't give out a public link. Here are some screenshots from the dev server (using fake data points):

## Homepage

<img width="1910" height="907" alt="image" src="https://github.com/user-attachments/assets/2c958999-a6f0-4776-99c9-4a81f3989bc6" />

## Finances

<img width="1910" height="907" alt="image" src="https://github.com/user-attachments/assets/6e3edbcf-d8e4-45c4-8a88-20556ac1080a" />
<img width="1910" height="907" alt="image" src="https://github.com/user-attachments/assets/2c916780-26af-4d6f-b1ca-a736c15ec80c" />
<img width="1906" height="911" alt="image" src="https://github.com/user-attachments/assets/e6c2111d-968f-46c8-8e4c-8b27fda889bf" />

## News

<img width="1909" height="911" alt="image" src="https://github.com/user-attachments/assets/a5ab2267-5d04-4d77-8c62-92408fd05077" />

# Setup

If you want to clone this repo to make a similar landing page, here's how you do it!

## Secrets (local config)

After cloning, copy the example file and add any API integrations you use:

```sh
cp src/data/secrets.example.ts src/data/secrets.local.ts
```

Edit `src/data/secrets.local.ts` with your keys. That file is **gitignored** so secrets are not committed. Field docs and allowed values are in [`src/data/api-config.types.ts`](src/data/api-config.types.ts) (IDE hover on each property).

- **`openWeather`** — `apiKey` (needs [One Call 3.0](https://openweathermap.org/api/one-call-3) subscription), `zipCode`, `countryCode` (ISO alpha-2), `units` (`metric` | `imperial` | `standard`)
- **`plaid`** — `clientId`, `secret`, `environment`, `accessToken` (one linked institution; all accounts under it), optional `itemId`, or `items[]` for multiple banks (each with `accessToken` and optional `label`)
- **`news`** — one optional source per News category: `hackerNews` (AI stories via the keyless [Hacker News Firebase API](https://github.com/HackerNews/API); `{}` enables it), `rawg` (game releases, key from [rawg.io/apidocs](https://rawg.io/apidocs)), `steamGridDb` (game cover art, key from [SteamGridDB](https://www.steamgriddb.com/profile/preferences/api)), `newsApi` (Arizona headlines, key from [newsapi.org](https://newsapi.org/account))

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

# Raspberry Pi 5 Stuff

## Clone the repo

Clone the repo to your Pi 5. I would assume you know how to clone a repo if you have gotten this far.

## Deploy (Docker)

Uses `@sveltejs/adapter-node` with `Dockerfile` and `docker-compose.yml`. Copy [`.env.docker.example`](.env.docker.example) to `.env`, set `BALANCE_LOG_CRON_TOKEN` and optional `ORIGIN`, then:

```sh
pnpm run deploy
```

The app binds to `127.0.0.1:${HOST_PORT:-3001}` on the host. SQLite data persists in `./database/`. Table definitions live in [`database/schema.sql`](database/schema.sql); the app also creates them on first run.

## Balance log sync (cron)

The Finances charts read balance history from SQLite. Plaid webhooks can refresh depository accounts (checking, savings, credit) when balances change, but **investment accounts** (Robinhood, Fidelity, etc.) are synced on a schedule instead. Investment balances come from Plaid’s investments APIs (`investmentsHoldingsGet`, contribution history, and related calls), which are much heavier than a simple balance webhook—relying on webhooks for every change would burn through Plaid API quota quickly.

Set `BALANCE_LOG_CRON_TOKEN` in `.env`, then run `pnpm update-balances` manually or schedule it on the Pi:

```sh
# crontab -e — once daily (adjust the schedule to taste)
0 6 * * * /home/pi/landing-page/scripts/run-balance-log.sh >> /home/pi/balance-log.log 2>&1
```

The script POSTs to `/api/internal/log-plaid-balances` on localhost with the bearer token. It snapshots all linked Plaid items, uses the investments API for investment labels, and updates contribution tracking. Depository accounts still benefit from webhooks when configured; the cron keeps investment history current without excessive API usage.

## News sync (cron)

The News view reads articles from SQLite. A sync pulls AI stories (Hacker News), game releases (RAWG + SteamGridDB art), and Arizona headlines (NewsAPI) into the `news_articles` table. Set `NEWS_SYNC_CRON_TOKEN` in `.env`, then run `pnpm sync-news` manually or schedule it on the Pi:

```sh
# crontab -e — every 30 minutes
*/30 * * * * /home/pi/landing-page/scripts/run-news-sync.sh >> /home/pi/news-sync.log 2>&1
```

If the table is empty or stale (no cron yet), the page lazily syncs once on load, so local dev works without any scheduling.
