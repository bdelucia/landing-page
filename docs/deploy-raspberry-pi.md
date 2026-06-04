# Deploy on Raspberry Pi (Docker + Tailscale)

Run the landing page on the same Pi as Pi-hole. The app listens only on **localhost** inside the host; you reach it over **Tailscale** (not the public internet).

## Prerequisites

- Raspberry Pi with Docker and Docker Compose v2 (`docker compose`)
- [Tailscale](https://tailscale.com/download) installed on the Pi and on devices you browse from
- `src/data/personal-info.local.ts` on the Pi (copy from your dev machine — never commit it)

## 1. Clone and configure on the Pi

```sh
git clone <your-repo-url> landing-page
cd landing-page
cp src/data/personal-info.example.ts src/data/personal-info.local.ts
# Edit personal-info.local.ts with displayName and API blocks (Plaid, OpenWeather, etc.)
```

Secrets are compiled into the server bundle at **image build** time. After changing `personal-info.local.ts`, rebuild:

```sh
docker compose build --no-cache
docker compose up -d
```

## 2. Build and run

```sh
docker compose up -d --build
```

Check logs:

```sh
docker compose logs -f landing-page
```

On the Pi, the app is at `http://127.0.0.1:3001` by default (host port; container uses 3000 inside). Not exposed on your LAN IP.

## 3. Expose via Tailscale (recommended)

### Option A — Tailscale Serve (HTTPS, no port forward)

On the Pi:

```sh
sudo tailscale serve --bg http://127.0.0.1:3001
```

In the [Tailscale admin console](https://login.tailscale.com/admin/machines), open your Pi → **Serve** and note the HTTPS URL (e.g. `https://pi.your-tailnet.ts.net`).

Copy `.env.docker.example` to `.env` and set `ORIGIN` to that exact HTTPS URL, then restart:

```sh
cp .env.docker.example .env
# edit .env — ORIGIN=https://pi.your-tailnet.ts.net
docker compose up -d
```

### Option B — Tailnet IP directly

Find the Pi’s Tailscale IP (`100.x.y.z`) with `tailscale ip -4`. With the compose file as written, the service is **not** on the LAN interface—use Serve or temporarily publish the port if you need raw IP access:

```yaml
ports:
  - "3000:3000"  # only if you accept tailnet/LAN exposure; prefer Serve
```

## 4. Start on reboot

`restart: unless-stopped` in `docker-compose.yml` brings the container back after reboot once Docker starts.

Enable Docker at boot (Raspberry Pi OS):

```sh
sudo systemctl enable docker
```

Ensure Tailscale starts at boot:

```sh
sudo systemctl enable tailscaled
```

Re-apply Serve after reboot if you use it (or script `tailscale serve` in a small systemd unit). Use the same port as compose (default **3001**).

## 5. Updates

```sh
cd landing-page
git pull
docker compose up -d --build
```

## Security notes

- Do **not** port-forward 3000 on your router.
- Prefer **Tailscale Serve** + `127.0.0.1` binding so guests on WiFi cannot hit the app unless you widen `ports`.
- Anyone on your tailnet can reach Serve unless you use [Tailscale ACLs](https://tailscale.com/kb/1018/acls) to restrict the Pi.
- Rebuild the image when rotating Plaid tokens or API keys in `personal-info.local.ts`.

## Port 3000 already in use

Compose maps **host** `3001` → container `3000` by default so this does not clash with other services on 3000.

To see what holds 3000:

```sh
sudo ss -tlnp | grep ':3000 '
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep 3000
```

Stop a leftover container if needed:

```sh
docker stop landing-page   # or the name shown in docker ps
docker compose up -d
```

To use host port 3000 anyway, set `HOST_PORT=3000` in `.env` after freeing the port.

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| Build uses example config (no weather/Plaid) | Confirm `personal-info.local.ts` exists on the Pi **before** `docker compose build` |
| `ERR_PNPM_IGNORED_BUILDS` / esbuild | Ensure `pnpm-workspace.yaml` is in the repo (`allowBuilds.esbuild: true`); pull latest and rebuild |
| `port is already allocated` (3000) | Something else uses that port — see below; default host port is now **3001** |
| 403 / CSRF errors behind Serve | Set `ORIGIN` to the exact HTTPS Serve URL |
| Slow first build on Pi | Normal on ARM; subsequent builds use cache |
| Out of disk | `docker system prune` (removes unused images) |
