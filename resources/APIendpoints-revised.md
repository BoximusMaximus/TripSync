# API Endpoints — Proposed Revision

> Revision of `APIendpoints.md`, checked against `ERD.sql`, `resources/README.md`, `settings.py`, and `frontend/nginx/default.conf`. Original left untouched — review this, then replace the original if the team agrees.
>
> **Status:** target spec, nothing implemented yet. `urls.py` currently serves only `/admin/`; no Django app exists.

## What changed and why

1. **Everything now lives under `/api/`.** Nginx only proxies `location /api/` to Django (`frontend/nginx/default.conf:31`) — any route without the prefix reaches the React app in production and 404s. In `urls.py` the routes must include the prefix: `path("api/groups/...", ...)`.
2. **Added a Method column; verbs moved out of URLs.** `/groups/create/` → `POST /api/groups/`; `/users/delete/` → `DELETE /api/users/me/`. This is the shape DRF routers and generic views produce for free — fighting it means writing more code, not less.
3. **Dropped `/trips/<id>/add_group/` — the relationship was backwards.** In `ERD.sql`, `trips.group_id` means a trip belongs to a group from birth. You don't add a group to a trip; you create a trip *inside* a group: `POST /api/groups/<id>/trips/`. (Same reversed-FK mistake as the retired drawSQL diagram.)
4. **Votes reshaped to match the README rules.** The original had `add_vote` only — no way to remove a vote or switch it, both of which are Must requirements. Trip vote is now `PUT` (cast-or-switch: one vote per user per group) and activity vote is `POST` (one of many independent votes, DB-unique per user+activity); both get `DELETE`. "Have I already voted?" comes back as `my_vote` on the detail GETs rather than a separate call.
5. **Auth completed for the graded requirement** (register / login / logout / confirmation): added token refresh and logout. Logout = blacklisting the refresh token — `rest_framework_simplejwt.token_blacklist` is already in `INSTALLED_APPS`, so this is the intended design.
6. **Added the list endpoints the pages need.** The original had only detail-by-id routes. The Groups page needs *all groups*, Home needs *my groups*, Trips page needs *trips in a group*, Trip Detail needs *activities in a trip*.
7. **Membership endpoints cover the leader powers** from the README (grant/revoke read/write, remove member) plus self-service join/leave.
8. **Dropped "id or name" notes** — a `<int:id>` converter can only match integers. IDs only; search-by-name can be a query param later if needed.
9. **Google section corrected:** the list response belongs to Places *Text Search* (a POST), not the Place Details GET; geocoding params include `street`; radius is meters (max 50,000 — 5 mi ≈ 8,047 m). Both keys stay server-side; **add `GOOGLE_MAPS_API_KEY=` to `backend/.env.example`** — it isn't there yet.

## Conventions

- All endpoints prefixed `/api/`; trailing slashes on (Django default).
- Auth: `Authorization: Bearer <access token>` on everything except register, login, and refresh.
- Errors: 400 validation, 401 unauthenticated, 403 not permitted (e.g. non-leader), 404 not found, 409 duplicate vote.
- Computed fields ride on GET responses via `annotate` — `member_count` on groups, `vote_count` + `total_cost_cents` on trips, `vote_count` on activities, `my_vote` on trips and activities. No separate count endpoints.

## Auth & Users

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| POST | `/api/users/register/` | create account | 201 + user payload = the "confirmation" |
| POST | `/api/token/` | log in | SimpleJWT `TokenObtainPairView` → access + refresh |
| POST | `/api/token/refresh/` | new access token | rotation is on — response includes a new refresh token |
| POST | `/api/token/logout/` | log out | blacklists the submitted refresh token |
| GET | `/api/users/me/` | view profile | |
| PATCH | `/api/users/me/` | update profile | |
| DELETE | `/api/users/me/` | delete account | cascades memberships + votes (DB `ON DELETE CASCADE`) |
| GET | `/api/users/me/groups/` | groups I belong to | Home page |

## Groups & Membership

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/groups/` | list all groups | groups are open to browse and join |
| POST | `/api/groups/` | create group | creator's membership auto-created with `is_leader=True` |
| GET | `/api/groups/<int:id>/` | group detail | includes `member_count`, members list |
| PATCH | `/api/groups/<int:id>/` | rename | leader only |
| DELETE | `/api/groups/<int:id>/` | delete group | leader only |
| POST | `/api/groups/<int:id>/join/` | join | request user; duplicate join → 400 (unique user+group) |
| POST | `/api/groups/<int:id>/leave/` | leave | request user |
| PATCH | `/api/groups/<int:gid>/members/<int:uid>/` | grant/revoke `read_access` / `write_access` | leader only |
| DELETE | `/api/groups/<int:gid>/members/<int:uid>/` | remove member | leader only |

## Trips

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/groups/<int:gid>/trips/` | list trips in group | Trips page |
| POST | `/api/groups/<int:gid>/trips/` | create trip in group | replaces `add_group` — the group is set here |
| GET | `/api/trips/<int:id>/` | trip detail | includes `vote_count`, `total_cost_cents`, `my_vote` |
| PATCH | `/api/trips/<int:id>/` | edit trip | |
| DELETE | `/api/trips/<int:id>/` | delete trip | cascades activities + votes |

