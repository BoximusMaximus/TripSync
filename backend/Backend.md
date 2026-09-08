# Backend

Django + Django REST Framework backend for TripSync. This doc tracks backend-specific setup notes and API surface as apps are built out.

## Apps

- `tripsync_proj` — project config (settings, root urls)
- `activities_app` — activities, activity votes, lodging (where the group stays), Google Geocoding + Places (New)
- `trip_app` — trips
- `group_app` — trip membership (one Group per trip, members via M2M)
- `auth_user_app` — custom user model + authentication endpoints

## Codys Notes 09/02/2026

Migrated authentication from DRF token auth to JWT (simplejwt), then migrated again to deliver those JWTs as httponly cookies instead of in the JSON response body. This removes raw tokens from JS entirely and requires the frontend to send credentials with every request and attach a CSRF header on writes. See "Auth: JWT" below for the details frontend needs.

### Custom user model

`AUTH_USER_MODEL = "auth_user_app.Auth_User"` (set in `tripsync_proj/settings.py`).

- Extends Django's `AbstractUser`.
- `username`: max 30 chars, must match `^[a-zA-Z0-9_-]{3,30}$` (see `validators.py`).
- `email`: standard `EmailField` (max 254), unique, required.
- Login is by **username**, not email (`USERNAME_FIELD = "username"`).
- Custom `AuthUserManager.create_user` / `create_superuser` handle password hashing and email normalization.

**Note for the team:** `AUTH_USER_MODEL` must stay pointed at this model from before the first `migrate` — swapping the user model after migrations exist is a painful manual fix. If you're setting up a fresh environment, run migrations against this model from the start.

### Auth: JWT (simplejwt), delivered via httponly cookies

We moved off `rest_framework.authtoken` and onto `rest_framework_simplejwt`, then moved again from returning tokens in the JSON body to setting them as `httponly` cookies. We did this so the frontend never handles raw JWTs in JS (no XSS-based token theft via localStorage) and so `Authorization` header plumbing disappears entirely — the browser just sends the cookies automatically.

