# Jubel Jukebox

Guests request songs (via Spotify search) and the DJ sees the requests live on a dashboard.

- **Guests** sign in at `/login` with their name and the event code, search for songs and send requests.
- **The DJ** signs in at `/admin` and manages the requests at `/dashboard` (played, stashed, delete). New requests show up live.

The app is meant to run as **one container per event**: every event gets its own code, admin login and database.

Stack: SvelteKit 3 · Svelte 5 · Tailwind 4 + daisyUI 5 · SQLite (`node:sqlite`) · Node 24.

## Running with Docker (recommended)

Requirements: a server with Docker, a domain pointing to it, and ports 80/443 open.

```bash
cp .env.example .env              # set DOMAIN and fill in the app values (see Configuration)
docker run --rm -it -v "$PWD":/app -w /app node:24-alpine node scripts/hash-password.ts   # put the hash into .env
docker compose up -d --build      # or: podman-compose up -d --build
docker compose logs -f app
```

`compose.yaml` starts the app with [Caddy](https://caddyserver.com) as reverse proxy. Caddy obtains a Let's Encrypt certificate for `DOMAIN` automatically. The app itself is not exposed.

Local test: set `DOMAIN=localhost` in `.env` and open https://localhost (the browser warns once about Caddy's local test certificate). Rootless Podman can't bind ports below 1024, so also set `HTTP_PORT=8080` and `HTTPS_PORT=8443` and open https://localhost:8443.

The database lives in the `app-data` volume (`/app/data/jukebox.db`). Backup:

```bash
docker compose exec app node -e "new (require('node:sqlite').DatabaseSync)('/app/data/jukebox.db').exec(\"VACUUM INTO '/app/data/backup.db'\")"
docker compose cp app:/app/data/backup.db ./backup.db
```

Using your own reverse proxy instead of Caddy: it has to terminate TLS and set `X-Forwarded-Proto`, `X-Forwarded-Host` and `X-Forwarded-For`. Without these headers the app rejects form logins as cross-site requests.

## Running on Kubernetes

Generic Kustomize manifests live in `deploy/k8s` (Deployment, Service, PVC, Ingress):

```bash
cp deploy/k8s/secret.env.example deploy/k8s/secret.env   # fill in the values, the file is gitignored
# in deploy/k8s/kustomization.yaml: adjust namespace, image tag and domain (marked with CHANGE)
kubectl apply -k deploy/k8s
```

Works with any ingress controller. TLS optionally via cert-manager (annotation in `ingress.yaml`).

## Development

```bash
cp .env.example .env
npm install
npm run hash-password            # put the hash into ADMIN_PASSWORD_HASH in .env
npm run dev                      # database: data/jukebox.db
```

| Command | |
|---|---|
| `npm run check` | Type check (svelte-check) |
| `npm test` | Unit and integration tests |
| `npm run build` | Production build into `build/`, start with `node build` |

## Configuration

All variables are validated at startup (`src/env.ts`). If one is missing or invalid, the app refuses to start.

| Variable | Description |
|---|---|
| `ENTRY_CODE` | Event code for guests (at least 6 characters, case-insensitive) |
| `ADMIN_USERNAME` | DJ username |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the DJ password, create it with `npm run hash-password` |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify app (client credentials flow), only used on the server |
| `DATABASE_PATH` | SQLite file, default `data/jukebox.db` (`/app/data/jukebox.db` in the container) |
| `DOMAIN`, `HTTP_PORT`, `HTTPS_PORT` | Only for `compose.yaml`: public domain for Caddy and host ports (default 80/443) |

Set in the image (see `Dockerfile`): `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER` and `XFF_DEPTH=1` for running behind a reverse proxy, plus `BODY_SIZE_LIMIT=64K`.

## Security

- Sessions: random 256-bit token in an `HttpOnly`/`Secure`/`SameSite=Lax` cookie. The database only stores its SHA-256 hash. Roles: `guest` and `admin`.
- All admin endpoints (`GET /api/request`, `PUT`/`DELETE /api/request/:id`, `/api/events`, `/dashboard`) require the admin role.
- Input is validated with valibot. The server sets `user` and `status` itself. Song URLs must be `https://open.spotify.com/track/…` links. SQL only runs through prepared statements.
- Rate limits: failed logins per IP (guest 30 / admin 5 per 15 min), song requests and searches per session.
- CSP with nonces, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy. SvelteKit's CSRF protection is enabled.
- Container: non-root, read-only file system, no Linux capabilities.
- **Real client IP:** rate limits count per IP. If there is another load balancer in front of Caddy or the ingress, it has to pass the client IP on (proxy protocol or `externalTrafficPolicy: Local`). Otherwise all guests share a single limit.
- **Single instance only:** the SQLite file, live updates and rate limits are local to the process. This matches the one-container-per-event model.