### Trip votes

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| PUT | `/api/trips/<int:id>/vote/` | cast **or switch** my vote | server removes my existing vote on any other trip in the same group — one trip vote per user per group (API-enforced rule) |
| DELETE | `/api/trips/<int:id>/vote/` | remove my vote | |

## Activities

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/trips/<int:tid>/activities/` | list activities for trip | Trip Detail page + map pins |
| POST | `/api/trips/<int:tid>/activities/` | add activity | body: name, description, cost_estimate_cents, place_id **or** manual address |
| GET | `/api/activities/<int:id>/` | activity detail | includes `vote_count`, `my_vote` |
| PATCH | `/api/activities/<int:id>/` | edit activity | |
| DELETE | `/api/activities/<int:id>/` | delete activity | |
| GET | `/api/activities/find_coords/` | address → lat/lng + place_id | params: `street`, `city`, `state`, `zip`, `country` — the manual-address fallback (Geocoding) |
| GET | `/api/activities/find_activities/` | search places near a point | params: `query`, `lat`, `lng`, `radius_m` (≤ 50000), `min_rating`, `max_results` (Places Text Search) |

### Activity votes

| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| POST | `/api/activities/<int:id>/vote/` | add my vote | duplicate → 409; DB unique (user, activity) is the backstop |
| DELETE | `/api/activities/<int:id>/vote/` | remove my vote | |

## Google integration (server-side — key never ships to the browser)

Both user stories from the original stand:

> **Geocoding** — user is staying at an Airbnb with no Places entry. They type an address; we return lat/lng and a place_id. Powers `find_coords`.
>
> **Places search** — user wants restaurants near the Airbnb. Text query + max results + min rating + a circle (center from geocoding, radius chosen or preset). Powers `find_activities`.

Corrected call shapes:

**Geocoding** (for `find_coords`):
```
GET https://maps.googleapis.com/maps/api/geocode/json?address=<url-encoded address>&key=<KEY>
→ results[0].geometry.location {lat, lng} and results[0].place_id
```

**Text Search** (for `find_activities`) — note this is a **POST**, and the list response the original sketched belongs here, not to Place Details:
```
POST https://places.googleapis.com/v1/places:searchText
Headers: X-Goog-Api-Key: <KEY>
         X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating
Body: { "textQuery": "pizza in Chicago", "maxResultCount": 5, "minRating": 4,
        "locationBias": { "circle": { "center": { "latitude": ..., "longitude": ... }, "radius": 8047 } } }
→ places[]: { id, displayName {text, languageCode}, formattedAddress, location {latitude, longitude}, rating }
```

**Place Details** (only if we need more than search returns):
```
GET https://places.googleapis.com/v1/places/<PLACE_ID>
Headers: X-Goog-Api-Key, X-Goog-FieldMask
```

Practical notes: the new Places API requires the field-mask header on every call (omitting it is an error, not "all fields"); `radius` is meters, max 50,000; `minRating` moves in 0.5 steps; Google uses `latitude`/`longitude`, not `lon`.

## Old → New mapping

| Original | Becomes |
|---|---|
| `/users/` get/"put" | `GET`/`PATCH /api/users/me/` |
| `/users/login/` | `POST /api/token/` |
| `/users/register/` | `POST /api/users/register/` |
| `/users/delete/` | `DELETE /api/users/me/` |
| `/groups/create/` | `POST /api/groups/` |
| `/groups/<id>` | `GET`/`PATCH`/`DELETE /api/groups/<id>/` |
| `/groups/<id>/add_user/` | `POST /api/groups/<id>/join/` (self) · member management for leaders |
| `/trips/create/` + `/trips/<id>/add_group/` | `POST /api/groups/<gid>/trips/` |
| `/trips/<id>` | `GET`/`PATCH`/`DELETE /api/trips/<id>/` |
| `/trip_votes/<trip_id>` | `my_vote` + `vote_count` on `GET /api/trips/<id>/` |
| `/trip_votes/<trip_id>/add_vote/` | `PUT /api/trips/<id>/vote/` (+ `DELETE` to remove) |
| `/activities/create/` | `POST /api/trips/<tid>/activities/` |
| `/activities/<id>` | `GET`/`PATCH`/`DELETE /api/activities/<id>/` |
| `/activities/find_coords/`, `/activities/find_activities/` | same, under `/api/` |
| `/activities_votes/<activity_id>/add_vote/` | `POST /api/activities/<id>/vote/` (+ `DELETE` to remove) |
