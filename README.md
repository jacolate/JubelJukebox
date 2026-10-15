# Jubel Jukebox

Gäste wünschen sich Songs (Spotify-Suche), der DJ sieht die Wünsche live im Dashboard.

- **Gäste** melden sich unter `/login` mit Namen und Event-Code an, suchen Songs und schicken Wünsche.
- **DJ** meldet sich unter `/admin` an und verwaltet die Wünsche unter `/dashboard` (gespielt, zurückgestellt, löschen). Neue Wünsche erscheinen live.

Stack: SvelteKit 3 · Svelte 5 · Tailwind 4 + daisyUI 5 · SQLite (`node:sqlite`) · Node 24.

## Betrieb mit Docker (empfohlen)

Voraussetzung: ein Server mit Docker, eine Domain, die auf ihn zeigt, und freie Ports 80/443.

```bash
cp .env.example .env              # Werte eintragen (siehe Konfiguration)
docker run --rm -it -v "$PWD":/app -w /app node:24-alpine node scripts/hash-password.ts   # Hash in .env eintragen
DOMAIN=jukebox.example.com docker compose up -d --build
```

`compose.yaml` startet die App und [Caddy](https://caddyserver.com) als Reverse-Proxy. Caddy holt automatisch ein Let's-Encrypt-Zertifikat. Die App selbst ist nicht direkt erreichbar.
Zum lokalen Ausprobieren `DOMAIN=localhost` verwenden.

Die Datenbank liegt im Volume `app-data` (`/app/data/jukebox.db`). Backup:

```bash
docker compose exec app node -e "new (require('node:sqlite').DatabaseSync)('/app/data/jukebox.db').exec(\"VACUUM INTO '/app/data/backup.db'\")"
docker compose cp app:/app/data/backup.db ./backup.db
```

Einen eigenen Reverse-Proxy statt Caddy nutzen: Er muss TLS terminieren und `X-Forwarded-Proto`, `X-Forwarded-Host` und `X-Forwarded-For` setzen. Ohne diese Header lehnt die App Formular-Logins als Cross-Site-Request ab.

## Betrieb mit Kubernetes

Generische Manifeste mit Kustomize unter `deploy/k8s` (Deployment, Service, PVC, Ingress):

```bash
cp deploy/k8s/secret.env.example deploy/k8s/secret.env   # Werte eintragen, ist gitignored
# in deploy/k8s/kustomization.yaml: Namespace, Image-Tag und Domain anpassen (markiert mit CHANGE)
kubectl apply -k deploy/k8s
```

Es funktioniert mit jedem Ingress-Controller. TLS optional über cert-manager (Annotation in `ingress.yaml`).

## Entwicklung

```bash
cp .env.example .env
npm install
npm run hash-password            # Hash für ADMIN_PASSWORD_HASH in .env eintragen
npm run dev                      # Datenbank: data/jukebox.db
```

| Befehl | |
|---|---|
| `npm run check` | Typecheck (svelte-check) |
| `npm test` | Unit- und Integrationstests |
| `npm run build` | Production-Build nach `build/`, Start mit `node build` |

## Konfiguration

Alle Variablen werden beim Start validiert (`src/env.ts`). Fehlt eine, startet die App nicht.

| Variable | Beschreibung |
|---|---|
| `ENTRY_CODE` | Event-Code für Gäste (mind. 6 Zeichen, Groß-/Kleinschreibung egal) |
| `ADMIN_USERNAME` | DJ-Benutzername |
| `ADMIN_PASSWORD_HASH` | scrypt-Hash des DJ-Passworts, erzeugen mit `npm run hash-password` |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify-App (Client-Credentials). Wird nur auf dem Server verwendet |
| `DATABASE_PATH` | SQLite-Datei, Standard `data/jukebox.db` (im Container `/app/data/jukebox.db`) |

Im Image gesetzt (siehe `Dockerfile`): `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER`, `XFF_DEPTH=1` für den Betrieb hinter einem Reverse-Proxy, `BODY_SIZE_LIMIT=64K`.

## Sicherheit

- Sessions: zufälliges 256-Bit-Token im `HttpOnly`/`Secure`/`SameSite=Lax`-Cookie, in der DB liegt nur der SHA-256-Hash. Rollen `guest` und `admin`.
- Alle Admin-Endpunkte (`GET /api/request`, `PUT`/`DELETE /api/request/:id`, `/api/events`, `/dashboard`) erfordern die Admin-Rolle.
- Eingaben werden mit valibot validiert. `user` und `status` setzt der Server, Song-URLs müssen `https://open.spotify.com/track/…` sein. SQL läuft nur über Prepared Statements.
- Rate-Limits: fehlgeschlagene Logins pro IP (Gast 30 / Admin 5 pro 15 min), Wünsche und Suchen pro Session.
- CSP mit Nonces, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy. SvelteKits CSRF-Schutz ist aktiv.
- Container: non-root, read-only Dateisystem, keine Linux-Capabilities.
- **Echte Client-IP:** Die Rate-Limits zählen pro IP. Steht vor Caddy bzw. dem Ingress noch ein Load Balancer, muss er die Client-IP durchreichen (Proxy-Protocol oder `externalTrafficPolicy: Local`). Sonst teilen sich alle Gäste ein Limit.
- **Nur eine Instanz:** SQLite-Datei, Live-Updates und Rate-Limits sind prozesslokal.