`DEFAULT_AUTHENTICATION_CLASSES` is now `auth_user_app.authentication.CookieJWTAuthentication`, a custom class (not simplejwt's default `JWTAuthentication`) that reads the access token from the `access_token` cookie instead of an `Authorization` header, and enforces CSRF on every authenticated request (see below).

Token lifetimes and rotation are configured via `SIMPLE_JWT` in settings.py:
- Access token: 15 minutes, cookie name `access_token`
- Refresh token: 7 days, cookie name `refresh_token`
- `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` are on, backed by `rest_framework_simplejwt.token_blacklist` — a used/rotated refresh token can't be reused, and logout blacklists it outright.

**Note for the team (frontend):**
- `signup/`, `login/`, `token/refresh/` no longer return `access`/`refresh` in the JSON body — tokens arrive as `Set-Cookie` headers instead. Response bodies now only carry `{ "client": <username> }` (or nothing, for refresh/logout).
- Every request to the backend needs `credentials: "include"` (fetch) / `withCredentials: true` (axios), or the cookies won't be sent.
- CSRF is now enforced on authenticated requests (via `CookieJWTAuthentication.enforce_csrf`). `login/` sets a `csrftoken` cookie (`ensure_csrf_cookie`) — read it and send it back as an `X-CSRFToken` header on every POST/PUT/PATCH/DELETE (e.g. `logout/`), or you'll get a `403`.
- To log out client-side, just call `logout/` — no need to track or send the refresh token yourself anymore, it's read from the cookie.

**Note for the team (backend):** cookie names (`access_token`, `refresh_token`) are currently hardcoded string literals in `authentication.py` and `views.py` (the `add_tokens_to_cookie`/`clear_auth_cookies` helpers) rather than settings constants — keep them in sync if you touch either file. `AUTH_COOKIE_SECURE`/`AUTH_COOKIE_SAMESITE` (settings.py) control cookie flags per environment; `AUTH_COOKIE_SECURE` must be `True` in production (HTTPS only).

### Endpoints

## User Endpoints

Base path: `/api/v1/users/` (`tripsync_proj/urls.py` -> `auth_user_app.urls`). Existing endpoint paths/names are unchanged from the token-auth version; `token/refresh/` is new, required by JWT.

| Method | Path      | View      | Auth required | Notes |
|--------|-----------|-----------|----------------|-------|
| POST   | `/api/v1/users/signup/` | `Sign_Up` | No             | Creates user, sets `access_token`/`refresh_token` cookies, returns `{ "client": <username> }`. Validates `username`/`email` via `AuthUserSerializer` first — bad input returns `400` with field errors. |
| POST   | `/api/v1/users/login/`  | `Log_in`  | No             | Body: `username`, `password`. Sets `access_token`/`refresh_token` cookies + `csrftoken` cookie, returns `{ "client": <username> }` on success, `401` on bad credentials. |
| POST   | `/api/v1/users/logout/` | `Log_out` | Yes            | No body needed — reads `refresh_token` cookie, blacklists it, clears both auth cookies, returns `204` regardless of outcome. Requires `X-CSRFToken` header. |
| GET    | `/api/v1/users/info/`   | `Info`    | Yes            | Returns serialized `AuthUserSerializer` data for the requesting user. |
| POST   | `/api/v1/users/token/refresh/` | `TokenRefresh` (custom) | No (requires valid `refresh_token` cookie) | Reads `refresh_token` cookie, sets new rotated `access_token`/`refresh_token` cookies, `401` if missing/invalid. |

`AuthUserSerializer` (`serializers.py`) exposes `id`, `username`, `email` (`id` read-only).

## Trip Endpoints

Base path: `/api/v1/trips/` (`tripsync_proj/urls.py` -> `trip_app.urls`). All require auth (`IsAuthenticated`).

| Method | Path      | View      | Notes |
|--------|-----------|-----------|-------|
| POST   | `/api/v1/trips/create/` | `CreateTrip` | Creates a `Trip`, then auto-creates its `Group` and adds the requesting user as the first member. |
| GET    | `/api/v1/trips/<trip_id>/` | `TripById` | Returns serialized trip, `404` if `trip_id` doesn't exist. |
| PUT    | `/api/v1/trips/<trip_id>/` | `TripById` | Full update via `TripSerializer`. `400` with field errors on bad input. |
| DELETE | `/api/v1/trips/<trip_id>/` | `TripById` | Deletes the trip, returns `204`. |

`TripSerializer` (`serializers.py`) exposes `id`, `name`, `city`, `state`, `country` (`id` read-only).

**Note for the team:** no ownership/membership check yet on `TripById` — any authenticated user can GET/PUT/DELETE any trip by ID, not just trips they belong to. Fine for now, worth tightening later.

## Group Endpoints

Base path: `/api/v1/groups/` (`tripsync_proj/urls.py` -> `group_app.urls`). All require auth (`IsAuthenticated`).

A `Trip` has exactly one `Group` (`Group.trip` is `OneToOneField`); a `Group` can have many members via `Group.auth_user` (`ManyToManyField`). Multiple users on a trip means multiple members on that one `Group`, not multiple `Group` rows.

| Method | Path      | View      | Notes |
|--------|-----------|-----------|-------|
| POST   | `/api/v1/groups/create/` | `CreateGroup` | Body: `trip_id`. Adds the requesting user to the trip's group, creating it first if needed (`get_or_create`) — `201` if created, `200` if it already existed. `400` if `trip_id` is missing/invalid. |
| GET    | `/api/v1/groups/<group_id>/` | `GroupById` | Returns serialized group by its own ID. |
| GET    | `/api/v1/groups/trip/<trip_id>/` | `GroupByTripId` | Returns the group for a given trip. |
| GET    | (no path yet) | `AllUserGroups` | Returns all groups the requesting user belongs to — not yet wired into `urls.py`. |

`GroupSerializer` (`serializers.py`) exposes all fields (`id` read-only), including `auth_user` as a list of member IDs.

**Note for the team:** same as trips — no membership check yet on `GroupById`/`GroupByTripId`, any authenticated user can look up any group.

## Activities Endpoints

Base path: `/api/v1/activities/` (`tripsync_proj/urls.py` -> `activities_app.urls`). All require the `access_token` cookie (401 otherwise) and `X-CSRFToken` on writes (403 otherwise). Server-side Google: Geocoding inside lodging PUT and activity POST/PUT when a location is supplied; Places (New) Text Search behind `search/`, centered on the trip's lodging. Key = `GOOGLE_MAPS_SERVER_KEY` in `backend/.env` (both APIs enabled on it).

| Method | Path | View | Notes |
|---|---|---|---|
| GET | `/api/v1/activities/?trip=<id>` | `AllActivities` | 400 without `trip`, 404 unknown trip |
| POST | `/api/v1/activities/` | `AllActivities` | 201 activity; 400 field errors or `{"error": "Address could not be geocoded"}` |
| GET | `/api/v1/activities/<id>/` | `AnActivity` | 404 unknown id |
| PUT/PATCH | `/api/v1/activities/<id>/` | `AnActivity` | partial; re-geocodes on address/place_id change (old pin kept if Google fails; blanking every address field drops the pin); 400 `{"error": "trip cannot be changed"}` on re-parent |
| DELETE | `/api/v1/activities/<id>/` | `AnActivity` | 204 |
| POST | `/api/v1/activities/<id>/vote/` | `AnActivityVote` | 201 activity; 409 duplicate |
| DELETE | `/api/v1/activities/<id>/vote/` | `AnActivityVote` | 204; 404 if no vote |
| GET | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 404 until set |
| PUT | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 201 first set / 200 replace; always geocodes; 400 if no location or Google fails (nothing written — the old row survives a failed replace); 404 unknown trip |
| DELETE | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 204; 404 if not set |
| GET | `/api/v1/activities/search/?trip=<id>&query=<text>` | `FindActivities` | list of places around the lodging; 400 if no lodging; 502 if Google fails |

## Created User Tests
Inside of our "tripsync_proj", youll find a "tests" directory with a backend test.


## Created Simple CI/CD
When doing pull requests to backend or dev branches, all tests in 
`backend/tripsync_proj/tests` will run 

## Fixed JWT Cookie Auth
Claude (sadly) helped me create cookie based auth for JWT on the backend. Sorry
Mohamed.

I also updated the backend tests to utilize the new auth




