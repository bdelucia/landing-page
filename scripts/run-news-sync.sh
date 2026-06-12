#!/usr/bin/env sh
# Fetches AI / gaming / Arizona news into SQLite via the app's internal endpoint.
# Intended for cron on the Raspberry Pi, e.g. every 30 minutes:
#   */30 * * * * /home/pi/landing-page/scripts/run-news-sync.sh >> /home/pi/news-sync.log 2>&1
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$PROJECT_ROOT/.env" ]; then
	echo "Missing $PROJECT_ROOT/.env"
	exit 1
fi

set -a
. "$PROJECT_ROOT/.env"
set +a

HOST_PORT="${HOST_PORT:-3001}"

if [ -z "${NEWS_SYNC_CRON_TOKEN:-}" ]; then
	echo "NEWS_SYNC_CRON_TOKEN is not set in $PROJECT_ROOT/.env"
	exit 1
fi

/usr/bin/curl --fail --silent --show-error \
	-X POST \
	-H "Authorization: Bearer ${NEWS_SYNC_CRON_TOKEN}" \
	"http://127.0.0.1:${HOST_PORT}/api/internal/sync-news" \
	|| {
		echo "News sync failed. Check docker logs for [news-sync] errors."
		exit 1
	}
