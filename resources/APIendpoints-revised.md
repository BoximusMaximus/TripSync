# API Endpoints — Proposed Revision

> Revision of `APIendpoints.md`, checked against `ERD.sql`, `resources/README.md`, `settings.py`, and `frontend/nginx/default.conf`. Original left untouched — review this, then replace the original if the team agrees.
>
> **Status:** the Activities and Activity votes tables below are implemented as written — see `backend/Backend.md`. Users, trips and groups exist but at different paths than the rows below (`/api/v1/users/signup/`, `/api/v1/trips/create/`, `/api/v1/groups/create/` etc., see `backend/Backend.md`); those rows remain the proposed target.

## What changed and why

1. **Everything now lives under `/api/`.** Nginx only proxies `location /api/` to Django (`frontend/nginx/default.conf:31`) — any route without the prefix reaches the React app in production and 404s. In `urls.py` the routes must include the prefix: `path("api/v1/groups/...", ...)`.
2. **Added a Method column; verbs moved out of URLs.** `/groups/create/` → `POST /api/groups/`; `/users/delete/` → `DELETE /api/users/me/`. This is the shape DRF routers and generic views produce for free — fighting it means writing more code, not less.
3. **Dropped `/trips/<id>/add_group/` — the relationship was backwards.** In `ERD.sql`, `trips.group_id` means a trip belongs to a group from birth. You don't add a group to a trip; you create a trip *inside* a group: `POST /api/groups/<id>/trips/`. (Same reversed-FK mistake as the retired drawSQL diagram.)
4. **Votes reshaped to match the README rules.** The original had `add_vote` only — no way to remove a vote or switch it, both of which are Must requirements. Trip vote is now `PUT` (cast-or-switch: one vote per user per group) and activity vote is `POST` (one of many independent votes, DB-unique per user+activity); both get `DELETE`. "Have I already voted?" comes back as `my_vote` on the trip detail GET and `has_voted` on activity GETs rather than a separate call.
5. **Auth completed for the graded requirement** (register / login / logout / confirmation): added token refresh and logout. Logout = blacklisting the refresh token — `rest_framework_simplejwt.token_blacklist` is already in `INSTALLED_APPS`, so this is the intended design.
6. **Added the list endpoints the pages need.** The original had only detail-by-id routes. The Groups page needs *all groups*, Home needs *my groups*, Trips page needs *trips in a group*, Trip Detail needs *activities in a trip*.
7. **Membership endpoints cover the leader powers** from the README (grant/revoke read/write, remove member) plus self-service join/leave.
8. **Dropped "id or name" notes** — a `<int:id>` converter can only match integers. IDs only; search-by-name can be a query param later if needed.
9. **Google section corrected:** the list response belongs to Places *Text Search* (a POST), not the Place Details GET; geocoding params include `street`; radius is meters (max 50,000 — 5 mi ≈ 8,047 m). The server key (`GOOGLE_MAPS_SERVER_KEY` in `backend/.env.example`) serves Geocoding and Places (New) and never ships to the browser; the Maps JS browser key (`VITE_GOOGLE_MAPS_API_KEY`, in `frontend/.env.example` on the `frontend` branch) is `VITE_`-exposed at build time and must be HTTP-referrer restricted in the Cloud console.

## Conventions

- All endpoints prefixed `/api/v1/`; trailing slashes on (Django default).
- Auth: httponly cookie JWT (`access_token`) set by `/api/v1/users/login/` + `X-CSRFToken` header on writes — see `backend/Backend.md`.
- Errors: 400 validation, 401 unauthenticated, 403 not permitted (e.g. non-leader), 404 not found, 409 duplicate vote.
- Computed fields ride on every activity response (list, detail, create, edit, vote) — `vote_count` and `has_voted` on activities, computed per row in the serializer today (`annotate` is the at-scale upgrade); `member_count` on groups, `vote_count` + `total_cost_cents` + `my_vote` on trips are still the target. No separate count endpoints.

## Auth & Users

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| POST | `/api/users/register/` | create account | 201 + user payload = the "confirmation" |
| POST | `/api/token/` | log in | SimpleJWT `TokenObtainPairView` → access + refresh |
| POST | `/api/token/refresh/` | new access token | rotation is on — response includes a new refresh token |
| POST | `/api/token/logout/` | log out | blacklists the submitted refresh token |
| GET | `/api/users/me/` | view profile | |
| PUT | `/api/users/me/` | update profile | |
| DELETE | `/api/users/me/` | delete account | cascades memberships + votes (DB `ON DELETE CASCADE`) |
| GET | `/api/users/me/groups/` | groups I belong to | Home page |

