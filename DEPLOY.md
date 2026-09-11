# Deploying TripSync (EC2)

The production stack is `docker-compose.prod.yml`, driven by `make` (targets in `Makefile`). **One env file — `backend/.env` — feeds every container and the build arguments**; there is no root `.env`.

## `backend/.env` on the box

Start from `backend/.env.example` (it ships dev defaults), then set the production values:

| Variable | Production value |
|---|---|
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `backend,localhost,127.0.0.1,tripsync.duckdns.org` — nginx forwards the real `Host`, so the domain must be listed or every request is a 400 |
| `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `AUTH_COOKIE_SECURE` | `True` (HTTPS only) |
| `DJANGO_SECRET_KEY` | a fresh secret. **Avoid `$` in the value** — docker compose expands `$name` inside `.env` values and silently truncates the key |
| `GOOGLE_MAPS_SERVER_KEY` | server key: **Geocoding API** + **Places API (New)** enabled; restrict it by IP to the instance |
| `VITE_GOOGLE_MAPS_API_KEY` | browser key: **Maps JavaScript API** enabled; restrict it by HTTP referrer to `https://tripsync.duckdns.org/*`. It is baked into the frontend bundle **when the image is built** — change the value, then `make frontend-rebuild` |

## Deploy

```bash
make deploy        # git pull --ff-only → build → up → migrate
```

`make prod` does the same without the pull. Both refuse to start when either Google key is missing from `backend/.env` (`make check-env`), and both run `manage.py migrate` afterwards — a new migration can no longer ship without being applied.

`git pull` will stop if the checkout carries local edits (e.g. an old hand-edited `frontend/nginx/default.conf`) — take the repo version: `git checkout -- <file>` and pull again.

## TLS

`frontend/nginx/default.conf` serves `tripsync.duckdns.org` and reads certbot's live directory, which is mounted read-only into the frontend container. Certbot renewals do **not** reload nginx by themselves; install a deploy hook once:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
cd /path/to/TripSync && docker compose --env-file backend/.env -f docker-compose.prod.yml exec -T frontend nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run   # proves the hook runs
```

## When something is wrong

| Symptom | Check |
|---|---|
| Site unreachable | `make ps` — is `react-container` up? `make frontend-logs \| grep -i emerg` — a certificate path nginx cannot read crash-loops it. `curl -s ifconfig.me` vs `dig +short tripsync.duckdns.org` — did the instance IP change? |
| API 500s | `make backend-logs` — 4xx/5xx and tracebacks are logged now (`LOGGING` in `settings.py`, gunicorn access log) |
| Trips or activities 500 after a pull | `make showmigrations` — any `[ ]` line means `make migrate` |
| Map shows "placeholder (set VITE_GOOGLE_MAPS_API_KEY to enable)" | the bundle was built without the key: put it in `backend/.env`, `make frontend-rebuild` |
| Map shows Google's grey "Oops! Something went wrong" or the app's "Google rejected the Maps key" | the browser key's referrer list / enabled APIs in Cloud Console |
| Place search answers 502 "Place search failed" | `make shell` → `from activities_app.google_maps import search_places; print(search_places("pizza", 21.31, -157.86))` — `None` means Google rejects the server key (Places API (New) not enabled, IP restriction, billing); the reason is in `make backend-logs` |
| Place search answers 400 "Could not locate the trip destination" | the trip's city/state/country do not geocode — fix the trip, or set a lodging with `PUT /api/v1/activities/lodging/<trip_id>/` |
| Writes answer 403 "CSRF Failed: …" | the body now carries the reason (`Origin checking failed` → `CSRF_TRUSTED_ORIGINS` / nginx `X-Forwarded-Proto`; `CSRF token missing` → the client is not sending `X-CSRFToken`) |
