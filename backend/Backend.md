# Backend

Django + Django REST Framework backend for TripSync. This doc tracks backend-specific setup notes and API surface as apps are built out.

## Apps

- `tripsync_proj` — project config (settings, root urls)
- `activities_app` — activity data
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

Path shown is as defined in `trip_app/urls.py` (`trips/<int:trip_id>/`); not yet wired into `tripsync_proj/urls.py`, so the base prefix isn't final.

| Method | Path      | View      | Auth required | Notes |
|--------|-----------|-----------|----------------|-------|
| GET    | `trips/<trip_id>/` | `TripById` | No | Returns serialized trip via `TripSerializer`, `404` if `trip_id` doesn't exist. |
| PUT    | `trips/<trip_id>/` | `TripById` | No | Full update via `TripSerializer`. `404` if trip doesn't exist, `400` with field errors on bad input. |
| DELETE | `trips/<trip_id>/` | `TripById` | No | Deletes the trip, returns `204`. `404` if it doesn't exist. |

`TripSerializer` (`serializers.py`) exposes `id`, `name`, `city`, `state`, `country` (`id` read-only).
## Created User Tests
Inside of our "tripsync_proj", youll find a "tests" directory with a backend test.


## Created Simple CI/CD
When doing pull requests to backend or dev branches, all tests in 
`backend/tripsync_proj/tests` will run 

## Fixed JWT Cookie Auth
Claude (sadly) helped me create cookie based auth for JWT on the backend. Sorry
Mohamed.

I also updated the backend tests to utilize the new auth