## Groups & Membership

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/groups/` | list all groups | groups are open to browse and join |
| POST | `/api/groups/` | create group | creator's membership auto-created with `is_leader=True` |
| GET | `/api/groups/<int:id>/` | group detail | includes `member_count`, members list |
| PUT | `/api/groups/<int:id>/` | rename | leader only |
| DELETE | `/api/groups/<int:id>/` | delete group | leader only |
| POST | `/api/groups/<int:id>/join/` | join | request user; duplicate join → 400 (unique user+group) |
| POST | `/api/groups/<int:id>/leave/` | leave | request user |
| PUT | `/api/groups/<int:gid>/members/<int:uid>/` | grant/revoke `read_access` / `write_access` | leader only |
| DELETE | `/api/groups/<int:gid>/members/<int:uid>/` | remove member | leader only |

## Trips

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/groups/<int:gid>/trips/` | list trips in group | Trips page |
| POST | `/api/groups/<int:gid>/trips/` | create trip in group | replaces `add_group` — the group is set here |
| GET | `/api/trips/<int:id>/` | trip detail | includes `vote_count`, `total_cost_cents`, `my_vote` |
| PUT | `/api/trips/<int:id>/` | edit trip | |
| DELETE | `/api/trips/<int:id>/` | delete trip | cascades activities + votes |

### Trip votes

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| PUT | `/api/trips/<int:id>/vote/` | cast **or switch** my vote | server removes my existing vote on any other trip in the same group — one trip vote per user per group (API-enforced rule) |
| DELETE | `/api/trips/<int:id>/vote/` | remove my vote | |

## Activities

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/v1/activities/?trip=<id>` | list activities for a trip | Trip Detail page + map pins; `trip` query param required (400 if missing, 404 if unknown); each row carries `latitude`/`longitude` (numbers or null), `formatted_address` (or null), `vote_count`, `has_voted` |
| POST | `/api/v1/activities/` | add activity | 201 with the activity; body: `trip` and `name` (required), `description`, `cost_estimate_cents` (whole cents >= 0, default 0), and either `place_id` (Places pick) or any of `street/city/state/zip/country` (manual) — all optional; 400 field errors on bad input; server geocodes when a location is given — 400 `{"error": "Address could not be geocoded"}` and no row on failure; no location at all is allowed (no pin) |
| GET | `/api/v1/activities/<int:id>/` | activity detail | same shape as the list rows |
| PUT / PATCH | `/api/v1/activities/<int:id>/` | edit activity | partial — send only changed fields; a changed address or `place_id` re-geocodes (old pin kept if Google fails; blanking every address field drops the pin); `trip` cannot change (400) |
| DELETE | `/api/v1/activities/<int:id>/` | delete activity | 204; cascades pin + votes |
| GET | `/api/v1/activities/lodging/<int:trip_id>/` | where the group is staying | the map center; 404 until set (the UI shows the lodging form) |
| PUT | `/api/v1/activities/lodging/<int:trip_id>/` | set or replace the lodging | body: `name` (optional) and either `place_id` (Places pick) or an address; server geocodes — 201 first time, 200 on replace; 400 `{"error": "Provide a place_id or an address"}` if the body has neither; 400 `{"error": "Address could not be geocoded"}` if Google fails, with nothing written (first set: no row; replace: the old row stands); 404 unknown trip; replace, not merge — any address field not sent is reset to '' |
| DELETE | `/api/v1/activities/lodging/<int:trip_id>/` | clear the lodging | 204 |
| GET | `/api/v1/activities/search/` | Places Text Search around the lodging | params: `trip`, `query` (both required; missing → 400), `radius_m` (metres, default 5000, clamped to 0–50000), `min_rating` (0–5 in 0.5 steps, optional, passed through unvalidated), `max_results` (default 10, clamped to 1–20); non-numeric values → 400 `{"error": "radius_m, min_rating and max_results must be numbers"}`; 404 unknown trip; 400 `{"error": "Set where the group is staying first"}` if the trip has no lodging; 502 `{"error": "Place search failed"}` if Google fails; each hit: `place_id, name, formatted_address, latitude, longitude` |

### Activity votes

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/activities/<int:id>/vote/` | add my vote | 201 with the updated activity (`vote_count`, `has_voted`); duplicate → 409; DB unique (user, activity) is the backstop |
| DELETE | `/api/v1/activities/<int:id>/vote/` | remove my vote | 204; no vote of mine → 404 |

