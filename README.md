# Jubel Jukebox

Gäste wünschen sich Songs (Spotify-Suche), der DJ sieht die Wünsche live im Dashboard.

- **Gäste** melden sich unter `/login` mit Namen und Event-Code an, suchen Songs und schicken Wünsche.
- **DJ** meldet sich unter `/admin` an und verwaltet die Wünsche unter `/dashboard` (gespielt, zurückgestellt, löschen). Neue Wünsche erscheinen live.

Stack: SvelteKit 3 · Svelte 5 · Tailwind 4 + daisyUI 5 · MongoDB · Node 24 (`adapter-node`).

## Entwicklung

```bash
cp .env.example .env
docker compose -f infra/dev/mongo/docker-compose.yml up -d   # lokale MongoDB
npm install
npm run hash-password            # Hash für ADMIN_PASSWORD_HASH in .env eintragen
npm run dev
```

| Befehl | |
|---|---|
| `npm run check` | Typecheck (svelte-check) |
| `npm test` | Unit- und Integrationstests (startet eine In-Memory-MongoDB) |
| `npm run build` | Production-Build nach `build/`, Start mit `node build` |

## Konfiguration

Alle Variablen werden beim Start validiert (`src/env.ts`). Fehlt eine, startet die App nicht.

| Variable | Beschreibung |
|---|---|
| `MONGODB_URI` | Connection-String, App-User statt Root (siehe unten) |
| `MONGODB_DB` | Datenbankname, Standard `songRequests` |
| `ENTRY_CODE` | Event-Code für Gäste (mind. 6 Zeichen, Groß-/Kleinschreibung egal) |
| `ADMIN_USERNAME` | DJ-Benutzername |
| `ADMIN_PASSWORD_HASH` | scrypt-Hash des DJ-Passworts, erzeugen mit `npm run hash-password` |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify-App (Client-Credentials). Wird nur auf dem Server verwendet |

Im Container gesetzt (siehe `Dockerfile`): `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER`, `XFF_DEPTH` für den Betrieb hinter dem Ingress, `BODY_SIZE_LIMIT=64K`.

## Sicherheit

- Sessions: zufälliges 256-Bit-Token im `HttpOnly`/`Secure`/`SameSite=Lax`-Cookie, in der DB liegt nur der SHA-256-Hash. Rollen `guest` und `admin`.
- Alle Admin-Endpunkte (`GET /api/request`, `PUT`/`DELETE /api/request/:id`, `/api/events`, `/dashboard`) erfordern die Admin-Rolle.
- Eingaben werden mit valibot validiert. `user` und `status` setzt der Server, Song-URLs müssen `https://open.spotify.com/track/…` sein.
- Rate-Limits: fehlgeschlagene Logins pro IP (Gast 30 / Admin 5 pro 15 min), Wünsche und Suchen pro Session.
- CSP mit Nonces, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy. SvelteKits CSRF-Schutz ist aktiv.
- Die Rate-Limits brauchen die echte Client-IP. Der Ingress muss sie weiterreichen (z. B. `externalTrafficPolicy: Local` oder Proxy-Protocol am Load Balancer), sonst teilen sich alle Gäste ein Limit.
- **Nur eine Replica:** Live-Updates und Rate-Limits liegen im Speicher.

## Deployment (Kubernetes)

Manifeste unter `infra/production`. Secrets liegen **nicht** im Repo. Die `*.example.yaml`-Dateien enthalten die `kubectl create secret …`-Befehle.

1. Secrets anlegen: `mongodb-secret`, `jj-app-secret`, `ghcr-credentials`.
2. `kubectl -n jubeljukebox apply -f infra/production/mongodb -f infra/production/JubelJukebox`
3. TLS kommt über cert-manager (`cert-manager.io/cluster-issuer: letsencrypt-prod`).

Bestehende Datenbank: Den App-User einmalig anlegen (Befehl in `mongodb-init.yaml`) und dann die Migration ausführen:

```bash
MONGODB_URI='mongodb://root:…@localhost:27017/?authSource=admin' node scripts/migrate-v2.ts          # Probelauf
MONGODB_URI='…' node scripts/migrate-v2.ts --apply
```

Die Migration löscht die alte `users`-Collection (enthielt den Event-Code im Klartext) und alte Sessions. Außerdem entfernt sie Wünsche mit ungültigen URLs.
