# Backend

Django + Django REST Framework backend for TripSync. This doc tracks backend-specific setup notes and API surface as apps are built out.

## Apps

- `tripsync_proj` — project config (settings, root urls)
- `activities_app` — activity data
- `auth_user_app` — custom user model + authentication endpoints

## Codys Notes 09/02/2026

### Custom user model

`AUTH_USER_MODEL = "auth_user_app.Auth_User"` (set in `tripsync_proj/settings.py`).

- Extends Django's `AbstractUser`.
- `username`: max 30 chars, must match `^[a-zA-Z0-9_-]{3,30}$` (see `validators.py`).
- `email`: standard `EmailField` (max 254), unique, required.
- Login is by **username**, not email (`USERNAME_FIELD = "username"`).
- Custom `AuthUserManager.create_user` / `create_superuser` handle password hashing and email normalization.

**Note for the team:** `AUTH_USER_MODEL` must stay pointed at this model from before the first `migrate` — swapping the user model after migrations exist is a painful manual fix. If you're setting up a fresh environment, run migrations against this model from the start.

### Auth: JWT (simplejwt)

We moved off `rest_framework.authtoken` and onto `rest_framework_simplejwt`. `DEFAULT_AUTHENTICATION_CLASSES` in `REST_FRAMEWORK` (settings.py) is now `JWTAuthentication`, and `"rest_framework.authtoken"` has been removed from `INSTALLED_APPS` — it's no longer used anywhere.

Any authenticated request needs the header:
```
Authorization: Bearer <access token>
```

Token lifetimes and rotation are configured via `SIMPLE_JWT` in settings.py:
- Access token: 15 minutes
- Refresh token: 7 days
- `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` are on, backed by `rest_framework_simplejwt.token_blacklist` — a used/rotated refresh token can't be reused, and logout blacklists it outright (see `logout/` below).

**Note for the team (frontend):** the response shape from `signup/`/`login/` changed from a single `token` to a pair — `access` and `refresh`. Store both. Send `access` as the `Authorization: Bearer` header on requests. When it expires (401), call `token/refresh/` with the `refresh` token to get a new `access` token. On logout, send the `refresh` token in the request body so it can be blacklisted server-side.

### Endpoints

Base path: `/api/v1/users/` (`tripsync_proj/urls.py` -> `auth_user_app.urls`). Existing endpoint paths/names are unchanged from the token-auth version; `token/refresh/` is new, required by JWT.

| Method | Path      | View      | Auth required | Notes |
|--------|-----------|-----------|----------------|-------|
| POST   | `/api/v1/users/signup/` | `Sign_Up` | No             | Creates user, returns `{ "client": <username>, "access": <token>, "refresh": <token> }`. Validates `username`/`email` via `AuthUserSerializer` first — bad input returns `400` with field errors. |
| POST   | `/api/v1/users/login/`  | `Log_in`  | No             | Body: `username`, `password`. Returns `{ "client": <username>, "access": <token>, "refresh": <token> }` on success, `401` on bad credentials. |
| POST   | `/api/v1/users/logout/` | `Log_out` | Yes            | Body: `{ "refresh": <token> }`. Blacklists that refresh token, returns `204`. Returns `400` if the token is missing/invalid/expired. Note: the caller's *access* token stays technically valid until it naturally expires (JWTs can't be revoked early) — only the refresh token is blacklisted, which stops new access tokens from being minted. |
| GET    | `/api/v1/users/info/`   | `Info`    | Yes            | Returns serialized `AuthUserSerializer` data for the requesting user. |
| POST   | `/api/v1/users/token/refresh/` | `TokenRefreshView` (simplejwt built-in) | No (requires valid refresh token in body) | Body: `{ "refresh": <token> }`. Returns a new `access` token (and a new `refresh` token, since rotation is on). |

`AuthUserSerializer` (`serializers.py`) exposes `id`, `username`, `email` (`id` read-only).