## Google integration (two keys: a browser key for Maps JS — `VITE_GOOGLE_MAPS_API_KEY`, HTTP-referrer restricted; a server key — `GOOGLE_MAPS_SERVER_KEY` — for Geocoding + Places (New), never shipped to the browser)

Both user stories from the original stand:

> **Geocoding** — user is staying at an Airbnb with no Places entry. They type the lodging address; the server geocodes it inside `PUT /api/v1/activities/lodging/<trip_id>/` and stores lat/lng + place_id — the map center and the search bias. The same call is the manual-address fallback on activities.
>
> **Places search** — user wants restaurants near the Airbnb. Text query + max results + min rating + a circle (center from geocoding, radius chosen or preset). Powers `GET /api/v1/activities/search/?trip=&query=` — the circle's center is the trip's stored lodging.

Corrected call shapes:

**Geocoding** (lodging PUT and the manual-address fallback on activities) and **Text Search** (`search/`) — v4 / Places (New): header auth, field masks:
```
GET https://geocode.googleapis.com/v4/geocode/places/<PLACE_ID>            (Places pick)
GET https://geocode.googleapis.com/v4/geocode/address/<url-encoded text>   (manual entry; ?regionCode=XX bias when country is ISO-2)
Headers: X-Goog-Api-Key: <SERVER KEY>
         X-Goog-FieldMask: location,formattedAddress,placeId          (place form)
         X-Goog-FieldMask: results.location,results.formattedAddress,results.placeId  (address form)
→ location {latitude, longitude}, formattedAddress, placeId   (address form wraps in results[])

POST https://places.googleapis.com/v1/places:searchText                  (search around the lodging)
Headers: X-Goog-Api-Key: <SERVER KEY>, Content-Type: application/json
         X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location   (REQUIRED)
Body: { "textQuery": "...", "pageSize": ≤20, "minRating": 0-5 in 0.5 steps (optional),
        "locationBias": { "circle": { "center": { "latitude", "longitude" }, "radius": ≤50000 m } } }
→ places[]: { id, displayName {text, languageCode}, formattedAddress, location {latitude, longitude} }
```

**Place Details** (only if we need more than search returns):
```
GET https://places.googleapis.com/v1/places/<PLACE_ID>
Headers: X-Goog-Api-Key, X-Goog-FieldMask
```

Practical notes: the new Places API requires the field-mask header on every call (omitting it is an error, not "all fields"); `radius` is meters, max 50,000; `minRating` moves in 0.5 steps; Google uses `latitude`/`longitude`, not `lon`; `pageSize` (≤ 20) replaced the deprecated `maxResultCount`; `rating` stays out of the mask because it moves billing to the Enterprise SKU.

## Old → New mapping

| Original | Becomes |
|---|---|
| `/users/` get/"put" | `GET`/`PUT /api/users/me/` |
| `/users/login/` | `POST /api/token/` |
| `/users/register/` | `POST /api/users/register/` |
| `/users/delete/` | `DELETE /api/users/me/` |
| `/groups/create/` | `POST /api/groups/` |
| `/groups/<id>` | `GET`/`PUT`/`DELETE /api/groups/<id>/` |
| `/groups/<id>/add_user/` | `POST /api/groups/<id>/join/` (self) · member management for leaders |
| `/trips/create/` + `/trips/<id>/add_group/` | `POST /api/groups/<gid>/trips/` |
| `/trips/<id>` | `GET`/`PUT`/`DELETE /api/trips/<id>/` |
| `/trip_votes/<trip_id>` | `my_vote` + `vote_count` on `GET /api/trips/<id>/` |
| `/trip_votes/<trip_id>/add_vote/` | `PUT /api/trips/<id>/vote/` (+ `DELETE` to remove) |
| `/activities/create/` | `POST /api/v1/activities/` (`trip` in the body) |
| `/activities/<id>` | `GET`/`PUT`/`PATCH`/`DELETE /api/v1/activities/<id>/` |
| `/activities/find_coords/`, `/activities/find_activities/` | `PUT /api/v1/activities/lodging/<trip_id>/` (geocoded, persisted) and `GET /api/v1/activities/search/?trip=&query=` (Places, centered on the lodging) |
| `/activities_votes/<activity_id>/add_vote/` | `POST /api/v1/activities/<id>/vote/` (+ `DELETE` to remove) |
