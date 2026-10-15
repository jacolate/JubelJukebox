# Jubel Jukebox

Guests request songs (via Spotify search) and the DJ sees the requests live on a dashboard.

**Guests** sign in at `/login` with their name and the event code (or scan the QR code on the table card, which fills in the code):
- live search with album covers; a song that was already requested gets a vote (+1) instead of a duplicate
- *Mine*: their own requests with status, updated live
- *Played*: a timeline of what the DJ played (can be turned off)

**The DJ** signs in at `/admin` and works at `/dashboard`:
- tabs *Open / Stashed / Played*, sorted by time or by number of requests; every action can be undone
- event settings: pause requests, limit open requests per guest, block explicit songs or artists/titles, show requesters' names to guests
- invite guests with a QR code and a printable table card (`/dashboard/invite`)
- a printable recap with statistics (`/dashboard/recap`, save as PDF) and CSV/JSON export

The app is available in German and English (browser language, `DEFAULT_LOCALE`, or the DE/EN switch).

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

Containers read `.env` only when they are created. After changing `.env`, run `docker compose up -d --force-recreate` (or `podman-compose up -d --force-recreate`).

Local test: set `DOMAIN=localhost` in `.env` and open https://localhost (the browser warns once about Caddy's local test certificate). Rootless Podman can't bind ports below 1024, so also set `HTTP_PORT=8080` and `HTTPS_PORT=8443` and open https://localhost:8443.

The database lives in the `app-data` volume (`/app/data/jukebox.db`). Backup:

```bash
docker compose exec app node -e "new (require('node:sqlite').DatabaseSync)('/app/data/jukebox.db').exec(\"VACUUM INTO '/app/data/backup.db'\")"
docker compose cp app:/app/data/backup.db ./backup.db
```

Using your own reverse proxy instead of Caddy: it has to terminate TLS and set `X-Forwarded-Proto`, `X-Forwarded-Host` and `X-Forwarded-For`. Without these headers the app rejects form logins as cross-site requests.

## Spotify credentials

The song search uses the [Spotify Web API](https://developer.spotify.com/documentation/web-api) with the [client credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow). Guests don't need a Spotify account, and the credentials never leave the server.

1. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and click **Create app**.
2. Enter a name and description. **Redirect URIs** is a required field: enter any HTTPS URL, e.g. `https://example.org/callback`. The jukebox never uses it, because the client credentials flow has no user login. If you're asked which APIs you plan to use, choose **Web API**. Accept the terms and save.
3. Open the app's **Settings**: copy the **Client ID** into `SPOTIFY_CLIENT_ID` and the **Client secret** (*View client secret*) into `SPOTIFY_CLIENT_SECRET`.

If the secret was ever exposed, regenerate it with **Rotate** in the same place ([docs](https://developer.spotify.com/documentation/web-api/concepts/apps)) and update `.env`.

Limits of new apps ([quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)): apps run in *development mode*, where **the app owner needs Spotify Premium**, and rate limits are lower. When Spotify rejects requests, the search shows an error and the server logs the status code (e.g. `429`).

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
| `npm run check` | Compile translations and type check (svelte-check) |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:e2e` | Build, then security and browser tests (Playwright) |
| `npm run build` | Production build into `build/`, start with `node build` |

Texts live in `messages/de.json` and `messages/en.json` ([Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)); both files must have the same keys.

## Tests

- `src/**/*.test.ts` – Vitest: sessions, votes and rules, settings, live updates, CSV escaping, migrations.
- `tests/security.spec.ts`, `tests/rate-limit.spec.ts` – HTTP-level security tests against the production build: roles, CSRF, input validation, rate limits, privacy of the guest live stream, CSV injection, headers, languages.
- `tests/flows.spec.ts` – browser tests: guests and DJ in separate browsers, live updates, undo, settings, QR join link, language switch, downloads.
- `tests/visual.spec.ts` – screenshot comparison (light/dark, phone/desktop) against `tests/__screenshots__`.

Playwright starts everything itself: a Spotify mock (`tests/mock-spotify.ts`) and separate app instances with fresh databases (`tests/server.ts`). Install the browser once with `npx playwright install chromium`.

Screenshots depend on fonts and rendering of the operating system, so they are created and compared in the Playwright Linux container (as in CI). After intended UI changes, update the baselines:

```bash
podman run --rm -v "$PWD":/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -c "npm ci && npm run test:visual -- --update-snapshots"     # docker run … works the same
```

## Configuration

All variables are validated at startup (`src/env.ts`). If one is missing or invalid, the app refuses to start.

| Variable | Description |
|---|---|
| `ENTRY_CODE` | Event code for guests (at least 6 characters, case-insensitive) |
| `ADMIN_USERNAME` | DJ username |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the DJ password, create it with `npm run hash-password` |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify app credentials, see [Spotify credentials](#spotify-credentials) |
| `DATABASE_PATH` | SQLite file, default `data/jukebox.db` (`/app/data/jukebox.db` in the container) |
| `DEFAULT_LOCALE` | `de` or `en`: language when the guest's browser prefers neither (default `de`) |
| `TIMEZONE` | Time zone of the event for the recap and export, e.g. `Europe/Berlin` (default) |
| `SPOTIFY_ACCOUNTS_URL` / `SPOTIFY_API_URL` | Only for tests (Spotify mock); default are the real Spotify URLs |
| `DOMAIN`, `HTTP_PORT`, `HTTPS_PORT` | Only for `compose.yaml`: public domain for Caddy and host ports (default 80/443) |

Set in the image (see `Dockerfile`): `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER` and `XFF_DEPTH=1` for running behind a reverse proxy, plus `BODY_SIZE_LIMIT=64K`.

## Security

- Sessions: random 256-bit token in an `HttpOnly`/`Secure`/`SameSite=Lax` cookie. The database only stores its SHA-256 hash. Roles: `guest` and `admin`.
- All DJ endpoints (`GET /api/request`, `PUT`/`DELETE /api/request/:id`, `…/restore`, `/dashboard/**`, settings, export) require the admin role.
- Guests only send a Spotify track id. Title, artists, cover and the explicit flag are looked up at Spotify by the server, so blocklist and explicit filter can't be bypassed. Covers are only loaded from `i.scdn.co`.
- The live stream (`/api/events`) is filtered per role: guests get their own songs, the timeline and the public settings – other guests' names only if the DJ allows it, never the blocklist.
- Input is validated with valibot. The server sets requester and status itself. SQL only runs through prepared statements. The CSV export neutralizes spreadsheet formulas.
- Rate limits: failed logins per IP (guest 30 / admin 5 per 15 min), song requests and searches per session.
- CSP with nonces, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy. SvelteKit's CSRF protection is enabled.
- Container: non-root, read-only file system, no Linux capabilities.
- **Real client IP:** rate limits count per IP. If there is another load balancer in front of Caddy or the ingress, it has to pass the client IP on (proxy protocol or `externalTrafficPolicy: Local`). Otherwise all guests share a single limit.
- **Single instance only:** the SQLite file, live updates and rate limits are local to the process. This matches the one-container-per-event model.
