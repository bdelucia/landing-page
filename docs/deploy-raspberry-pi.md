# Deploy on Raspberry Pi (Docker + daily Plaid balance logging)

This guide deploys your landing page in Docker, stores Plaid account balances in SQLite, and runs a midnight cron job on the Pi to append daily snapshots.

## 1) Configure your local secrets

Create your local config file if you do not already have it:

```sh
cp src/data/personal-info.example.ts src/data/personal-info.local.ts
```

Inside `src/data/personal-info.local.ts`, set Plaid credentials and linked items. Use one `items[]` entry per institution (`AZFCU`, `Robinhood`, `Fidelity`):

```ts
plaid: {
	clientId: '...',
	secret: '...',
	environment: 'production',
	items: [
		{ accessToken: '...', itemId: '...', label: 'AZFCU' },
		{ accessToken: '...', itemId: '...', label: 'Robinhood' },
		{ accessToken: '...', itemId: '...', label: 'Fidelity' }
	]
}
```

The nightly logger stores each account returned by Plaid under those items (for example, checking + savings, investing + Roth IRA, Roth 401k).

## 2) Create Docker environment file

On the Pi, in the project root:

```sh
cp .env.docker.example .env
```

Edit `.env`:

- `HOST_PORT`: host port mapped to app port `3000` (default `3001`)
- `SQLITE_DB_PATH`: leave `/app/data/finance.sqlite` unless you want another in-container path
- `BALANCE_LOG_CRON_TOKEN`: set a long random secret used by cron auth

Generate a token quickly:

```sh
openssl rand -hex 32
```

## 3) Build and run on Raspberry Pi

```sh
docker compose build --no-cache
docker compose up -d
```

SQLite file will persist on the Pi at:

`./data/finance.sqlite` (project-relative, bind-mounted into container as `/app/data/finance.sqlite`)

## 4) Test the logging endpoint manually

From the Pi host:

```sh
chmod +x scripts/run-balance-log.sh
./scripts/run-balance-log.sh
```

Expected JSON contains:

- `snapshotTime` (UTC timestamp)
- `inserted` (rows inserted; one row per Plaid account)
- `failures` (per-item failures if any)

## 5) Add midnight cron job on the Raspberry Pi host

Create a log directory once:

```sh
mkdir -p ~/landing-page/logs
```

Install cron entry:

```sh
crontab -e
```

Add:

```cron
0 0 * * * /home/pi/landing-page/scripts/run-balance-log.sh >> /home/pi/landing-page/logs/balance-cron.log 2>&1
```

Notes:

- Ensure `scripts/run-balance-log.sh` is executable (`chmod +x scripts/run-balance-log.sh`).
- The script automatically reads `BALANCE_LOG_CRON_TOKEN` and `HOST_PORT` from `.env`.
- If your project path differs from `/home/pi/landing-page`, update the log path.

## 6) Verify data in SQLite

On the Pi host (if `sqlite3` is installed):

```sh
sqlite3 /home/pi/landing-page/data/finance.sqlite \
  "SELECT snapshot_time, plaid_item_label, account_name, account_subtype, balance_current FROM account_balance_snapshots ORDER BY id DESC LIMIT 20;"
```

If `sqlite3` is not installed:

```sh
sudo apt-get update && sudo apt-get install -y sqlite3
```

## Schema created automatically

Table: `account_balance_snapshots`

- Snapshot fields: `snapshot_time`, `created_at`
- Institution fields: `plaid_item_label`, `plaid_item_id`
- Account fields: `plaid_account_id`, `account_name`, `account_mask`, `account_type`, `account_subtype`
- Balance fields: `balance_current`, `balance_available`, `balance_limit`, `iso_currency_code`, `unofficial_currency_code`
