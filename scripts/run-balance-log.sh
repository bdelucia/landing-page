#!/usr/bin/env sh
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

if [ -z "${BALANCE_LOG_CRON_TOKEN:-}" ]; then
	echo "BALANCE_LOG_CRON_TOKEN is not set in $PROJECT_ROOT/.env"
	exit 1
fi

/usr/bin/curl --fail --silent --show-error \
	-X POST \
	-H "Authorization: Bearer ${BALANCE_LOG_CRON_TOKEN}" \
	"http://127.0.0.1:${HOST_PORT}/api/internal/log-plaid-balances"
