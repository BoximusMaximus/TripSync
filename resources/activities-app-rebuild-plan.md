# activities_app rebuild plan — match CJs_roofing + absorb geocoding

Every code block below was written into a throwaway copy of `backend/tripsync_proj` as it stands on `origin/backend` after PR #102 (Cody's trip_app + group_app merge, with his `activities_app/0001` in place), run through `manage.py check`, `makemigrations` (producing the `0002` shown in Step 3), and `manage.py test tests` (78 tests, all green: 27 existing — 18 auth + 9 trip — plus 12 Google helper and 39 activities / lodging / search) on Django 6.1 / DRF 3.18 / requests 2.34.2 — against a throwaway SQLite/locmem settings override, not Postgres/Redis — before it went into this file. Nothing in your repo was touched. Two things were NOT executed: the live Google calls (no key in this session — Step 1's three pre-flight curls prove the two Geocoding endpoints and the Places search) and Postgres itself (Step 3's psql output and Step 9's run inside the container prove that; Step 3's expected `\d` lines are what Django's Postgres backend emits, inferred, not observed).

## Read this first

Run this once and keep the output in view:

```bash
pwd
```

Expected: `/Users/dominicbarrale/code/code_platoon/projects/TripSync`

Two terminals for the whole plan:

| Terminal | Where | What runs there |
|---|---|---|
| **HOST** | repo root (the `pwd` above) | `git`, `curl`, `docker compose`, `make`, editing files |
| **CONTAINER** | `make backend` drops you at `/app/tripsync_proj` | every `python manage.py ...` in this plan |

Why the split: `manage.py` calls `load_dotenv()` (manage.py:6-8), which pulls `backend/.env` into the process, and that file says `POSTGRES_HOST=db`. On your Mac there is no host called `db`, so `migrate`, `test`, `runserver` and any `shell` command that touches the database fail on the host. Inside the compose network `db` resolves. The bind mount (`./backend:/app`, docker-compose.yml:23) means the container sees every file you edit on the host instantly — no rebuild.

Bring the stack up before Step 1's VERIFY, which already needs the backend container — the pre-flight curls and Step 2's `check` are the only commands in Steps 1-2 that do not (the Docker daemon was down when this repo was audited):

```bash
docker compose up -d --build
make backend
```

`make backend` runs `docker compose exec backend bash` (Makefile:18-19). The Dockerfile also aliases `pm` to `python manage.py`; the plan writes the long form so nothing depends on the alias.

Conventions for the plan itself:

- Every command is yours to type. Nobody writes to your repo for you.
- Flags you will see inline: **[ERD/README/spec deviation]**, **[CJs deviation]**, **[beyond CJs ceiling]**, **[breaks at scale]**, **[assumption]**.
- Python 3.13 in the container, Django 6.1, DRF 3.18.0, simplejwt 5.5.1, requests 2.34.2 (already pinned, requirements.txt:17).
- Baseline: your branch fast-forwarded to `origin/backend` at PR #102 (Step 0 does that). Every "current" below means that commit.

## The three Google integrations — who calls what

| | API | Runs in | Key | What it does here |
|---|---|---|---|---|
| a | **Maps JavaScript API** | browser | browser key (`VITE_GOOGLE_MAPS_API_KEY`, HTTP-referrer restricted) | renders the map on the Trip Detail page — **centered on the lodging**, one pin per activity that has a `latitude`/`longitude` |
| b | **Geocoding API** | Django | server key (`GOOGLE_MAPS_SERVER_KEY`) | turns the address of where the group is staying (Airbnb / hotel) into `place_id` + lat/lng — the `Lodging` row, one per trip. The same call serves the manual-address fallback on activities |
| c | **Places API (New) — Text Search** | Django | server key | "pizza", "surf lessons", "museum" searched **around the lodging**; every hit carries a `place_id` the user turns into an activity with one POST |

The flow the code implements: set the lodging (`PUT lodging/<trip_id>/`, geocoded) → the map centers there → search (`GET search/?trip=&query=`, biased to the lodging) → pick a hit → `POST /api/v1/activities/` with its `place_id` (geocoded by id, pin stored) → the list GET feeds the pins. Nothing in the browser ever sees the server key; nothing on the server ever needs the browser key.

Why two keys and not one: a key that ships in JavaScript is public — the only thing stopping a stranger from billing it is an HTTP-referrer restriction, and a referrer-restricted key answers `403` to Django because a server request has no referrer. So the browser key is restricted to Maps JS + your domains, and the server key to Geocoding + Places (New) + the EC2 IP. One unrestricted key "works", and it is the first thing a reviewer flags.

**[assumption]** the lodging is *stored*, not just looked up. The original spec's `find_coords` returned coordinates for the browser to hold; but the whole group shares one Airbnb, and every member's map should center there without anyone re-typing the address. One `Lodging` row per trip, owned by this app, so nothing in Cody's `trip_app` changes. The stateless alternative is one GET endpoint and no model — say so if that is what the team wants (Open decisions #14).

## What changes and why

| # | File | Current | Target | Why |
|---|---|---|---|---|
| 1 | `activities_app/models.py` (+ `migrations/0001_initial.py`) | `Activity(trip, name, TextField description, location, created_by, timestamps)`, ordering `-created_at`, `vote_count` property; `ActivityVote` constraint `unique_activity_vote_per_user` on `(activity, user)`; Cody's `0001` from exactly this shape, shipped in PR #102 | ERD columns exactly (`street/city/state/zip/country/place_id` blank-able, `cost_estimate_cents`), timestamps kept, ordering `['id']`, new `ActivityGeocode` OneToOne (lat/lng/formatted_address), new `Lodging` OneToOne on Trip (where the group stays: address + `place_id` + lat/lng on the row — the map center and the search bias), constraint `unique_user_activity_vote` on `(user, activity)`; `0002` stacked on the shipped `0001` | ERD.sql is the declared schema source of truth (README:62); CJs stores Google's answer in its own OneToOne row; the lodging is the center everything else hangs off; a shipped migration is built on, never rewritten |
| 2 | `activities_app/validators.py` | absent | `validate_cost_cents` | CJs field-error idiom (projects/validators.py); keeps the ERD's bare `INTEGER` (no CHECK) while still refusing negatives |
| 3 | `activities_app/google_maps.py` | absent (lives in CJs `api_app/views.py`) | `geocode_address()` (Geocoding v4, place-id and free-text branches) and `search_places()` (Places API (New) Text Search, biased to a center) — plain functions sharing one `_api_key()` check | The graded server-side authenticated API (README:50), folded into this app as asked; CJs's `api_app/views.py` is not a view, its regionCode is hardcoded `US`, and CJs never had a second Google API |
| 4 | `activities_app/serializers.py` | `ReadOnlyField`, `PrimaryKeyRelatedField(read_only)`, `location`, `created_by` | explicit `fields` + `read_only_fields`, five `SerializerMethodField`s with the `hasattr` guard, `float()` coordinates; `LodgingSerializer` (no guard — a lodging always has its pin; `trip` read-only from the URL) | CJs projects/serializers.py shape; DRF renders Decimals as strings and the map needs numbers |
| 5 | `activities_app/views.py` | DRF generics + `IsTripMemberAndVoter`; no detail GET, no edit, no Google | `APIView` only: `ActivityView` base, `AllActivities`, `AnActivity`, `AnActivityVote`, `ALodging` (set / replace / delete where the group stays), `FindActivities` (Places search around it); geocode on create/update; 409 on duplicate vote; 502 when Google fails a search | generics are beyond the CJs ceiling; every request 500s today (`trip.members` does not exist); README needs edit + map pins |
| 6 | `activities_app/permissions.py` | custom `BasePermission` referencing `trip.members` / `trip.has_user_voted` | deleted | CJs writes zero permission classes — access is queryset scoping + `IsAuthenticated`; the class is broken and its read-gated-on-voting rule contradicts README:162-168 |
| 7 | `activities_app/urls.py` + `tripsync_proj/urls.py` | `app_name`, kebab names, nested `trips/<trip_id>/activities/...` mounted at `api/` | no `app_name`, snake_case names, `''` / `search/` / `lodging/<int:trip_id>/` / `<int:id>/` / `<int:id>/vote/` mounted at `api/v1/activities/` | CJs urls shape; consistent with `api/v1/users/` and the un-namespaced `reverse('signup')` the repo's tests already use |
| 8 | `activities_app/admin.py` | two bare registers | `StackedInline` for the geocode row on `ActivityAdmin`; plain register for `Lodging` | CJs projects/admin.py; the inline is the visible receipt that Django called Google |
| 9 | `tests/test_activities_views.py`, `tests/test_google_maps.py` | none (`activities_app/tests.py` is an empty stub CI never runs) | 39 endpoint tests on `UnthrottledAPITestCase` + 12 helper tests on `django.test.TestCase` (no HTTP, so no throttle — the CJs api_app/tests.py shape), Google mocked with the CJs `type("MockResponse", ...)` stub — `requests.get` for Geocoding, `requests.post` for Places | CI runs exactly `python manage.py test tests` (backend-tests.yml:64-66); throttling and Redis make CJs's `django.test.Client` pattern unusable here |
| 10 | `backend/.env.example`, `resources/ERD.sql`, `erd.mmd`, `README.md`, `APIendpoints-revised.md`, `backend/Backend.md` | no Google variable; ERD has no geocode table or timestamps; spec proposes nested routes, `my_vote`, Geocoding v3, Bearer auth | `GOOGLE_MAPS_SERVER_KEY=`; `activity_geocodes` + `lodgings` tables and two timestamps in all three schema docs; spec rows for lodging + search replace `find_coords` / `find_activities` | README:62 says the three schema files change together; the spec is stale against both the code and the merged frontend |

Not changed: `activities_app/apps.py` (already CJs-shaped), `activities_app/tests.py` (leave the stub; CI ignores it), `settings.py` (one optional cosmetic line in Step 2b).

## Step 0 — Git state and migration ownership (blocking; nothing to code)

**MACRO WHY.** Cody's `trip_app` branch merged into `backend` (PR #102) and then `dev` (PR #103) on Sept 4. It carried an `activities_app/migrations/0001_initial.py` generated from the OLD `Activity` shape (`location`, `created_by`, `TextField` description, ordering `-created_at`, constraint `unique_activity_vote_per_user`) — a side effect of running `makemigrations` with your app installed. That file is now on two shared branches, every teammate who pulled has applied it, and CI has built databases from it. A migration on a shared branch is *shipped*: you never rewrite it, you stack the next one on top. So the plan is `0002`, not a fresh `0001`, and Step 3 is written that way. The same merge gave `Trip` its `city/state/country` (required) and added `group_app`; every code block in this plan was re-verified against that merged state, not the stub. Your branch has no commits of its own — it fast-forwards onto `origin/backend` with nothing to merge.

**Commands (HOST).**

```bash
git status
git branch --show-current
git fetch --all
git rev-list --left-right --count HEAD...origin/backend
git ls-tree --name-only origin/backend backend/tripsync_proj/activities_app/migrations/ backend/tripsync_proj/trip_app/migrations/ backend/tripsync_proj/group_app/migrations/
git merge --ff-only origin/backend
git log --oneline -1
git show HEAD:backend/tripsync_proj/activities_app/migrations/0001_initial.py
git show HEAD:backend/tripsync_proj/trip_app/models.py
```

**UNDERNEATH.**
- `git rev-list --left-right --count HEAD...origin/backend` prints two numbers: commits only on your branch, commits only on `origin/backend`. `0 12` means you have nothing they lack and they have twelve commits you lack — the fast-forward case.
- `git ls-tree` reads a tree object from a branch without checking it out. Expect `activities_app/migrations/0001_initial.py`, `trip_app/migrations/0001_initial.py` + `0002_trip_city_trip_country_trip_state.py`, and `group_app/migrations/0001_initial.py`. All shipped.
- `git merge --ff-only origin/backend` moves your branch pointer forward to `b055bdc` and refuses — no merge commit, no conflict resolution — if a fast-forward is not possible. It carries your uncommitted `backend/.env.example` edit along untouched, because `origin/backend` did not change that file; git only objects to dirty files the merge would overwrite.
- `git show HEAD:<path>` prints a file at the commit you are now on. Read the stale `0001` once: `CreateModel Activity` with `location` and `created_by`, `CreateModel ActivityVote` with `unique_activity_vote_per_user` on `('activity', 'user')`. Step 3's `0002` is the diff from that to the model in Step 2. Cody's `Trip` has `name, city, state, country` — each `CharField(60)`, none optional — which is why `make_trip()` in Step 9 passes all four.

**VERIFY.**
- Macro: the branch is a clean fast-forward of `origin/backend`, the shipped migrations are what you think they are, and nothing of yours was lost.
- Micro: `--left-right --count` = ahead/behind; `ls-tree --name-only` = filenames only; `--ff-only` = fail rather than merge; `log -1` = the commit you landed on.
- Expected: `backend-dom-backend`; `git status` shows only ` M backend/.env.example` (the uncommitted `GOOGLE_MAPS_API_KEY=` line Step 1 renames); `0 12`; the five migration files above; `Fast-forward` in the merge output; `b055bdc Merge pull request #102 from BoximusMaximus/trip_app`; `git status` afterwards STILL shows only ` M backend/.env.example`.
- If instead `git rev-list` prints a non-zero first number, you have local commits the audit did not see — stop and paste the output; `--ff-only` would refuse and the plan needs a rebase step instead.

**Agree with Cody before Step 3** (record it in the PR description):
1. His `activities_app/0001` stays exactly as it is — it shipped in #102. You stack `0002` on it (Step 3). Nobody edits a shipped migration.
2. Anyone whose dev database predates PR #102 runs `docker compose down -v && docker compose up -d backend` once — the volume is disposable; a migration history that never matched a model is not worth reconciling by hand.
3. Heads-up, his file, his call: `trip_app/0002` fills the three new columns with one-off defaults (`'wilmington'`, `'NC'`, `'USA'`, `preserve_default=False`) — the "answer the prompt" pattern CJs's guide warns produces a migration that lies about the model. Harmless while the table is empty; worth knowing before it isn't.
4. Before the PR to `main`: if production has never applied `activities_app.0001` (check `select app, name from django_migrations where app = 'activities_app';` on the EC2 database), the team may prefer to squash `0001` + `0002` into one clean `0001` on `dev` first. If production has applied it, `0002` is the only correct path and the question is closed.

**One more thing the merge changed:** `group_app.Group` is *not* the ERD's `groups` + `memberships`. It is one `Group` per trip (`OneToOneField` to `Trip`, `related_name="group"`) holding members in a `ManyToManyField` `auth_user` — no `read_access`, `write_access` or `is_leader`, and no "a group has many trips". That is Cody's design decision and the `groups` epic owner's to reconcile with `ERD.sql`; for this app it only changes the Phase 2 scoping expression (see "Dependencies outside this app"), which is now one filter instead of two.

## Step 1 — Environment: the server key, documented and proven

**MACRO WHY.** CJs's own docs record losing hours to a key-name mismatch between prose (`GOOGLE_MAPS_API_KEY`) and code (`GOOGLE_MAPS_SERVER_KEY`): every geocode silently returned `None` and every create 400'd (7_places_autocomplete_plan.md §6). `.env.example` is the committed contract; `.env` is gitignored. And "no amount of correct code survives a dead key" — the pre-flight curl separates "my code is wrong" from "my Google project is wrong" before any Python exists. The unstructured `/v4/geocode/address/{text}` endpoint and the Places `places:searchText` call in Step 5 were verified against Google's reference docs but not executed in this session; the second and third curls are what execute them.

**GCP setup (browser, once).** In the Google Cloud project: enable **Geocoding API** and **Places API (New)** — two separate entries in the API library; the one called plain "Places API" is the legacy service and does not answer `places:searchText`. Create a key with *API restriction* = those two only and *Application restriction* = None for dev (IP-restricted to the EC2 box later). This is a SEPARATE key from the frontend's `VITE_GOOGLE_MAPS_API_KEY` — a key with an HTTP-referrer restriction answers 403 to curl and to Django because a server request has no referrer, and you would spend an afternoon chasing your code. **[assumption]** the team's GCP project already exists for the frontend's Maps JS key; if not, whoever owns billing creates it.

**Edit `backend/.env.example`.** `git diff backend/.env.example` already shows an uncommitted `GOOGLE_MAPS_API_KEY=` line at the bottom, and `backend/.env` ends with `#Google Cloud Platform` / `GOOGLE_MAPS_API_KEY=` — the prose name from APIendpoints-revised.md:17, which the code will NOT read. That is the CJs time sink, already started in this repo. Replace that line in `.env.example` with:

```dotenv
# GOOGLE MAPS (server key - Geocoding API + Places API (New); IP-restricted in prod; NOT the browser VITE_ key)
GOOGLE_MAPS_SERVER_KEY=
```

**Edit `backend/.env`** (gitignored) — replace its `GOOGLE_MAPS_API_KEY=` line with the same two lines and the real value after `=`. Leave no `GOOGLE_MAPS_API_KEY` anywhere under `backend/`; the browser key is a different variable (`VITE_GOOGLE_MAPS_API_KEY`) in the frontend's own env file.

**UNDERNEATH.**
- `docker-compose.yml:18-19` injects `backend/.env` into the container with `env_file`, so the variable reaches `os.environ` in Django. A running container does NOT re-read `env_file`; it must be recreated.
- `manage.py`'s `load_dotenv()` also loads `/app/.env` inside the container (the bind mount includes it), but `load_dotenv` never overrides variables that already exist — compose's copy wins. Same value either way.
- The key is read with `os.environ[...]` at call time in Step 5, not at import time — so tests (which patch the variable) and CI (which has no key) never need it to import the module.
- An EMPTY value — `GOOGLE_MAPS_SERVER_KEY=` exactly as it sits in `.env.example`, i.e. the state every teammate is in after `cp .env.example .env` — is loaded as `''` by both python-dotenv and compose `env_file` (verified). `os.environ[...]` returns `''` without raising and requests sends the empty header. Step 5 treats empty the same as missing so it fails loudly instead of as a 400.

**VERIFY (HOST).**

```bash
grep -n GOOGLE backend/.env.example backend/.env
docker compose up -d backend
docker compose exec backend printenv | grep GOOGLE
export GOOGLE_MAPS_SERVER_KEY="$(grep '^GOOGLE_MAPS_SERVER_KEY=' backend/.env | cut -d= -f2-)"
curl -s -H "X-Goog-Api-Key: $GOOGLE_MAPS_SERVER_KEY" \
     -H "X-Goog-FieldMask: location,formattedAddress,placeId" \
     "https://geocode.googleapis.com/v4/geocode/places/ChIJj61dQgK6j4AR4GeTYWZsKWw"
curl -s -H "X-Goog-Api-Key: $GOOGLE_MAPS_SERVER_KEY" \
     -H "X-Goog-FieldMask: results.location,results.formattedAddress,results.placeId" \
     "https://geocode.googleapis.com/v4/geocode/address/933%20Kapahulu%20Ave%2C%20Honolulu%2C%20HI%2096816?regionCode=US"
curl -s -X POST "https://places.googleapis.com/v1/places:searchText" \
     -H "Content-Type: application/json" \
     -H "X-Goog-Api-Key: $GOOGLE_MAPS_SERVER_KEY" \
     -H "X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location" \
     -d '{"textQuery": "pizza", "pageSize": 3, "locationBias": {"circle": {"center": {"latitude": 21.275, "longitude": -157.825}, "radius": 5000}}}'
```

- Macro: the key is documented, reaches the container, and all three Google calls the code will make — two Geocoding, one Places — answer 200.
- Micro: `docker compose up -d backend` recreates the backend container AND `db` — both read `backend/.env` via `env_file` (docker-compose.yml:5-6, 18-19) and `backend` depends on `db`; the Postgres data lives on the `postgres_data` volume, so nothing is lost (add `--no-deps` to recreate only the backend); `printenv | grep` proves the variable is inside; `cut -d= -f2-` keeps everything after the first `=`, so the value survives even if Google ever issues a key containing `=`; `-H` sets the two auth/mask headers; the address text in the URL path is percent-encoded (`%20` space, `%2C` comma) exactly as Step 5's `quote(text, safe="")` will produce it; `-X POST` and `-d` send the JSON body the third call needs, and `Content-Type: application/json` tells Google how to read it — the same body Step 5's `search_places` builds.
- Expected: `grep` → one `GOOGLE_MAPS_SERVER_KEY` line per file and no `GOOGLE_MAPS_API_KEY` anywhere (if that name still prints, the rename is incomplete); `printenv` → the same name inside the container with the value; first curl → JSON with `"placeId": "ChIJj61dQgK6j4AR4GeTYWZsKWw"` and a `location` object (single object, no wrapper). Second curl → `{"results": [{ "location": {...}, "formattedAddress": "...", "placeId": "..." }]}`. Third curl → `{"places": [ { "id": "ChIJ...", "displayName": {"text": "...", "languageCode": "en"}, "formattedAddress": "...", "location": {"latitude": 21.2..., "longitude": -157.8...} }, ... ]}` — up to three pizza places near Waikiki, and NOTHING else (the field mask is why).
- If instead: `403 PERMISSION_DENIED` → Geocoding API not enabled on the project, or the key is referrer-restricted (you grabbed the browser key). `400 API_KEY_INVALID` → typo in the value. `404` on the second curl → the path was not encoded (a raw `/` or space in the address). `403` on the third curl only → Places API (New) is not enabled (the legacy "Places API" does not count). `400 INVALID_ARGUMENT` on the third → the field-mask header is missing or misspelled — on Places (New) it is required, not optional.

## Step 2 — validators.py and models.py

**MACRO WHY.** The ERD is the schema authority and the current model diverges from it on six columns. The CJs pattern keeps Google's answer in a separate OneToOne row (`GeocodingResult` in CJs; `ActivityGeocode` here) so the address record and Google's receipt are two rows written together and the "no location" case is simply "no row". Optional address fields are `blank=True` with the implicit `''` default: that satisfies the ERD's `NOT NULL` AND the README's "optional" at the same time — the two docs only appear to conflict. `cost_estimate_cents` is `IntegerField` + a validator rather than `PositiveIntegerField` because the latter emits a `CHECK (>= 0)` the ERD does not have, and it is not a field CJs uses. A senior engineer notices the constraint name and field order now match `ERD.sql:85` (`unique_user_activity_vote` on `(user_id, activity_id)`), and that `ordering = ['id']` is why the frontend can append a new card at the end instead of re-sorting. The `Lodging` row is the one place the pin lives ON the row instead of in a side table: an activity can exist without a location, a lodging cannot — its only job is to be a point on the map — so there is no "no row" case to model and `hasattr` has nothing to guard.

**Flags.**
- **[ERD deviation]** `created_at`/`updated_at` on `activities` and the whole `activity_geocodes` table are additions — Step 11 updates ERD.sql, erd.mmd and the README diagram together.
- **[ERD deviation]** the `lodgings` table is new — one row per trip, OneToOne, in this app so `trip_app` is untouched. Step 11 adds it to the three schema docs; Open decisions #14–15 are the two ways the team could say no.
- **[ERD deviation, resolved]** `description` becomes `CharField(255, blank=True)` (was `TextField`) to match `VARCHAR(255) NOT NULL`.
- **[ERD deviation, resolved]** `created_by` and `location` are dropped — neither is in ERD.sql:31-46; TripSync ownership is group membership, not creator.
- **[CJs deviation]** `place_id` stays on `Activity` (ERD.sql:40; the frontend reads `activity.place_id`) instead of on the geocode row. Google still owns it: it is read-only in the serializer and the view writes it from the geocode result.
- **[beyond CJs ceiling]** `models.UniqueConstraint` — plain Django, not used in CJs (CJs expresses uniqueness with `OneToOneField`). A vote is a many-to-many-ish row, so `OneToOne` cannot express it; work-breakdown-2026-08-31.md already prescribes this.
- **[CJs deviation]** column is `zip`, not CJs's `zip_code` — ERD.sql:38 and the frontend payload both say `zip`. Inside the class body this rebinds the builtin `zip` for that namespace only; Django does not care, a linter (ruff A003) might.
- **[breaks at scale]** `IntegerField` has no DB `CHECK`; a negative written through the ORM shell bypasses the validator. The API and admin both enforce it.
- **[migration-driven]** `default=""` on `street/city/state/zip/country/place_id` — Activity only. Step 3's `0002` adds these columns to a table that already exists on `dev`, and Django will not add a NOT NULL column to existing rows without a value; the alternative is the interactive one-off-default prompt that writes a lying migration. `Lodging` has no defaults because its table is created from scratch.

### `backend/tripsync_proj/activities_app/validators.py` (new)

```python
from django.core.exceptions import ValidationError


def validate_cost_cents(value: int):
    good_input = value >= 0
    if not good_input:
        raise ValidationError(
            message='"%(value)s" is not a valid cost. Enter whole cents, 0 or more.',
            params={"value": value},
        )
```

### `backend/tripsync_proj/activities_app/models.py` (replace whole file)

```python
from django.conf import settings
from django.db import models
from .validators import validate_cost_cents


class Activity(models.Model):
    #string form - trip_app is another app; deferring the lookup can never go circular
    trip = models.ForeignKey(
        "trip_app.Trip",
        on_delete=models.CASCADE,
        related_name="activities",
    )
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    #address is optional (README) - blank=True stores '' which still satisfies ERD NOT NULL
    street = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    state = models.CharField(max_length=255, blank=True, default="")
    zip = models.CharField(max_length=255, blank=True, default="")
    country = models.CharField(max_length=255, blank=True, default="")
    #google's receipt - written by the view from the geocode result, never by the client
    place_id = models.CharField(max_length=255, blank=True, default="")
    cost_estimate_cents = models.IntegerField(default=0, validators=[validate_cost_cents])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} (trip {self.trip_id})"


class ActivityGeocode(models.Model):
    #populated server-side when an activity gets a location; never written by the client
    activity = models.OneToOneField(
        Activity,
        on_delete=models.CASCADE,
        related_name="geocode",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    formatted_address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.formatted_address


class ActivityVote(models.Model):
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        #one vote per user per activity - the DB is the backstop, the view answers 409 first
        constraints = [
            models.UniqueConstraint(
                fields=["user", "activity"], name="unique_user_activity_vote"
            )
        ]

    def __str__(self):
        return f"user {self.user_id} -> activity {self.activity_id}"


class Lodging(models.Model):
    #where the group is staying - one per trip; the map centers here and place search is biased here
    trip = models.OneToOneField(
        "trip_app.Trip",
        on_delete=models.CASCADE,
        related_name="lodging",
    )
    name = models.CharField(max_length=255, blank=True)
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=255, blank=True)
    zip = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=255, blank=True)
    #google's receipt lives on the row - a lodging IS a location, so there is no "no pin" case
    place_id = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    formatted_address = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name or self.formatted_address} (trip {self.trip_id})"
```

**UNDERNEATH.**
- `validate_cost_cents` runs in two places: Django's `Field.run_validators()` during `full_clean()` (which the admin calls), and DRF — `ModelSerializer` copies a model field's `validators` list onto the generated serializer field, so `serializer.is_valid()` runs it too. `%(value)s` is interpolated from `params` by Django when the error is rendered; DRF converts the `ValidationError` into `{"cost_estimate_cents": ["\"-5\" is not a valid cost. ..."]}`. It is a *field* error 400 — a different, real handled error from the geocode-failure 400 (two distinct handled errors for the graded error-handling requirement).
- `ForeignKey("trip_app.Trip")` is a lazy reference resolved when the app registry finishes loading; a direct `from trip_app.models import Trip` at module top would also work today but is the "works-by-accident" form CJs's own ledger flags for `rfqs`.
- `CharField(blank=True)`: `blank` is a validation rule (empty allowed), `null` is a storage rule (SQL NULL allowed). The column is `NOT NULL` with `''` stored — one kind of empty, matching ERD. DRF maps `blank=True` to `required=False`. Never `null=True` on a `CharField`: two kinds of empty.
- `default=""` next to `blank=True` on the six Activity columns is for the migration, not the model: `blank` is what validation allows, `default` is what Django writes into rows that already exist when `0002` adds the column. Without it, `makemigrations` stops to ask for a one-off value. The model behaves identically either way — a `CharField` with no default already saves `''`.
- `DecimalField(max_digits=9, decimal_places=6)` → `NUMERIC(9,6)`: three integer digits cover ±180, six decimals ≈ 11 cm. Values come back as Python `Decimal`, which DRF would render as a string — Step 6 casts to `float`.
- `OneToOneField` is a `ForeignKey` with a `UNIQUE` index. The reverse accessor `activity.geocode` raises `RelatedObjectDoesNotExist` (a subclass of `AttributeError`) when the row is missing, which is exactly why `hasattr(obj, "geocode")` is a clean guard in Step 6.
- `UniqueConstraint` becomes a `UNIQUE` constraint in Postgres named exactly `unique_user_activity_vote`; a violation raises `IntegrityError` inside the transaction. The old name `unique_activity_vote_per_user` (and the old field order) shipped in Cody's `0001`, so Step 3's `0002` carries a `RemoveConstraint` + `AddConstraint` pair — two DDL statements, no data touched.
- `Meta.ordering = ["id"]` appends `ORDER BY id` to every queryset of the model so no view can forget it. CJs's ledger warns that `-created_at` silently inverts `Model.objects.last()`-style test assertions once there are two rows.
- `auto_now_add` sets the value once in `pre_save` on insert; `auto_now` sets it on every `save()` — but only if the field is included when `update_fields` is used (Step 7 handles that).
- `__str__` uses `trip_id` / `user_id` / `activity_id` (the raw FK columns already on the instance) so admin list pages do not issue a query per row.
- `related_name` split follows the relationships course: plural for FKs (`activities`, `votes`, `activity_votes`), singular for the OneToOnes (`geocode`, `lodging`).
- `Lodging.trip` is a `OneToOneField` too — reverse accessor `trip.lodging`, and a second row for the same trip raises `IntegrityError` at the DB. The view never gets there: `update_or_create(trip=trip, ...)` is "replace", not "add". `latitude`/`longitude` are NOT NULL here because a lodging without a pin has no reason to exist — the view answers 400 before writing anything. `__str__` prefers the user's `name` ("Airbnb — Kailua") and falls back to Google's `formatted_address`.

**VERIFY (CONTAINER, or HOST from `backend/tripsync_proj` with `source ../.venv/bin/activate` — `check` needs no database).**

```bash
python manage.py check
```

- Macro: models import, the FK string resolves to `trip_app.Trip`, no system-check errors.
- Micro: `check` loads settings, the app registry and root urls; it does not open a DB connection.
- Expected: `System check identified no issues (0 silenced).` (Verified against this exact intermediate state: the old serializer still names `created_by`/`location`, but a `ModelSerializer` only builds its fields when `.fields` is first accessed (at `is_valid()`/`.data` time) — not at import, not even on instantiation — so `check` stays green. The old `views.py` still imports the old `permissions.py`, which still exists.) The only red `check` in this plan is between Step 7 and Step 8, and it is called out there.

### Step 2b — `DEFAULT_AUTO_FIELD`: skip it

Every table needs an `id` column; Django can make it a plain integer (`AutoField`, ~2 billion rows) or a big integer (`BigAutoField`). The ERD says big integer. **Django 6.1 already picks `BigAutoField` by default** — Cody's migrations show `models.BigAutoField(...)` for every `id` with no setting anywhere, and `manage.py check` raises no warning. CJs's `settings.py` carries an explicit `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"` line because older Django versions nagged for it; on 6.1 it changes nothing. `settings.py` is a shared file — do not touch it for zero effect, and do not add the equivalent `default_auto_field` line to `apps.py` either. `apps.py` stays exactly as it is. Step 3's `makemigrations --check --dry-run` → `No changes detected` is the proof that nothing was needed.

## Step 3 — Migrations (container; Docker must be up)

**MACRO WHY.** `activities_app/0001` already exists and is shipped (Step 0), so `makemigrations` writes a `0002` that is the *difference* between the model Django recorded in `0001` and the model in Step 2: drop `location` and `created_by`, add seven columns, narrow `description`, swap the constraint, change the ordering, create `ActivityGeocode` and `Lodging`. Two of those operations are why Step 2's model carries `default=""` on six columns: `AddField` on a table that already exists has to give every existing row a value, and Django refuses to guess — without a default it stops and asks for a one-off value, and answering that prompt bakes a fake default into the migration (`preserve_default=False`, the pattern in Cody's `trip_app/0002`). A real `default=""` in the model is the honest version: the migration and the model agree, and `--noinput` (what an automated pipeline would run) does not stall. `trip_app` needs nothing from you — its `0001` and `0002` shipped with the merge, and your `0002` depends on the latest of them because `Lodging.trip` points at that table. Green tests never prove migrations exist (the runner builds its own DB from the migration files, so a missing `0002` fails loudly there — but a *wrong* one does not), which is why you read the generated file and inspect the real tables in psql.

**Commands (CONTAINER).**

```bash
python manage.py makemigrations activities_app
cat activities_app/migrations/0002_*.py
python manage.py migrate
python manage.py showmigrations activities_app trip_app group_app
```

**UNDERNEATH.**
- `makemigrations` diffs the current model state against the migration graph and writes the operations. Expect exactly this (the file name is auto-generated from the first few operations — keep it):

```text
Migrations for 'activities_app':
  activities_app/migrations/0002_activitygeocode_lodging_alter_activity_options_and_more.py
    + Create model ActivityGeocode
    + Create model Lodging
    ~ Change Meta options on activity
    ~ Change Meta options on activityvote
    - Remove constraint unique_activity_vote_per_user from model activityvote
    - Remove field created_by from activity
    - Remove field location from activity
    + Add field city to activity
    + Add field cost_estimate_cents to activity
    + Add field country to activity
    + Add field place_id to activity
    + Add field state to activity
    + Add field street to activity
    + Add field zip to activity
    ~ Alter field description on activity
    + Create constraint unique_user_activity_vote on model activityvote
    + Add field activity to activitygeocode
    + Add field trip to lodging
```

- In the file, check five things: `dependencies = [('activities_app', '0001_initial'), ('trip_app', '0002_trip_city_trip_country_trip_state'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]` — it builds on Cody's `0001` and on the *latest* `trip_app` migration, because `Lodging.trip` references that table; every new `id` is `models.BigAutoField(...)` (no settings change needed); each `AddField` for `street/city/state/zip/country/place_id` reads `models.CharField(blank=True, default='', max_length=255)` with NO `preserve_default=False` (the default is real); `RemoveConstraint(... name='unique_activity_vote_per_user')` then `AddConstraint(... fields=('user', 'activity'), name='unique_user_activity_vote')`; and the two `OneToOneField`s (`related_name='geocode'`, `related_name='lodging'`) are added last, after both tables exist. `validators=[activities_app.validators.validate_cost_cents]` is recorded by dotted path — renaming the function later means a new migration.
- `migrate` applies unapplied migrations in dependency order and records each in `django_migrations`. On a database that already has `0001` applied (yours if you ran Cody's branch, every teammate's, and CI's fresh DB gets both in order) only `Applying activities_app.0002_...` prints. Django creates real table names `activities_app_activity`, `activities_app_activitygeocode`, `activities_app_lodging`, `activities_app_activityvote`, `trip_app_trip`, `group_app_group` — the ERD's `activities` / `activity_votes` are logical names; do not add `db_table` to chase the spelling.
- `AddField` with a default on Postgres: Django adds the column with `DEFAULT ''`, fills existing rows, then DROPS the database default — Django keeps defaults in Python, not in the schema. So `\d` shows the new columns as `not null` with no `default` clause. Expected, not a missing step.
- If your dev database was built from your old model some other way and `migrate` complains, the dev DB is disposable: on the HOST, `docker compose down -v && docker compose up -d backend`, then `make backend` and `migrate` again. `-v` drops the `postgres_data` volume.

**VERIFY (HOST).**

```bash
docker compose exec db psql -U tripsync_user -d tripsync_db -c '\d activities_app_activity'
docker compose exec db psql -U tripsync_user -d tripsync_db -c '\d activities_app_activityvote'
docker compose exec db psql -U tripsync_user -d tripsync_db -c '\d activities_app_activitygeocode'
docker compose exec db psql -U tripsync_user -d tripsync_db -c '\d activities_app_lodging'
```

- Macro: the tables have the columns, the FK, the UNIQUE constraint and the NUMERIC columns the models promised — and NOT the columns `0001` created.
- Micro: `psql -c '\d <table>'` describes one table; `-U`/`-d` match `backend/.env`.
- Expected: `activity` shows `street`, `city`, `state`, `zip`, `country`, `place_id` as `character varying(255) not null` (no default clause), `cost_estimate_cents integer not null`, `description character varying(255) not null` — and NO `location` or `created_by_id`; `trip_id bigint not null` with `FOREIGN KEY ... REFERENCES trip_app_trip(id) DEFERRABLE INITIALLY DEFERRED`; `activityvote` shows `"unique_user_activity_vote" UNIQUE CONSTRAINT, btree (user_id, activity_id)` and no `unique_activity_vote_per_user`; `activitygeocode` shows `latitude numeric(9,6)` and a UNIQUE index on `activity_id`; `lodging` shows `trip_id bigint not null` with its own UNIQUE index (the OneToOne), `latitude numeric(9,6)`, and NO nullable columns. (These lines are what Django's Postgres backend emits for these operations; the throwaway run behind this plan used SQLite, so this is the first time they are observed — read them.)

**Then (CONTAINER):**

```bash
python manage.py makemigrations --check --dry-run
```

- Macro: the committed `0002` matches the models exactly (and Step 2b's settings line, if you added it, changed nothing).
- Micro: `--check` exits non-zero if a migration would be generated; `--dry-run` writes nothing.
- Expected: `No changes detected`.

**Rule from here on:** `0002` is yours and unshipped; `0001` is Cody's and shipped. If a model changes again before this branch merges: `python manage.py migrate activities_app 0001` (rolls your `0002` back, leaves Cody's tables), delete `activities_app/migrations/0002_*.py`, regenerate. Never stack a `0003` on an unshipped `0002`, and never touch `0001`.

Commit checkpoint (HOST): `git add backend/tripsync_proj/activities_app backend/.env.example && git commit -m "activities_app: ERD-shaped models, geocode + lodging rows, validators; 0002 on the shipped 0001"`.

## Step 4 — admin.py

**MACRO WHY.** Plain `admin.site.register` is the course's dominant idiom; the one addition CJs makes is a `StackedInline` so the parent's change page shows its OneToOne child. Here that inline is the visible evidence for the graded server-side API: open an activity, see the row Google produced. An inline defined but not listed in `inlines` renders nothing — the two-line `ModelAdmin` is load-bearing. CJs misspells its class `GeocodingResultInLine` and its own audit flags the typo; copy the pattern, spell it `Inline`. The `Lodging` register is plain — one row per trip and no parent form of ours to inline it into (Trip's admin is Cody's file).

### `backend/tripsync_proj/activities_app/admin.py` (replace whole file)

```python
from django.contrib import admin
from .models import Activity, ActivityGeocode, ActivityVote, Lodging


#inline so the activity page shows google's receipt row
class ActivityGeocodeInline(admin.StackedInline):
    model = ActivityGeocode


class ActivityAdmin(admin.ModelAdmin):
    inlines = [ActivityGeocodeInline]


admin.site.register(Activity, ActivityAdmin)
admin.site.register(ActivityGeocode)
admin.site.register(ActivityVote)
admin.site.register(Lodging)
```

**UNDERNEATH.**
- `StackedInline` renders a formset for the related model on the parent's change form; for a OneToOne Django caps it at one form and lets you add the row if missing.
- The admin form is the one write path to `ActivityGeocode` that is NOT Google's answer — that is the feature (fix a bad pin without SQL) and it bypasses geocoding entirely; say so in the PR.
- The separate `register(ActivityGeocode)` matches CJs projects/admin.py:12 and gives a list page for all pins.
- `register(Lodging)` gives the list page for every trip's lodging; same caveat as the inline — an admin edit bypasses geocoding, so a hand-typed latitude is the admin's word, not Google's.

**VERIFY (CONTAINER, then browser).** `createsuperuser` is broken on this repo — `AuthUserManager.create_superuser(self, email, username, ...)` requires `email` positionally but `REQUIRED_FIELDS = []` means the management command never passes it (`TypeError: ... missing 1 required positional argument: 'email'`; verified). Outside this app's scope — flag it to Cody. Create the account through the shell instead:

```bash
python manage.py shell -c "from django.contrib.auth import get_user_model as g; u = g().objects.create_superuser(email='dom@example.com', username='dom', password='a-strong-password-1'); print(u.id, u.is_staff)"
python manage.py shell -c "from trip_app.models import Trip; print(Trip.objects.create(name='Oahu weekend', city='Honolulu', state='HI', country='USA').id)"
```

Then in the browser: `http://localhost:8000/admin/` → log in → Activities → Add → pick the trip, name it, save → the geocode block is at the bottom of the form (empty, because admin saves do not geocode). `Lodgings` appears as its own entry in the sidebar — leave it empty here; Step 10 sets it through the API so Google fills the pin. This row stays in your dev DB and shows up in Step 10's list; Step 10 captures activity ids from the responses instead of guessing them, so which id it took never matters.

- Macro: the models register, the inline is wired, and you have a user + trip for every later step.
- Micro: `shell -c` runs one Python line with Django configured; `create_superuser` is the custom manager's method (`auth_user_app/models.py:16-19`).
- Expected: `1 True`, then `1`; the admin activity form shows a "Activity geocode" section and the sidebar lists Lodgings.

## Step 5 — google_maps.py (the folded-in api_app) and the shell smoke test

**MACRO WHY.** In CJs the geocode call is a plain function in `api_app/views.py` — not a view, nothing routes to it, the `projects` views import and call it as a step inside create. Folding it into `activities_app` keeps that helper-vs-endpoint split; the module is named `google_maps.py` because `views.py` is taken and CJs's own guide marks its file "#not an endpoint". The two-branch shape, the field masks, the `results[0]` parse, `timeout=5` and "failure is a value" are CJs's verbatim. Three deliberate departures — the unstructured manual-entry URL, the loud key lookup, and the wider `except` — are owned one by one in the Flags. The module now holds two callers of the same key: `geocode_address` (Geocoding — lodging PUT, activity POST/PUT) and `search_places` (Places API (New) Text Search — the search endpoint). CJs never had a second Google API; `search_places` copies `geocode_address`'s contract exactly — one request, `timeout=5`, `None` on any failure — so the view code that consumes it reads the same.

**Flags.**
- **[CJs deviation]** unstructured URL for manual entry. CJs hardcodes `address.regionCode = "US"`, and Google's structured `address.*` params REQUIRE a CLDR region code it says is "never inferred" — wrong for a travel app whose frontend sends `country: "United States"` as free text. The manual branch therefore uses Geocoding v4's documented *unstructured* endpoint `GET /v4/geocode/address/{text}` and lets Google parse the line; the response wrapper is identical, so the parse code is CJs's. `regionCode` is sent as a bias only when `country` is exactly two letters.
- **[CJs deviation]** `os.environ["..."]` outside the `try`, plus an explicit empty-string check. CJs reads the key with `os.environ.get(...)` inside the `try`. requests 2.34.2 silently DROPS a header whose value is `None` and KEEPS one whose value is `''` (both verified in the venv: `merge_setting` removes `None` entries only), so a missing key goes out unauthenticated and an empty key goes out as `X-Goog-Api-Key: ` — either way Google answers non-200, the function says `None`, and the user sees "Address could not be geocoded": a deploy bug disguised as a bad address. The empty case is `GOOGLE_MAPS_SERVER_KEY=` straight from `.env.example`, which is where every teammate starts. Here both cases raise a `KeyError` naming the variable — deviating from "never raise" on purpose; every test that reaches the helper patches the variable (Step 9).
- **[CJs deviation]** `TypeError`/`ValueError` join the `except` so a shape surprise (`"location": null`) is a 400, not a 500.
- **[spec deviation]** APIendpoints-revised.md:100-103 shows Geocoding v3 (`maps.googleapis.com/...?key=`); this is v4 with header auth and field masks, which is what CJs does. Step 11 fixes the doc.
- **[breaks at scale]** the call is synchronous inside the request with a 5-second timeout: a slow Google holds a gunicorn worker for up to 5 s. At bootcamp scale irrelevant; at scale it moves to a task queue.
- **[known gap]** an ambiguous entry ("Springfield") resolves to Google's best guess with `granularity: APPROXIMATE` and the pin looks authoritative. Adding `results.granularity` to the mask and surfacing it is the senior-engineer upgrade; not in scope.
- **[beyond CJs ceiling]** `search_places` / `requests.post` / Places API (New). CJs has no place search. The body is JSON (`json=` — requests serializes it and sets `Content-Type`), the field mask is REQUIRED on this API, `pageSize` tops out at 20 and `radius` at 50,000 m — the helper clamps rather than 400s, because those are Google's limits, not the user's mistake.

### `backend/tripsync_proj/activities_app/google_maps.py` (new)

```python
import os
from urllib.parse import quote

import requests

GEOCODE_PLACE_URL = "https://geocode.googleapis.com/v4/geocode/places/{place_id}"
GEOCODE_ADDRESS_URL = "https://geocode.googleapis.com/v4/geocode/address/{address}"
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def _api_key():
    #outside every try on purpose: a missing OR EMPTY key is a deploy bug and must be loud, not a 400
    api_key = os.environ["GOOGLE_MAPS_SERVER_KEY"]
    if not api_key:
        raise KeyError("GOOGLE_MAPS_SERVER_KEY is set but empty - fill it in backend/.env")
    return api_key


#not an endpoint - a step inside lodging PUT and activity create/update; nothing routes here
def geocode_address(street="", city="", state="", zip_code="", country="", place_id=None):
    api_key = _api_key()
    try:
        if place_id:
            #exact lookup - the Places pick identified the place; response is ONE object
            resp = requests.get(
                GEOCODE_PLACE_URL.format(place_id=place_id),
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "location,formattedAddress,placeId",
                },
                timeout=5,
            )
            if resp.status_code != 200:
                return None
            result = resp.json()
        else:
            #manual entry - google parses one free-text line; response is {"results": [...]}
            parts = [part for part in (street, city, state, zip_code, country) if part]
            if not parts:
                return None
            text = ", ".join(parts)
            params = {}
            if len(country) == 2 and country.isalpha():
                #bias only - v4 never hard-filters on region
                params["regionCode"] = country.upper()
            resp = requests.get(
                GEOCODE_ADDRESS_URL.format(address=quote(text, safe="")),
                params=params,
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "results.location,results.formattedAddress,results.placeId",
                },
                timeout=5,
            )
            if resp.status_code != 200:
                return None
            results = resp.json().get("results", [])
            if not results:
                return None
            result = results[0]
        return {
            "latitude": result["location"]["latitude"],
            "longitude": result["location"]["longitude"],
            "formatted_address": result.get("formattedAddress", ""),
            "place_id": result.get("placeId", ""),
        }
    except (requests.RequestException, KeyError, TypeError, ValueError):
        #failure is a value, not a crash - the view turns None into a 400
        return None


#not an endpoint - called by FindActivities; returns a list (maybe empty) or None on failure
def search_places(query, latitude, longitude, radius_m=5000, min_rating=None, max_results=10):
    api_key = _api_key()
    try:
        body = {
            "textQuery": query,
            #google caps a page at 20 - clamp instead of 400ing the user
            "pageSize": max(1, min(int(max_results), 20)),
            #bias, not a fence - a strong match outside the circle can still come back
            "locationBias": {
                "circle": {
                    "center": {"latitude": float(latitude), "longitude": float(longitude)},
                    "radius": max(0.0, min(float(radius_m), 50000.0)),   #metres; google caps at 50 km
                }
            },
        }
        if min_rating is not None:
            body["minRating"] = float(min_rating)   #0.0-5.0 in 0.5 steps; google rounds UP
        resp = requests.post(
            PLACES_SEARCH_URL,
            json=body,
            headers={
                "X-Goog-Api-Key": api_key,
                #REQUIRED on Places (New) - omitting it is an error, not "all fields"
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            return None
        return [
            {
                "place_id": place["id"],
                "name": place.get("displayName", {}).get("text", ""),   #displayName is {text, languageCode}
                "formatted_address": place.get("formattedAddress", ""),
                "latitude": place["location"]["latitude"],
                "longitude": place["location"]["longitude"],
            }
            for place in resp.json().get("places", [])
        ]
    except (requests.RequestException, KeyError, TypeError, ValueError):
        #failure is a value, not a crash - the view turns None into a 502
        return None
```

**UNDERNEATH.**
- `import requests` + `requests.get(...)` at call time is what makes `@patch("requests.get")` work in tests. `from requests import get` would bind a local name the patch never touches.
- `place_id` truthy → branch A. The frontend sends `""` for a manual entry; `""` is falsy, so it falls through to branch B with nothing else to do (same contract as CJs's `google_place_id`).
- Branch B builds `parts` from the non-empty values only. CJs sends `address.postalCode=""` when blank, which can trip Google's cross-component validation; here empties are omitted. `if not parts: return None` means the caller can call it unconditionally, but Step 7 avoids even that call when there is no location.
- `quote(text, safe="")` percent-encodes EVERYTHING including `/`: an unencoded `/` in "Apt 3/4" would become a new URL path segment and 404. `requests` leaves existing `%XX` sequences alone. Verified output: `Paris, France` → `Paris%2C%20France`.
- `params={"regionCode": "US"}` → `?regionCode=US`. It is a bias in v4 (the v3 `components=country:XX` hard filter is gone). With an empty dict, `requests` appends nothing.
- `X-Goog-FieldMask` is optional on Geocoding v4 (all fields return by default) — sent anyway for latency and because it is required on the Places API, so the habit is right. The place-branch mask has no `results.` prefix because that response is one bare `GeocodeResult`; the address-branch response is `{"results": [...]}`.
- `timeout=5` is both connect and read timeout. Without it a hung Google call spins forever with no error.
- Return keys equal the `ActivityGeocode` field names plus `place_id`, so the view can `geo.pop("place_id")` then `ActivityGeocode.objects.create(activity=..., **geo)`. `latitude`/`longitude` arrive as JSON floats; Django's `DecimalField` converts on save.
- `placeId` is the bare id; v4 also returns `place: "//places.googleapis.com/places/ChIJ..."` (a resource name) — never read that one.
- `except` covers: non-JSON body (`requests.JSONDecodeError` is a `RequestException` since 2.27 — verified), timeouts/DNS/SSL (`RequestException`), missing `location` (`KeyError`), `null` location (`TypeError`), and bad numbers (`ValueError`). Not covered by design: the env `KeyError`, which is raised before `try`.
- The env lookup treats `''` the same as absent. python-dotenv and compose `env_file` both load `GOOGLE_MAPS_SERVER_KEY=` as the empty string; `os.environ[...]` returns `''` without raising; requests would send the empty header and Google would say 403. The second `raise KeyError(...)` carries a message naming the file to fix, so the traceback is the diagnosis.
- `_api_key()` is the one shared line between the two helpers — the env check moved into a function so two callers cannot drift (CJs had one caller, so it inlined it). It runs before either `try`, which is what keeps the `KeyError` loud.
- `search_places` sends `json=body`: requests serializes the dict and sets `Content-Type: application/json`; Google rejects a form-encoded body. `float(latitude)` because the caller hands over the `Lodging` row's `Decimal`s and `json` cannot serialize `Decimal`. `pageSize` (not the deprecated `maxResultCount`) is clamped to 1–20 and `radius` to 0–50,000 m — Google's hard limits. `minRating` is only added when asked for: Google rejects `null`. `locationBias` is a bias, not a fence — a strong match outside the circle can still come back; `locationRestriction` is the fence, and a fence around an Airbnb hides the restaurant two blocks past it.
- The Places response is `{"places": [...]}` where `displayName` is an object `{text, languageCode}` — hence `.get("displayName", {}).get("text", "")`. The field mask names exactly the four keys the parse reads; asking for `places.rating` or `places.priceLevel` moves the call from the Text Search *Pro* SKU to *Enterprise* — do not add mask fields the UI does not show.
- `search_places`'s `except` additionally catches a malformed hit (`"location": null` → `TypeError`), so one bad place in a list of ten is a `502`, not a 500.

**VERIFY (CONTAINER).**

```bash
python manage.py shell -c "from activities_app.google_maps import geocode_address as g; print(g(street='933 Kapahulu Ave', city='Honolulu', state='HI', zip_code='96816', country='US')); print(g(city='Paris', country='France')); print(g(place_id='not-a-real-id')); print(g())"
python manage.py shell -c "from activities_app.google_maps import search_places as sp; print(sp('pizza', latitude=21.275, longitude=-157.825, radius_m=3000, max_results=3))"
python -c "import os; os.environ.pop('GOOGLE_MAPS_SERVER_KEY', None); from activities_app.google_maps import geocode_address; geocode_address(city='Honolulu')"
GOOGLE_MAPS_SERVER_KEY= python -c "from activities_app.google_maps import geocode_address; geocode_address(city='Honolulu')"
```

- Macro: the live key works through the Python path (both Geocoding branches and the Places search), failure is a value, and a missing OR empty key is loud.
- Micro: the first two commands use `manage.py shell` so `load_dotenv`/compose env is present; the third uses bare `python` (the module needs no Django) and pops the variable before the call; the fourth sets the variable to the empty string for that one process only (`VAR= command` is shell syntax for a per-command environment) — the `.env.example` state.
- Expected, first command: line 1 a dict with numeric `latitude`/`longitude`, a `formatted_address`, and a non-empty `place_id`; line 2 a dict for Paris (city centroid); line 3 `None` (bad place id → non-200); line 4 `None` (nothing to geocode, no call made). Second command: a list of three dicts, each with `place_id`, `name`, `formatted_address` and numeric `latitude`/`longitude`, all within a few km of Waikiki — this is the first time `requests.post` runs for real; `None` here means Places API (New) is not enabled on the key. Third command: `KeyError: 'GOOGLE_MAPS_SERVER_KEY'` traceback; fourth: `KeyError: 'GOOGLE_MAPS_SERVER_KEY is set but empty - fill it in backend/.env'`.

## Step 6 — serializers.py

**MACRO WHY.** CJs's serializer is a `ModelSerializer` with an explicit `fields` allowlist, `read_only_fields` for everything the server sets, and a `SerializerMethodField` + `hasattr` guard for anything living on the optional OneToOne. The current `ReadOnlyField()` and `PrimaryKeyRelatedField(read_only=True)` declarations are not CJs idioms and go. The three coordinate getters cast `Decimal → float` because DRF renders `DecimalField` as a string and the map component checks `Number.isFinite(lat)` — a string would silently fall through to a per-pin Places lookup. CJs's `round(..., 2)` is a public-map privacy rule; do NOT copy it for member-only pins. `has_voted` stays (the merged frontend reads it; the spec's `my_vote` is corrected in Step 11). `LodgingSerializer` is the same shape with two differences worth saying out loud: no `hasattr` guard (the pin is on the row and always present), and `trip` is read-only because it arrives in the URL (`lodging/<trip_id>/`), never in the body — the frontend cannot re-point a lodging at another trip.

**Flags.**
- **[breaks at scale]** `vote_count` and `has_voted` cost two queries per activity on the list — 2N+3 with the JWT user lookup, the trip lookup and the activities⋈geocode SELECT (20 activities ≈ 43 queries; Step 7 shows the ledger). Fine at trip scale; the `annotate` upgrade is in the at-scale box, and `annotate`/`Exists` are beyond CJs (CJs only uses `select_related`).
- **[CJs deviation]** `trip` stays writable (rfqs pattern: parent id in the body); Step 7 refuses a CHANGED trip on PUT.

### `backend/tripsync_proj/activities_app/serializers.py` (replace whole file)

```python
from rest_framework import serializers
from .models import Activity, Lodging


class ActivitySerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    formatted_address = serializers.SerializerMethodField()
    vote_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            "id",
            "trip",
            "name",
            "description",
            "street",
            "city",
            "state",
            "zip",
            "country",
            "place_id",
            "cost_estimate_cents",
            "latitude",
            "longitude",
            "formatted_address",
            "vote_count",
            "has_voted",
            "created_at",
            "updated_at",
        ]
        #google owns place_id; the clock owns the timestamps
        read_only_fields = ["place_id", "created_at", "updated_at"]

    #hasattr guard - no geocode row (no location) -> null, never a crash
    def get_latitude(self, obj):
        if hasattr(obj, "geocode"):
            return float(obj.geocode.latitude)
        return None

    def get_longitude(self, obj):
        if hasattr(obj, "geocode"):
            return float(obj.geocode.longitude)
        return None

    def get_formatted_address(self, obj):
        if hasattr(obj, "geocode"):
            return obj.geocode.formatted_address
        return None

    #N+1 - two queries per activity on the list; fine at trip scale, annotate is the fix
    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_has_voted(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()


class LodgingSerializer(serializers.ModelSerializer):
    #no hasattr guard - a lodging row always has its pin; the cast is for the map (Decimal renders as a string)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Lodging
        fields = [
            "id",
            "trip",
            "name",
            "street",
            "city",
            "state",
            "zip",
            "country",
            "place_id",
            "latitude",
            "longitude",
            "formatted_address",
            "created_at",
            "updated_at",
        ]
        #trip comes from the URL; google owns the pin fields; the clock owns the timestamps
        read_only_fields = ["trip", "place_id", "formatted_address", "created_at", "updated_at"]

    def get_latitude(self, obj):
        return float(obj.latitude)

    def get_longitude(self, obj):
        return float(obj.longitude)
```

**UNDERNEATH.**
- `ModelSerializer` inspects `Activity._meta` and builds one serializer field per model field in `fields`. `trip` becomes `PrimaryKeyRelatedField(queryset=Trip.objects.all())`: on input it looks the id up and yields a `Trip` instance in `validated_data`, or the error `Invalid pk "999" - object does not exist.` → that is your 400 for an unknown trip, no view code needed.
- `read_only_fields` is Meta shorthand for `read_only=True`: those keys are ignored on input. `place_id` in the POST body therefore never reaches `validated_data` — the view reads it from `request.data` (Step 7). `id` and the two `auto_now*` timestamps are read-only automatically; listing the timestamps is explicit, not required.
- A `SerializerMethodField` is read-only by definition, so `latitude` in a PUT body is silently ignored — "Google owns that value, not the client."
- `hasattr` on a reverse OneToOne runs one query (or reads the `select_related` cache) and returns `False` on `RelatedObjectDoesNotExist`. With `select_related("geocode")` and no row, Django caches `None` and `hasattr` is still `False` — no query.
- `self.context.get("request")`: `APIView` does NOT inject the request into serializer context; `GenericAPIView.get_serializer()` does it for you, which is why the old generics view worked with `has_voted` (its `get_serializer_context` override re-set the same value — redundant, not needed). With plain `APIView`, every serializer call in Step 7 passes `context={"request": request}` explicitly; forget it and `has_voted` is always `False` with no error.
- `LodgingSerializer(data=request.data)` with no instance is used for VALIDATION only in Step 7 — the write goes through `update_or_create`, not `serializer.save()`, so a PUT that omits `country` blanks it instead of keeping last month's value. That is what "replace" means; a merge would leave old address text under a new pin. `LodgingSerializer(lodging)` (instance, no data) is the output path.

**VERIFY (CONTAINER).**

```bash
python manage.py check
python manage.py shell -c "from activities_app.serializers import ActivitySerializer, LodgingSerializer; print(list(ActivitySerializer().fields)); print(list(LodgingSerializer().fields))"
```

- Macro: the serializer builds against the new model — every name in `Meta.fields` resolves to a model field or a declared method field.
- Micro: accessing `.fields` (which `list(...)` does) is what triggers `ModelSerializer`'s field build — it is a lazy `cached_property`, so an `ImproperlyConfigured` here means a typo in `fields`; bare instantiation would not catch it and `check` would not either.
- Expected: `System check identified no issues (0 silenced).` then the 18 `ActivitySerializer` field names in the order listed above, then the 14 `LodgingSerializer` names. (Verified: `check` is green in this intermediate state because the old `views.py` still imports the still-present `permissions.py`.)

## Step 7 — views.py, and delete permissions.py in the same commit

**MACRO WHY.** Every view becomes an `APIView` subclass with one explicit method per HTTP verb, the way every CJs view is — "every line in the request path is one I wrote and can explain." The base class `ActivityView` holds only `permission_classes = [IsAuthenticated]`; `settings.py` sets NO `DEFAULT_PERMISSION_CLASSES`, so DRF's default is `AllowAny` and any view that forgets the base class is public, silently (Cody's merged views all carry it explicitly — the same habit, one class at a time, is the cost of not setting the project default). Authentication is inherited from `DEFAULT_AUTHENTICATION_CLASSES` (`CookieJWTAuthentication`) exactly as CJs inherits its cookie authenticator — no `authentication_classes` on views. Who may do WHAT is decided in the method body (scoped lookups, explicit 400/403), never in a hand-written permission class. The create and update flows are CJs's — validate → ask Google → open the transaction → write both rows → 201; on edit re-geocode only when the location changed and keep the old pin if Google fails — plus two rules CJs never needed, owned in the Flags. Two views are new to the plan: `ALodging` (set / replace / delete where the group stays — the map's center) and `FindActivities` (Places Text Search around that center). Same base class, same helper-vs-endpoint split, same "ask Google first, write second" order.

**Flags.**
- **[same commit]** `permissions.py` is deleted in the SAME commit as this file because `views.py:7` imports it today — an intermediate state where the import exists but the file does not kills every `manage.py` command.
- **[CJs deviation]** blanking every location field on PUT drops the pin, and a Google failure on PUT keeps the old pin. CJs's address is required (`projects/models.py:22-28`), so it never faces the first case; the second is CJs's own rule (`projects/views.py:69`).
- **[beyond CJs ceiling, removed]** `generics.ListCreateAPIView` / `DestroyAPIView` are gone.
- **[spec deviation]** list is `GET /api/v1/activities/?trip=<id>` (CJs `request.query_params` idiom, projects/views.py:98-100) instead of the proposed nested `GET /api/trips/<tid>/activities/`. The nested route would live in `trip_app/urls.py`, which is Cody's file and unmounted even on his branch. Step 11 amends the spec; Step 12 hands the two path edits to the frontend.
- **[beyond CJs ceiling]** `409 Conflict` on a duplicate vote (spec line 86; `s.HTTP_409_CONFLICT` exists in DRF 3.18). CJs's vocabulary tops out at 404; its duplicate precedent is a serializer 400. One owned deviation.
- **[CJs deviation]** `def patch(self, request, id): return self.put(request, id)` — the merged frontend calls `api.patch(...)`; DRF dispatches on `request.method.lower()`, so an `APIView` with only `put` answers PATCH with 405. CJs's `put` is already `partial=True`, which IS patch semantics; the alias is honest HTTP for two lines.
- **[CJs deviation]** the `#helper` sits on the base class instead of the detail class because two views share one model here.
- **[CJs deviation]** `put` re-reads the row before responding. Because `retrieve_activity` uses `select_related("geocode")`, the instance arrives with its `geocode` cache already filled (the old row, or `None`); `update_or_create` on an existing row and `.filter().delete()` change the database but not that cache, so serializing the in-memory instance would return the OLD pin (verified: `1.0` back from the cached instance after the row was updated to `9.0`). CJs does not need this because its helper is a bare `get_object_or_404(Project, ...)` with no `select_related` — its serializer's first `hasattr` runs a fresh query (verified: fresh value). This is a consequence of deviation #19, not a CJs bug. Re-reading through the helper costs one query and is always right; `activity.geocode.refresh_from_db()` only works when a row already existed.
- **[CJs deviation]** `activity.save(update_fields=["place_id", "updated_at"])` — with `update_fields`, `auto_now` only writes if the field is listed.
- **[ERD/README gap, stated]** Phase 1 has NO membership scoping: any logged-in user can read, edit, delete and vote on any activity by id. Known gap, not a design; Phase 2 is in "Dependencies outside this app".
- **[verified, not a gap]** two simultaneous vote POSTs from one user can both pass `get_or_create`'s SELECT, but `QuerySet.get_or_create` wraps its INSERT in `transaction.atomic`, catches the `IntegrityError` from the unique constraint and re-runs `get()`, returning `(obj, False)` — so the loser lands in the `created=False` branch and gets the 409, not a 500. The DB unique constraint is the backstop README:169 asks for; the button is disabled while busy in the UI.
- **[CJs deviation]** lodging `PUT` is *replace*, not partial: it always re-geocodes and answers `201` on first set, `200` on replace (`update_or_create` tells you which). CJs's PUT is partial because a project has many editable fields; a lodging is one location, and "change the address but keep the old pin" is exactly the stale-pin bug CJs warns about.
- **[beyond CJs ceiling]** `FindActivities` and its `502` — CJs never proxied a search. `502 Bad Gateway` is the honest code for "Google failed"; a `400` would tell the user they did something wrong.
- **[stated rule]** no lodging → no search (`400 Set where the group is staying first`). The search has to be centered somewhere and the lodging is the product's answer; accepting arbitrary `lat`/`lng` from the browser is a two-line addition if the team wants it.

### `backend/tripsync_proj/activities_app/views.py` (replace whole file)

```python
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as s
from rest_framework.permissions import IsAuthenticated

from trip_app.models import Trip
from .google_maps import geocode_address, search_places
from .models import Activity, ActivityGeocode, ActivityVote, Lodging
from .serializers import ActivitySerializer, LodgingSerializer

LOCATION_FIELDS = ["street", "city", "state", "zip", "country"]


class ActivityView(APIView):
    permission_classes = [IsAuthenticated]

    #helper - any activity by id for now (unknown ids answer 404)
    #TODO scope by trip__group__auth_user=request.user (group_app.Group M2M) - team decision, see Dependencies
    def retrieve_activity(self, request, id):
        return get_object_or_404(Activity.objects.select_related("geocode"), id=id)


class AllActivities(ActivityView):
    #endpoint: GET /api/v1/activities/?trip=<id>
    def get(self, request):
        trip_id = request.query_params.get("trip")
        if not trip_id or not trip_id.isdecimal():
            return Response(
                {"error": "trip query param is required"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        trip = get_object_or_404(Trip, id=trip_id)
        #select_related joins the geocode row in ONE query
        activities = Activity.objects.select_related("geocode").filter(trip=trip)
        serializer = ActivitySerializer(activities, many=True, context={"request": request})
        return Response(serializer.data)

    #endpoint: POST /api/v1/activities/
    def post(self, request):
        serializer = ActivitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        #place_id rides in the body but is not a writable field ('' from a manual entry is falsy)
        place_id = request.data.get("place_id")
        has_location = bool(place_id) or any(data.get(field) for field in LOCATION_FIELDS)
        geo = None
        if has_location:
            #ask google BEFORE opening the transaction - never hold a DB connection on a network call
            geo = geocode_address(
                street=data.get("street", ""),
                city=data.get("city", ""),
                state=data.get("state", ""),
                zip_code=data.get("zip", ""),
                country=data.get("country", ""),
                place_id=place_id,
            )
            if not geo:
                return Response(
                    {"error": "Address could not be geocoded"},
                    status=s.HTTP_400_BAD_REQUEST,
                )
        #two rows, one request - all or nothing
        with transaction.atomic():
            #trip from the body, pin from google, never lat/lng from the client
            activity = serializer.save(place_id=geo.pop("place_id") if geo else "")
            if geo:
                ActivityGeocode.objects.create(activity=activity, **geo)
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_201_CREATED,
        )


class AnActivity(ActivityView):
    #endpoint: GET /api/v1/activities/<id>/
    def get(self, request, id):
        activity = self.retrieve_activity(request, id)
        serializer = ActivitySerializer(activity, context={"request": request})
        return Response(serializer.data)

    #endpoint: PUT /api/v1/activities/<id>/  (partial - one field is enough)
    def put(self, request, id):
        activity = self.retrieve_activity(request, id)
        serializer = ActivitySerializer(activity, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        #an activity belongs to its trip from birth - no re-parenting
        if "trip" in data and data["trip"] != activity.trip:
            return Response(
                {"error": "trip cannot be changed"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        location_changed = (
            any(field in data for field in LOCATION_FIELDS) or "place_id" in request.data
        )
        activity = serializer.save()
        if location_changed:
            place_id = request.data.get("place_id")
            has_location = bool(place_id) or any(
                getattr(activity, field) for field in LOCATION_FIELDS
            )
            if has_location:
                #location changed -> re-geocode; if google fails we keep the old pin
                geo = geocode_address(
                    street=activity.street,
                    city=activity.city,
                    state=activity.state,
                    zip_code=activity.zip,
                    country=activity.country,
                    place_id=place_id,
                )
                if geo:
                    activity.place_id = geo.pop("place_id")
                    activity.save(update_fields=["place_id", "updated_at"])
                    ActivityGeocode.objects.update_or_create(
                        activity=activity, defaults=geo
                    )
            else:
                #every location field blanked -> drop the pin so the map never shows a stale one
                ActivityGeocode.objects.filter(activity=activity).delete()
                activity.place_id = ""
                activity.save(update_fields=["place_id", "updated_at"])
        #re-read so the response carries the pin as the DB has it, not a cached copy
        activity = self.retrieve_activity(request, id)
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_200_OK,
        )

    #the frontend edits with PATCH; put is already partial, so PATCH is the same contract
    def patch(self, request, id):
        return self.put(request, id)

    #endpoint: DELETE /api/v1/activities/<id>/
    def delete(self, request, id):
        activity = self.retrieve_activity(request, id)
        activity.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class AnActivityVote(ActivityView):
    #endpoint: POST /api/v1/activities/<id>/vote/
    def post(self, request, id):
        activity = self.retrieve_activity(request, id)
        vote, created = ActivityVote.objects.get_or_create(
            activity=activity, user=request.user
        )
        if not created:
            return Response(
                {"error": "You already voted for this activity."},
                status=s.HTTP_409_CONFLICT,
            )
        #201 carries the fresh activity so the client replaces its local vote arithmetic
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_201_CREATED,
        )

    #endpoint: DELETE /api/v1/activities/<id>/vote/
    def delete(self, request, id):
        activity = self.retrieve_activity(request, id)
        #scoped lookup - no vote of yours here answers 404
        vote = get_object_or_404(ActivityVote, activity=activity, user=request.user)
        vote.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class ALodging(ActivityView):
    #endpoint: GET /api/v1/activities/lodging/<trip_id>/  (404 = not set yet; the frontend shows the form)
    def get(self, request, trip_id):
        lodging = get_object_or_404(Lodging, trip_id=trip_id)
        return Response(LodgingSerializer(lodging).data)

    #endpoint: PUT /api/v1/activities/lodging/<trip_id>/  (set or replace - always re-geocodes)
    def put(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        serializer = LodgingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        place_id = request.data.get("place_id")
        if not (place_id or any(data.get(field) for field in LOCATION_FIELDS)):
            return Response(
                {"error": "Provide a place_id or an address"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        #ask google BEFORE any write - a lodging without a pin is useless, so failure is a 400 and no row
        geo = geocode_address(
            street=data.get("street", ""),
            city=data.get("city", ""),
            state=data.get("state", ""),
            zip_code=data.get("zip", ""),
            country=data.get("country", ""),
            place_id=place_id,
        )
        if not geo:
            return Response(
                {"error": "Address could not be geocoded"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        #one row per trip - replace means every field, so an address field not sent goes back to ''
        fields = {"name": data.get("name", "")}
        fields.update({field: data.get(field, "") for field in LOCATION_FIELDS})
        fields.update(geo)
        lodging, created = Lodging.objects.update_or_create(trip=trip, defaults=fields)
        return Response(
            LodgingSerializer(lodging).data,
            status=s.HTTP_201_CREATED if created else s.HTTP_200_OK,
        )

    #endpoint: DELETE /api/v1/activities/lodging/<trip_id>/
    def delete(self, request, trip_id):
        lodging = get_object_or_404(Lodging, trip_id=trip_id)
        lodging.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class FindActivities(ActivityView):
    #endpoint: GET /api/v1/activities/search/?trip=<id>&query=<text>[&radius_m=5000][&min_rating=4][&max_results=10]
    def get(self, request):
        trip_id = request.query_params.get("trip")
        query = request.query_params.get("query", "").strip()
        if not trip_id or not trip_id.isdecimal() or not query:
            return Response(
                {"error": "trip and query params are required"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        trip = get_object_or_404(Trip, id=trip_id)
        #the lodging is the center of the search - no lodging, no search
        lodging = Lodging.objects.filter(trip=trip).first()
        if lodging is None:
            return Response(
                {"error": "Set where the group is staying first"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        try:
            radius_m = float(request.query_params.get("radius_m", 5000))
            max_results = int(request.query_params.get("max_results", 10))
            min_rating = request.query_params.get("min_rating")
            min_rating = float(min_rating) if min_rating else None
        except ValueError:
            return Response(
                {"error": "radius_m, min_rating and max_results must be numbers"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        places = search_places(
            query,
            latitude=lodging.latitude,
            longitude=lodging.longitude,
            radius_m=radius_m,
            min_rating=min_rating,
            max_results=max_results,
        )
        if places is None:
            #upstream failed - 502 says "google, not you"; CJs's 400 vocabulary would blame the client
            return Response({"error": "Place search failed"}, status=s.HTTP_502_BAD_GATEWAY)
        return Response(places)
```

**Delete the permission class (HOST, same commit as views.py):**

```bash
git rm backend/tripsync_proj/activities_app/permissions.py
```

**UNDERNEATH.**
- Request path through DRF for every method: `APIView.dispatch` → `initial()` runs authentication (`CookieJWTAuthentication`: reads the `access_token` cookie, returns `None` if absent, otherwise validates the JWT — one SELECT for the user row — and runs Django's `CsrfViewMiddleware.process_view`, which returns early for GET/HEAD/OPTIONS/TRACE, so only writes need `X-CSRFToken`), then permissions (`IsAuthenticated` → 401 with no user), then throttling (`AnonRateThrottle` 10/min, `UserRateThrottle` 30/min through Redis), then `getattr(self, request.method.lower())`. A method that does not exist → 405. That is why `patch` must be defined.
- `get_object_or_404(<queryset>, id=id)` accepts a `QuerySet`, not just a model — so the helper keeps `select_related("geocode")` and the detail GET costs one query for the pin. A stranger with a valid token and a bad id gets 404, never a 500 from a bare `.get()`.
- Exceptions → responses. `get_object_or_404` raises `django.http.Http404`. DRF's `exception_handler` (rest_framework/views.py) converts exactly three families: `Http404` → `NotFound` → `404 {"detail": "Not found."}`; Django's `PermissionDenied` (what `enforce_csrf` raises) → 403; any `APIException` (`NotAuthenticated` 401, `Throttled` 429, `ValidationError` 400) → its own status. For anything else — `Activity.DoesNotExist` from a bare `.get()`, `ValueError` from `int("abc")`, the `KeyError` from a missing Google key — the handler returns `None`, DRF re-raises, and the client gets a 500. Rule: the only exceptions allowed to escape a view body are ones DRF knows the status code for; that is why every lookup is `get_object_or_404` and why the query param is guarded before it reaches the ORM.
- `request.query_params` is Django's `request.GET` (`QueryDict` of strings). `<int:id>` in a path converts and guards for free; a query param does not, so `isdecimal()` — not `isdigit()`, which also accepts superscripts like `"²"` that `int()` rejects (verified) — guards `get_object_or_404(Trip, id=...)` from a `ValueError` 500.
- When SQL runs. A `QuerySet` is lazy: `Activity.objects.select_related("geocode").filter(trip=trip)` sends nothing; the single JOINed SELECT fires when `serializer.data` iterates it. `get_object_or_404` calls `.get()` and runs immediately. `serializer.is_valid()` runs one SELECT on `trip_app_trip` for the `trip` pk. `.count()` and `.exists()` in the serializer run immediately, every time they are called — that is the per-row cost. Ledger for the list GET: 1 (cookie JWT → user row) + 1 (trip) + 1 (activities ⋈ geocode) + 2N (votes) = 2N + 3; the `annotate` version in the at-scale box brings it to 3.
- `request.data` is the parsed JSON body. `place_id` is read from it directly, exactly as CJs reads `google_place_id` (projects/views.py:32); `ModelSerializer` ignores it because it is read-only. If it were writable, `serializer.save()` on PUT would persist a client string even when Google then failed and the old pin was kept — two rows disagreeing.
- `serializer.save(place_id=...)`: `ModelSerializer.save(**kwargs)` merges kwargs into `validated_data` before `create()` — the same mechanism CJs uses for `save(user=request.user)`. `geo.pop("place_id")` removes the key so `**geo` matches `ActivityGeocode`'s fields exactly.
- `transaction.atomic()` emits `BEGIN` on entry and `COMMIT` on clean exit, `ROLLBACK` if anything raises inside. The only statement that can fail inside this block is the `ActivityGeocode` INSERT (a bad Decimal, a dropped connection); atomic guarantees the Activity INSERT goes with it — Step 9's `test_07` forces exactly that. It cannot un-call Google — irrelevant, the call is read-only, which is one more reason it sits outside the block; the other is that a network call inside a transaction holds a Postgres connection for up to five seconds. Inside `APITestCase`, which already wraps each test in a transaction, the same block becomes `SAVEPOINT ... ROLLBACK TO SAVEPOINT` — identical guarantee, and why `test_07` can assert the count afterwards.
- `ActivityGeocode.objects.create(activity=activity, ...)` also sets the reverse cache on `activity`, so the 201 response's `hasattr(obj, "geocode")` is true without another query.
- PUT: `partial=True` makes every field optional; `validated_data` contains only keys the client sent, so `any(field in data ...)` is "did the client touch a location field", computed before `save()` (after, you cannot tell). `"place_id" in request.data` covers a Places re-pick with the same typed address.
- `data["trip"] != activity.trip` compares model instances by pk. Forbidding a change closes the re-parenting hole CJs's rfqs `put` re-checks ownership for — two lines instead of a membership check that cannot be written yet.
- `update_or_create(activity=activity, defaults=geo)` runs `select_for_update().get()` inside its own atomic block, updates the row if it exists, else creates it — "one behaviour further" than the course's `get_or_create`.
- `activity.delete()` collects the cascade (`ActivityGeocode`, `ActivityVote` rows) and deletes children first, then the parent. `Response(None, status=204)` sends an empty body.
- `get_or_create` returns `(instance, created)`; `created=False` is the duplicate. The 201 body is the re-serialized activity (fresh `vote_count`/`has_voted` via two new queries) so the client can stop doing `vote_count ± 1` locally.
- `ALodging.get` / `.delete` look the row up by `trip_id=` in ONE query — an unknown trip and a trip with no lodging are both 404, and for the frontend both mean "show the form". `put` looks the `Trip` up first because it must exist to hang a row on; then the serializer validates the address text, the view checks there is something to geocode, Google answers, and only then `update_or_create(trip=trip, defaults=fields)` — one `SELECT`, then `UPDATE` or `INSERT`, inside its own atomic block. `defaults` is built from `data.get(field, "")`, so an omitted field becomes `''` — replace semantics without a `DELETE`+`INSERT`. The `created` flag decides `201` vs `200`. `geo` carries `place_id` and the geocode helper's keys are the model's field names, so `fields.update(geo)` needs no renaming.
- `FindActivities` parses three numbers from `query_params` inside one `try` — a `ValueError` from `float("far")` is the 400, exactly the guard the `?trip=` param gets from `isdecimal()`. `lodging.latitude` is a `Decimal`; `search_places` casts it. The response is the helper's list verbatim — no serializer, because nothing here is a model; each hit's `place_id` is what the frontend POSTs back to create the activity. The `Trip` lookup and the `Lodging` lookup are separate on purpose: unknown trip → 404, known trip with no lodging → 400 with a message the UI can act on.

**VERIFY (CONTAINER).**

```bash
python manage.py check
```

- Macro: the whole import chain (root urls → activities urls → views → serializers → models → google_maps) loads.
- Micro: `check` imports root urls → `activities_app.urls` → `views` → `serializers` → `models` → `google_maps`; the red line names the first missing symbol in the OLD `urls.py` import (`ActivityDeleteView` is first on that line).
- Expected RIGHT NOW: **red** — `ImportError: cannot import name 'ActivityDeleteView' from 'activities_app.views'` (verified in this exact state). The OLD `urls.py` still imports the three view names you just removed. This is the one red `check` in the plan; Step 8 replaces `urls.py` and it goes green. Do Steps 7 and 8 in one sitting and commit them together — a `urls.py` that imports missing names kills every `manage.py` command, the same failure CJs's guide records for an `include()` of a module that does not exist yet.

## Step 8 — urls.py and the root mount

**MACRO WHY.** CJs mounts every app at `api/v1/<plural>/` in the root and starts each app's `urls.py` at `''`; route names are snake_case `all_x` / `a_x` with no `app_name`, because names feed `reverse()` in tests and the repo's own tests already reverse un-namespaced names (`'signup'`, `'login'`). The current `app_name = "activities_app"` with kebab-case names is the outlier in this repo, not just versus CJs. The kwarg is literally `id` because it must match the view method signatures. `api/v1/users/`, `api/v1/trips/` and `api/v1/groups/` are already mounted this way; `api/v1/activities/` completes the set and vacates the bare `api/` mount. Both proxies forward `/api/` (nginx `location /api/`, Vite `'/api'`), so `/api/v1/activities/` reaches Django in dev and prod.

**Flags.**
- **[spec deviation]** root prefix `api/v1/activities/` vs the spec's unversioned `/api/...`; the frontend's `utilities.js` baseURL must change anyway (Step 12).
- Cody's `trip_app/urls.py` uses a verb route (`create/`) where CJs would POST to the collection. His file, his call — noted so you do not copy it.

### `backend/tripsync_proj/activities_app/urls.py` (replace whole file)

```python
from django.urls import path
from .views import ALodging, AllActivities, AnActivity, AnActivityVote, FindActivities

urlpatterns = [
    path("", AllActivities.as_view(), name="all_activities"),
    #static routes ABOVE '<int:id>/' - patterns are tried top to bottom
    path("search/", FindActivities.as_view(), name="find_activities"),
    path("lodging/<int:trip_id>/", ALodging.as_view(), name="a_lodging"),
    path("<int:id>/", AnActivity.as_view(), name="an_activity"),
    path("<int:id>/vote/", AnActivityVote.as_view(), name="activity_vote"),
]
```

### `backend/tripsync_proj/tripsync_proj/urls.py` — one-line edit

```diff
 urlpatterns = [
     path('admin/', admin.site.urls),
     path('api/v1/users/', include("auth_user_app.urls")),
     path('api/v1/trips/', include("trip_app.urls")),
     path('api/v1/groups/', include("group_app.urls")),
-    path('api/', include('activities_app.urls')),
+    path('api/v1/activities/', include('activities_app.urls')),
 ]
```

**UNDERNEATH.**
- `include()` prepends the mount prefix to every pattern in the app; `''` + `api/v1/activities/` = the collection. `<int:id>` matches digits only and passes `id=<int>` as a kwarg to `get/put/patch/delete(self, request, id)`.
- Patterns are tried top to bottom. `search/` and `lodging/<int:trip_id>/` sit ABOVE `<int:id>/` — `<int:id>` only matches digits, so today nothing could collide, but the order is the habit that saves you the day someone adds a `<slug:...>` route. `lodging/<int:trip_id>/` passes `trip_id=<int>` to `ALodging`'s methods; the kwarg name must match the signature exactly, same as `id`.
- Effective routes: `GET/POST /api/v1/activities/`, `GET /api/v1/activities/search/`, `GET/PUT/DELETE /api/v1/activities/lodging/<trip_id>/`, `GET/PUT/PATCH/DELETE /api/v1/activities/<id>/`, `POST/DELETE /api/v1/activities/<id>/vote/`.

**VERIFY (CONTAINER).**

```bash
python manage.py check
python manage.py shell -c "from django.urls import reverse; print(reverse('all_activities'), reverse('find_activities'), reverse('a_lodging', args=[1]), reverse('an_activity', args=[1]), reverse('activity_vote', args=[1]))"
python manage.py makemigrations --check --dry-run
```

- Macro: the import chain is finally green, the five names resolve to the intended paths, and the committed 0001 files still match the models exactly.
- Micro: `reverse(name, args=[...])` fills the `<int:...>` converter; `--check` exits non-zero if a migration would be generated, `--dry-run` writes nothing.
- Expected: `System check identified no issues (0 silenced).` then `/api/v1/activities/ /api/v1/activities/search/ /api/v1/activities/lodging/1/ /api/v1/activities/1/ /api/v1/activities/1/vote/` then `No changes detected`.

Commit checkpoint (HOST): `git add -A backend/tripsync_proj/activities_app backend/tripsync_proj/tripsync_proj/urls.py && git commit -m "activities_app: APIView rewrite, server-side geocoding, flat api/v1 routes, drop broken permission class"`.

## Step 9 — Tests

**MACRO WHY.** CI runs exactly `python manage.py test tests` from `backend/tripsync_proj` (backend-tests.yml:64-66) — only `tests/test_*.py` is discovered; `activities_app/tests.py` never runs. This is the one place TripSync's convention must beat CJs's (CJs keeps tests in the app). Two more reasons the CJs harness cannot be copied verbatim: `settings.py` throttles anon 10/min and user 30/min through `django_redis`, so CJs's "register twice per test through the real endpoint" trips the anon limit within a few tests; and throttle classes bind at import, so a settings override cannot disable them — the repo's `UnthrottledAPITestCase` patches `SimpleRateThrottle.allow_request` (its docstring records why). Everything else is CJs: the `type("MockResponse", ...)` stub, `@patch("requests.get")` (and `@patch("requests.post")` for Places), fixtures seeded through the ORM when they are not under test, numbered `test_01_`, `with self.subTest()` around the status assert, a `#tests X - outcome` line above each. The most important test is `test_02_google_failure_returns_400_and_no_orphan_row` — CJs's §8f test_02 — because it proves the ORDER the CJs create flow depends on: Google is asked before any write, so a bad address leaves no row. Note what it does NOT prove: `transaction.atomic()` is never entered on that path (the view returns 400 first), so test_02 passes byte-for-byte identically with the `atomic()` line deleted. The transaction earns its keep only when the Activity INSERT succeeds and the geocode INSERT then fails; `test_07` forces exactly that, and it fails with `1 != 0` if the `atomic()` line is removed (verified).

**Flags.**
- **[beyond CJs ceiling]** `rest_framework.test.APITestCase`/`APIClient` (CJs: `django.test.TestCase` + `Client`). The repo's precedent wins because the throttle patch lives on that base class; a third test style would be worse.
- **[CJs deviation]** auth by setting `self.client.cookies["access_token"]` directly (repo precedent, `test_auth_user_views.py:187-189`) instead of registering through the endpoint. Faster, and one fewer throttled call.
- CSRF: both test clients default to `enforce_csrf_checks=False`, which sets `request._dont_enforce_csrf_checks` that Django's middleware honours — so no `X-CSRFToken` plumbing here. `LogOutCsrfTests` already proves the gate itself.
- `@patch.dict("os.environ", GOOGLE_ENV)` on every test that can reach the helper — a consequence of Step 5's loud `KeyError`; CI has no key. Kept per test rather than in `setUp` so the file documents which tests exercise Google.
- Importing `UnthrottledAPITestCase` from the sibling module: a base class with no `test_` methods is collected as zero tests. Moving it to `tests/base.py` is a team refactor, not yours to do unilaterally.
- `make_trip()` passes `city/state/country` because Cody's merged `Trip` requires all three; one function owns that fact, so a future `Trip` change touches one line.
- `test_google_maps.py` uses `django.test.TestCase`, not the unthrottled base — it never goes through DRF, so there is nothing to throttle; this is the CJs `api_app/tests.py` pattern verbatim. (D6 said both files import the unthrottled base; the helper file does not need it.)
- `@patch("requests.post")` on every Places test — the helper calls `requests.post`; patching `requests.get` there would let a real HTTP call out, which fails in CI with no network and no key. The `mock_post.call_args.kwargs["json"]` reads prove the body Google would have received.

### `backend/tripsync_proj/tests/test_google_maps.py` (new)

```python
import os
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from activities_app.google_maps import geocode_address, search_places

GOOGLE_ENV = {"GOOGLE_MAPS_SERVER_KEY": "test-key"}

#the CJs stub - a tiny class plays google; status_code because the helper checks it
def mock_google(status_code, payload):
    return type(
        "MockResponse", (), {"status_code": status_code, "json": lambda self: payload}
    )()


class GeocodeAddressTests(TestCase):

    #tests the failure contract - google says no -> None, not an exception
        # this is why a bad address is a 400 and not a 500. mock swaps requests.get so we never hit google
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_google_failure_returns_none(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        result = geocode_address(
            street="933 Kapahulu Ave", city="Honolulu", state="HI",
            zip_code="96816", country="United States",
        )
        self.assertIsNone(result)

    #tests the empty-address guard - nothing to geocode -> None and google is never called
        # the view uses this so an activity with no location costs zero google calls
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_empty_address_never_calls_google(self, mock_get):
        self.assertIsNone(geocode_address())
        mock_get.assert_not_called()

    #tests the manual branch - v4 'results' wrapper is parsed and the text is percent-encoded
        # 'Paris, France' is a legitimate travel entry with no street; the comma must not split the URL path
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_manual_entry_parses_results_wrapper(self, mock_get):
        mock_get.return_value = mock_google(200, {"results": [{
            "placeId": "ChIJparis",
            "location": {"latitude": 48.856614, "longitude": 2.352222},
            "formattedAddress": "Paris, France",
        }]})
        result = geocode_address(city="Paris", country="France")
        self.assertEqual(result["place_id"], "ChIJparis")
        self.assertEqual(result["latitude"], 48.856614)
        called_url = mock_get.call_args.args[0]
        self.assertTrue(called_url.endswith("/v4/geocode/address/Paris%2C%20France"))
        self.assertNotIn("regionCode", mock_get.call_args.kwargs["params"])

    #tests the place branch - bare object, no wrapper, and the id goes in the URL path
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_place_id_parses_bare_object(self, mock_get):
        mock_get.return_value = mock_google(200, {
            "placeId": "ChIJplace",
            "location": {"latitude": 21.284, "longitude": -157.812},
            "formattedAddress": "933 Kapahulu Ave, Honolulu, HI 96816, USA",
        })
        result = geocode_address(place_id="ChIJplace")
        self.assertEqual(result["place_id"], "ChIJplace")
        self.assertTrue(mock_get.call_args.args[0].endswith("/v4/geocode/places/ChIJplace"))

    #tests the two-letter country -> regionCode bias
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_05_two_letter_country_becomes_region_bias(self, mock_get):
        mock_get.return_value = mock_google(200, {"results": []})
        self.assertIsNone(geocode_address(city="Honolulu", country="us"))   #empty results -> None
        self.assertEqual(mock_get.call_args.kwargs["params"], {"regionCode": "US"})

    #tests the loud misconfig - no key -> KeyError, never a silent 'could not be geocoded' 400
    def test_06_missing_key_is_loud(self):
        with patch.dict("os.environ"):            #snapshot; restored on exit
            os.environ.pop("GOOGLE_MAPS_SERVER_KEY", None)
            with self.assertRaises(KeyError):
                geocode_address(city="Honolulu")

    #tests the empty-value case - 'GOOGLE_MAPS_SERVER_KEY=' straight from .env.example must also be loud
    @patch.dict("os.environ", {"GOOGLE_MAPS_SERVER_KEY": ""})
    def test_07_empty_key_is_loud(self):
        with self.assertRaises(KeyError):
            geocode_address(city="Honolulu")


class SearchPlacesTests(TestCase):

    #tests the happy path - places (new) shape is parsed, and the body carries the lodging as the bias center
        # the Decimal inputs are what the Lodging row hands over; google wants floats
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_01_parses_places_and_biases_to_center(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": [{
            "id": "ChIJpizza",
            "displayName": {"text": "Pizza Place", "languageCode": "en"},
            "formattedAddress": "1 Pizza St, Honolulu, HI 96815, USA",
            "location": {"latitude": 21.28, "longitude": -157.83},
        }]})
        result = search_places(
            "pizza", latitude=Decimal("21.275000"), longitude=Decimal("-157.825000"),
            radius_m=8047, min_rating=4, max_results=5,
        )
        self.assertEqual(result, [{
            "place_id": "ChIJpizza",
            "name": "Pizza Place",
            "formatted_address": "1 Pizza St, Honolulu, HI 96815, USA",
            "latitude": 21.28,
            "longitude": -157.83,
        }])
        self.assertEqual(mock_post.call_args.args[0], "https://places.googleapis.com/v1/places:searchText")
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["textQuery"], "pizza")
        self.assertEqual(body["pageSize"], 5)
        self.assertEqual(body["minRating"], 4.0)
        self.assertEqual(body["locationBias"]["circle"]["center"], {"latitude": 21.275, "longitude": -157.825})
        self.assertEqual(body["locationBias"]["circle"]["radius"], 8047.0)
        self.assertIn("X-Goog-FieldMask", mock_post.call_args.kwargs["headers"])

    #tests the clamps - google rejects more than 20 results or more than 50 km; clamp, don't 400 the user
        # and no minRating key at all when none was asked for (google would reject null)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_02_clamps_page_size_and_radius(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": []})
        self.assertEqual(search_places("x", 21.0, -157.0, radius_m=99999, max_results=99), [])
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["pageSize"], 20)
        self.assertEqual(body["locationBias"]["circle"]["radius"], 50000.0)
        self.assertNotIn("minRating", body)

    #tests the failure contract - google says no -> None, not an exception (the view turns it into a 502)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_03_google_failure_returns_none(self, mock_post):
        mock_post.return_value = mock_google(403, {})
        self.assertIsNone(search_places("pizza", 21.0, -157.0))

    #tests a malformed hit - a place with no location -> None, never a 500
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_04_malformed_place_returns_none(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": [{"id": "ChIJx", "location": None}]})
        self.assertIsNone(search_places("pizza", 21.0, -157.0))

    #tests the loud misconfig - the search helper shares the key check with geocoding
    @patch.dict("os.environ", {"GOOGLE_MAPS_SERVER_KEY": ""})
    def test_05_empty_key_is_loud(self):
        with self.assertRaises(KeyError):
            search_places("pizza", 21.0, -157.0)
```

### `backend/tripsync_proj/tests/test_activities_views.py` (new)

```python
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from activities_app.models import Activity, ActivityGeocode, ActivityVote, Lodging
from tests.test_auth_user_views import UnthrottledAPITestCase
from trip_app.models import Trip

Auth_User = get_user_model()

GOOGLE_ENV = {"GOOGLE_MAPS_SERVER_KEY": "test-key"}

#v4 shapes: the address endpoint wraps in 'results', the place endpoint returns one bare object
V4_ADDRESS = {"results": [{
    "placeId": "ChIJaddress",
    "location": {"latitude": 21.284301, "longitude": -157.812345},
    "formattedAddress": "933 Kapahulu Ave, Honolulu, HI 96816, USA",
}]}
V4_PLACE = {
    "placeId": "ChIJplace",
    "location": {"latitude": 21.275000, "longitude": -157.825000},
    "formattedAddress": "Waikiki Beach, Honolulu, HI 96815, USA",
}
#places (new) text search shape: a 'places' list; displayName is an object
PLACES_RESULT = {"places": [{
    "id": "ChIJpizza",
    "displayName": {"text": "Pizza Place", "languageCode": "en"},
    "formattedAddress": "1 Pizza St, Honolulu, HI 96815, USA",
    "location": {"latitude": 21.28, "longitude": -157.83},
}]}


#Trip's three address fields are required since trip_app merged; one function owns that fact
def make_trip(name="Oahu weekend"):
    return Trip.objects.create(name=name, city="Honolulu", state="HI", country="USA")


#seeded thru the ORM - geocoding isn't under test where this is used
def make_lodging(trip):
    return Lodging.objects.create(
        trip=trip, name="Airbnb", street="2199 Kalia Rd", city="Honolulu", state="HI",
        zip="96815", country="United States", place_id="ChIJlodging",
        latitude="21.275000", longitude="-157.825000",
        formatted_address="2199 Kalia Rd, Honolulu, HI 96815, USA",
    )


#the CJs stub - a tiny class plays google; status_code because the helper checks it
def mock_google(status_code, payload):
    return type(
        "MockResponse", (), {"status_code": status_code, "json": lambda self: payload}
    )()


class ActivityTestCase(UnthrottledAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="dom", email="dom@example.com", password="a-strong-password-1"
        )
        self.trip = make_trip()
        #cookie set directly - repo precedent (test_auth_user_views.py); the jar carries it on every call
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(self.user).access_token
        )


class ActivityCreateTests(ActivityTestCase):

    #tests the graded server-side API - a Places pick is geocoded and BOTH rows land
        # place_id on the activity is google's answer, not the client's string
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_create_with_place_id_geocodes_and_saves_pin(self, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Surf lesson", "street": "Waikiki Beach",
             "city": "Honolulu", "state": "HI", "zip": "96815", "country": "United States",
             "place_id": "ChIJplace", "cost_estimate_cents": 7500},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        activity = Activity.objects.get()
        self.assertEqual(activity.place_id, "ChIJplace")
        self.assertEqual(float(activity.geocode.latitude), 21.275)
        self.assertEqual(resp.data["latitude"], 21.275)            #number, not string
        self.assertEqual(resp.data["vote_count"], 0)
        self.assertFalse(resp.data["has_voted"])
        self.assertTrue(mock_get.call_args.args[0].endswith("/geocode/places/ChIJplace"))

    #tests the order contract - google says no BEFORE any write -> 400 and NO orphan activity row
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_google_failure_returns_400_and_no_orphan_row(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Mystery spot", "street": "1 Nowhere Rd"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Address could not be geocoded"})
        self.assertEqual(Activity.objects.count(), 0)
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the optional-address rule (README) - no location -> 201, no pin, google never called
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_create_without_location_skips_google(self, mock_get):
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Sleep in", "cost_estimate_cents": 0},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        mock_get.assert_not_called()
        self.assertIsNone(resp.data["latitude"])
        self.assertEqual(resp.data["place_id"], "")
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the field-error 400 - the validator runs before any google call
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_negative_cost_is_a_field_error(self, mock_get):
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Free dive", "cost_estimate_cents": -5},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 400)
        self.assertIn("cost_estimate_cents", resp.data)
        mock_get.assert_not_called()

    #tests the parent check - an unknown trip id is a serializer 400, not a 500
    def test_05_unknown_trip_is_400(self):
        resp = self.client.post(
            reverse("all_activities"), {"trip": 999, "name": "Ghost"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("trip", resp.data)

    #tests the base class - no cookie -> 401 (IsAuthenticated on ActivityView)
    def test_06_anonymous_is_401(self):
        resp = APIClient().post(
            reverse("all_activities"), {"trip": self.trip.id, "name": "x"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    #tests the atomic contract for real - the second INSERT dies -> the first is rolled back with it
        # bottom decorator = first arg; patching the manager's create makes the geocode row fail after the activity row succeeded
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    @patch("activities_app.views.ActivityGeocode.objects.create", side_effect=RuntimeError("db down"))
    def test_07_geocode_row_failure_rolls_back_activity(self, mock_create, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        with self.assertRaises(RuntimeError):
            self.client.post(
                reverse("all_activities"),
                {"trip": self.trip.id, "name": "Surf lesson", "place_id": "ChIJplace"},
                format="json",
            )
        self.assertEqual(Activity.objects.count(), 0)


class ActivityListTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.other_trip = make_trip("Maui week")
        #seeded thru the ORM - geocoding isn't under test here
        Activity.objects.create(trip=self.trip, name="Surf")
        Activity.objects.create(trip=self.trip, name="Hike")
        Activity.objects.create(trip=self.other_trip, name="Road to Hana")

    #tests the ?trip= contract - missing or non-numeric -> 400 (no int converter on a query param)
    def test_01_list_requires_trip_param(self):
        self.assertEqual(self.client.get(reverse("all_activities")).status_code, 400)
        self.assertEqual(
            self.client.get(reverse("all_activities"), {"trip": "abc"}).status_code, 400
        )

    #tests the parent lookup - unknown trip -> 404
    def test_02_unknown_trip_is_404(self):
        resp = self.client.get(reverse("all_activities"), {"trip": 999})
        self.assertEqual(resp.status_code, 404)

    #tests scoping + ordering - only that trip's rows, ascending id (Meta.ordering)
    def test_03_lists_only_that_trips_activities_by_id(self):
        resp = self.client.get(reverse("all_activities"), {"trip": self.trip.id})
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual([a["name"] for a in resp.data], ["Surf", "Hike"])
        self.assertEqual(resp.data[0]["vote_count"], 0)
        self.assertFalse(resp.data[0]["has_voted"])

    #tests the base class on GET - no cookie -> 401
    def test_04_anonymous_is_401(self):
        resp = APIClient().get(reverse("all_activities"), {"trip": self.trip.id})
        self.assertEqual(resp.status_code, 401)


class ActivityEditTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.activity = Activity.objects.create(
            trip=self.trip, name="Surf lesson", street="Waikiki Beach", city="Honolulu",
            state="HI", zip="96815", country="United States", place_id="ChIJold",
            cost_estimate_cents=7500,
        )
        ActivityGeocode.objects.create(
            activity=self.activity, latitude="21.275000", longitude="-157.825000",
            formatted_address="Waikiki Beach, Honolulu, HI 96815, USA",
        )

    #tests the frontend's edit shape - PATCH name/description/cost never touches google
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_patch_name_only_keeps_pin_and_skips_google(self, mock_get):
        resp = self.client.patch(
            reverse("an_activity", args=[self.activity.id]),
            {"name": "Surf lesson (10am)", "cost_estimate_cents": 8000},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_not_called()
        self.assertEqual(resp.data["name"], "Surf lesson (10am)")
        self.assertEqual(resp.data["latitude"], 21.275)
        self.assertEqual(resp.data["place_id"], "ChIJold")

    #tests re-geocode on address change - the new pin AND google's new place_id replace the old
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_put_new_street_regeocodes(self, mock_get):
        mock_get.return_value = mock_google(200, V4_ADDRESS)
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "933 Kapahulu Ave", "zip": "96816"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_called_once()
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.place_id, "ChIJaddress")
        self.assertEqual(float(self.activity.geocode.latitude), 21.284301)
        self.assertEqual(resp.data["latitude"], 21.284301)       #response reflects the DB, not a cache
        self.assertEqual(ActivityGeocode.objects.count(), 1)      #updated, not duplicated

    #tests the update contract - google fails on edit -> 200 and the OLD pin survives
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_google_failure_on_edit_keeps_old_pin(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "1 Nowhere Rd"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["street"], "1 Nowhere Rd")     #the edit itself is saved
        self.assertEqual(resp.data["latitude"], 21.275)           #old pin kept
        self.assertEqual(resp.data["place_id"], "ChIJold")

    #tests the optional-address rule on edit - blanking every location field drops the pin
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_blanking_address_drops_pin(self, mock_get):
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "", "city": "", "state": "", "zip": "", "country": "", "place_id": ""},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_not_called()
        self.assertIsNone(resp.data["latitude"])
        self.assertEqual(resp.data["place_id"], "")
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the no-re-parent rule - an activity belongs to its trip from birth
    def test_05_trip_cannot_change(self):
        other = make_trip("Maui week")
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]), {"trip": other.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.trip_id, self.trip.id)

    #tests delete - 204 with no body, and CASCADE takes the pin with it
    def test_06_delete_returns_204_and_cascades(self):
        resp = self.client.delete(reverse("an_activity", args=[self.activity.id]))
        with self.subTest():
            self.assertEqual(resp.status_code, 204)
        self.assertEqual(Activity.objects.count(), 0)
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the helper - unknown id -> 404 (get_object_or_404, never a bare .get())
    def test_07_unknown_id_is_404(self):
        self.assertEqual(self.client.get(reverse("an_activity", args=[999])).status_code, 404)


class ActivityVoteTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.activity = Activity.objects.create(trip=self.trip, name="Surf")
        self.url = reverse("activity_vote", args=[self.activity.id])

    #tests cast - 201 with the fresh activity so the client can drop its local +1
    def test_01_vote_returns_201_with_fresh_counts(self):
        resp = self.client.post(self.url)
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["has_voted"])
        self.assertEqual(resp.data["vote_count"], 1)
        self.assertEqual(ActivityVote.objects.count(), 1)

    #tests the one-vote rule - second cast -> 409, the row count does not move
    def test_02_duplicate_vote_is_409(self):
        ActivityVote.objects.create(activity=self.activity, user=self.user)
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(ActivityVote.objects.count(), 1)

    #tests remove - 204 and the row is gone
    def test_03_remove_vote_is_204(self):
        ActivityVote.objects.create(activity=self.activity, user=self.user)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(ActivityVote.objects.count(), 0)

    #tests remove-when-absent - scoped lookup answers 404
    def test_04_remove_absent_vote_is_404(self):
        self.assertEqual(self.client.delete(self.url).status_code, 404)

    #tests has_voted is per user - someone else's vote counts but isn't mine
    def test_05_other_users_vote_is_counted_but_not_mine(self):
        other = Auth_User.objects.create_user(
            username="cody", email="cody@example.com", password="a-strong-password-1"
        )
        ActivityVote.objects.create(activity=self.activity, user=other)
        resp = self.client.get(reverse("an_activity", args=[self.activity.id]))
        self.assertEqual(resp.data["vote_count"], 1)
        self.assertFalse(resp.data["has_voted"])


class LodgingTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("a_lodging", args=[self.trip.id])

    #tests the not-set-yet contract - 404 is what tells the frontend to show the lodging form
    def test_01_get_before_set_is_404(self):
        self.assertEqual(self.client.get(self.url).status_code, 404)

    #tests the graded server-side API - a Places pick is geocoded and the pin lands ON the row
        # 201 because the row was created; place_id is google's answer
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_put_with_place_id_creates_201(self, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        resp = self.client.put(
            self.url, {"name": "Airbnb", "place_id": "ChIJplace"}, format="json"
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        lodging = Lodging.objects.get(trip=self.trip)
        self.assertEqual(lodging.place_id, "ChIJplace")
        self.assertEqual(float(lodging.latitude), 21.275)
        self.assertEqual(resp.data["latitude"], 21.275)            #number, not string
        self.assertEqual(resp.data["trip"], self.trip.id)
        self.assertTrue(mock_get.call_args.args[0].endswith("/geocode/places/ChIJplace"))

    #tests replace - a second PUT re-geocodes, answers 200, and there is still ONE row
        # fields not sent go back to '' - "replace" means the whole row, not a merge
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_put_again_replaces_and_keeps_one_row(self, mock_get):
        make_lodging(self.trip)
        mock_get.return_value = mock_google(200, V4_ADDRESS)
        resp = self.client.put(
            self.url,
            {"street": "933 Kapahulu Ave", "city": "Honolulu", "state": "HI", "zip": "96816"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(Lodging.objects.count(), 1)
        lodging = Lodging.objects.get(trip=self.trip)
        self.assertEqual(lodging.place_id, "ChIJaddress")
        self.assertEqual(float(lodging.longitude), -157.812345)
        self.assertEqual(lodging.name, "")                          #not sent -> replaced with ''
        self.assertEqual(lodging.country, "")
        self.assertTrue(mock_get.call_args.args[0].endswith("/v4/geocode/address/933%20Kapahulu%20Ave%2C%20Honolulu%2C%20HI%2C%2096816"))

    #tests the nothing-to-geocode 400 - google is never called and no row is written
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_put_without_location_is_400(self, mock_get):
        resp = self.client.put(self.url, {"name": "Somewhere"}, format="json")
        self.assertEqual(resp.status_code, 400)
        mock_get.assert_not_called()
        self.assertEqual(Lodging.objects.count(), 0)

    #tests the order contract - google says no BEFORE any write -> 400 and no row (CJs's strict rule)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_05_google_failure_is_400_and_no_row(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.put(self.url, {"street": "1 Nowhere Rd"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Address could not be geocoded"})
        self.assertEqual(Lodging.objects.count(), 0)

    #tests read - the lodging comes back with numeric coordinates for the map center
    def test_06_get_after_set_returns_lodging(self):
        make_lodging(self.trip)
        resp = self.client.get(self.url)
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["name"], "Airbnb")
        self.assertEqual(resp.data["latitude"], 21.275)
        self.assertEqual(resp.data["longitude"], -157.825)

    #tests delete - 204, row gone, and the trip itself is untouched
    def test_07_delete_is_204(self):
        make_lodging(self.trip)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(Lodging.objects.count(), 0)
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

    #tests the parent check - unknown trip -> 404 on PUT (get_object_or_404 on Trip, never a bare .get())
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_08_unknown_trip_is_404(self, mock_get):
        resp = self.client.put(
            reverse("a_lodging", args=[999]), {"place_id": "ChIJplace"}, format="json"
        )
        self.assertEqual(resp.status_code, 404)
        mock_get.assert_not_called()

    #tests the base class - no cookie -> 401
    def test_09_anonymous_is_401(self):
        self.assertEqual(APIClient().get(self.url).status_code, 401)


class FindActivitiesTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("find_activities")

    #tests the param contract - trip and query are both required; a non-numeric trip is a 400 not a 500
    def test_01_requires_trip_and_query(self):
        self.assertEqual(self.client.get(self.url, {"trip": self.trip.id}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {"query": "pizza"}).status_code, 400)
        self.assertEqual(
            self.client.get(self.url, {"trip": "abc", "query": "pizza"}).status_code, 400
        )

    #tests the parent lookup - unknown trip -> 404
    def test_02_unknown_trip_is_404(self):
        resp = self.client.get(self.url, {"trip": 999, "query": "pizza"})
        self.assertEqual(resp.status_code, 404)

    #tests the center rule - a trip with no lodging cannot search (there is no center to bias to)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_03_no_lodging_is_400(self, mock_post):
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Set where the group is staying first"})
        mock_post.assert_not_called()

    #tests the happy path - results come back as a list and the search is biased to the lodging's pin
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_04_search_is_centered_on_the_lodging(self, mock_post):
        make_lodging(self.trip)
        mock_post.return_value = mock_google(200, PLACES_RESULT)
        resp = self.client.get(
            self.url, {"trip": self.trip.id, "query": "pizza", "radius_m": 8047, "min_rating": 4}
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["place_id"], "ChIJpizza")
        self.assertEqual(resp.data[0]["name"], "Pizza Place")
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["textQuery"], "pizza")
        self.assertEqual(body["locationBias"]["circle"]["center"], {"latitude": 21.275, "longitude": -157.825})
        self.assertEqual(body["locationBias"]["circle"]["radius"], 8047.0)
        self.assertEqual(body["minRating"], 4.0)
        self.assertEqual(body["pageSize"], 10)                      #the default

    #tests the upstream-failure contract - google says no -> 502, not a 400 that blames the user
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_05_google_failure_is_502(self, mock_post):
        make_lodging(self.trip)
        mock_post.return_value = mock_google(403, {})
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 502)
        self.assertEqual(resp.data, {"error": "Place search failed"})

    #tests the number guard - a non-numeric radius is a 400, not a ValueError 500
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_06_bad_numbers_are_400(self, mock_post):
        make_lodging(self.trip)
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza", "radius_m": "far"})
        self.assertEqual(resp.status_code, 400)
        mock_post.assert_not_called()

    #tests the base class - no cookie -> 401
    def test_07_anonymous_is_401(self):
        resp = APIClient().get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 401)
```

**UNDERNEATH.**
- `manage.py test tests` builds a throwaway database by running ALL migrations (which is why Step 3 is a prerequisite), then discovers `tests/test_*.py`. `APITestCase` wraps each test in a transaction and rolls it back — `setUp` data never leaks between tests.
- Decorator order: `@patch.dict` (outer) injects nothing; `@patch("requests.get")` (inner) injects `mock_get`. `patch.dict` restores `os.environ` after the test. With three decorators (`test_07`) the bottom one is the first argument: `(self, mock_create, mock_get)`.
- `test_07`: `patch("activities_app.views.ActivityGeocode.objects.create")` swaps `create` on the one `Manager` instance the model owns, so the view's second INSERT raises after the first succeeded. DRF's exception handler returns `None` for a `RuntimeError`, DRF re-raises it, and the test client re-raises it into the test (`raise_request_exception=True` is the default) — the `assertRaises` is the 500 you would see in the browser; the count proves the savepoint rolled the Activity INSERT back.
- `RefreshToken.for_user(user).access_token` mints a real signed JWT; setting it on `self.client.cookies` makes `CookieJWTAuthentication` find it on every call. The `InsecureKeyLengthWarning` you may see comes from the short CI/dev `DJANGO_SECRET_KEY`, not from these tests.
- `format="json"` sends `application/json` — the same content type the frontend sends, so the parser path under test is the real one. The default multipart would still work for flat strings (`"1"` coerces to a pk) but cannot carry `null`, nested objects or lists, and it is not what production sends.
- `mock_get.call_args.args[0]` is the URL the helper built; `.kwargs["params"]` is the dict — the tests prove the request SHAPE, not just the parse.
- `refresh_from_db()` reloads fields AND clears cached relations, so `self.activity.geocode` re-queries in `test_02`.
- `APIClient()` (fresh, no cookie) is the anonymous client; the throttle patch is class-wide, so it is covered too.
- `LodgingTests.test_03` proves "replace" — `name` and `country` come back `''` because they were not in the second PUT — and reads the URL the helper built (`933%20Kapahulu%20Ave%2C%20Honolulu%2C%20HI%2C%2096816`: the four parts joined with `, ` then percent-encoded). `FindActivitiesTests.test_04` reads the JSON body `requests.post` was handed: the bias center equals the seeded lodging's coordinates as floats — that one assertion is the whole "search around where we're staying" contract.

**VERIFY (CONTAINER).**

```bash
python manage.py test tests
python manage.py test tests -v 2 2>&1 | grep -E "test_0|Ran|OK|FAIL"
```

- Macro: the whole suite — old and new — passes in the environment CI uses.
- Micro: `test tests` = the CI command verbatim; `-v 2` prints each test name; the grep trims it.
- Expected: `Ran 78 tests ... OK` (27 existing — 18 auth + 9 trip — plus 12 helper + 39 endpoint). From here, run `python manage.py test tests` after every later edit.

Commit checkpoint: `git add backend/tripsync_proj/tests && git commit -m "tests: activities, lodging and search endpoints + both Google helpers (mocked, unthrottled base)"`.

## Step 10 — Manual verification through the real auth (cookie jar + CSRF)

**MACRO WHY.** Green tests prove the models and the view logic; they do not prove cookie paths, CSRF headers, the live key, or the URL shape against real Google — the test client bypasses CSRF and `requests.get` was mocked. `CookieJWTAuthentication` reads ONLY the `access_token` cookie and runs Django's CSRF check on every authenticated request, so the `Authorization: Bearer` convention in APIendpoints-revised.md:22 would 401. Login/signup are `@ensure_csrf_cookie`, so after one call the jar holds `csrftoken` to echo back as `X-CSRFToken`.

**Commands (HOST; the stack is up; the superuser and trip from Step 4 exist).**

```bash
rm -f jar
curl -s -c jar -b jar -X POST http://localhost:8000/api/v1/users/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"dom","password":"a-strong-password-1"}'
CSRF="$(awk '$6=="csrftoken" {print $7}' jar)"; echo "$CSRF"

# 1. no location -> 201, latitude null, place_id ''
curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"trip": 1, "name": "Sleep in"}'

# 2. bad place id -> 400 Address could not be geocoded, and no row
curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"trip": 1, "name": "Ghost", "place_id": "not-a-real-id"}'

# 3. real manual address -> 201 with numeric latitude/longitude and google's place_id; keep its id for the calls below
RESP=$(curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"trip": 1, "name": "Malasadas", "street": "933 Kapahulu Ave", "city": "Honolulu", "state": "HI", "zip": "96816", "country": "United States", "cost_estimate_cents": 1200}')
echo "$RESP"
ID=$(printf '%s' "$RESP" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'); echo "$ID"

# 4. list for the trip, then detail, vote, duplicate vote, unvote
curl -s -b jar "http://localhost:8000/api/v1/activities/?trip=1"
curl -s -b jar http://localhost:8000/api/v1/activities/$ID/
curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/$ID/vote/ -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000'
curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/$ID/vote/ -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000'
curl -s -o /dev/null -w '%{http_code}\n' -b jar -c jar -X DELETE http://localhost:8000/api/v1/activities/$ID/vote/ -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000'

# 5. edit with PATCH (no google), then PUT a new address (google), then the CSRF gate, then no cookie
curl -s -b jar -c jar -X PATCH http://localhost:8000/api/v1/activities/$ID/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"cost_estimate_cents": 1500}'
# PUT a new address -> google is called again; place_id AND longitude change, the geocode row is updated not duplicated
curl -s -b jar -c jar -X PUT http://localhost:8000/api/v1/activities/$ID/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"street": "2199 Kalia Rd", "city": "Honolulu", "state": "HI", "zip": "96815", "country": "United States"}'
docker compose exec db psql -U tripsync_user -d tripsync_db -c 'select count(*) from activities_app_activitygeocode'
curl -s -o /dev/null -w '%{http_code}\n' -b jar -X POST http://localhost:8000/api/v1/activities/ \
  -H 'Content-Type: application/json' -d '{"trip": 1, "name": "no csrf header"}'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/v1/activities/?trip=1

# 6. lodging - set where the group stays (manual address -> google), read it back, then a PUT with nothing to geocode
curl -s -b jar -c jar -X PUT http://localhost:8000/api/v1/activities/lodging/1/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"name": "Hotel", "street": "2199 Kalia Rd", "city": "Honolulu", "state": "HI", "zip": "96815", "country": "United States"}'
curl -s -b jar http://localhost:8000/api/v1/activities/lodging/1/
curl -s -o /dev/null -w '%{http_code}\n' -b jar -c jar -X PUT http://localhost:8000/api/v1/activities/lodging/1/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d '{"name": "Nothing to geocode"}'

# 7. search around the lodging, then turn the first hit into an activity - the frontend's round trip
curl -s -b jar "http://localhost:8000/api/v1/activities/search/?trip=1&query=pizza&radius_m=3000&max_results=3"
PLACE=$(curl -s -b jar "http://localhost:8000/api/v1/activities/search/?trip=1&query=pizza&radius_m=3000&max_results=1" | python3 -c 'import sys, json; print(json.load(sys.stdin)[0]["place_id"])'); echo "$PLACE"
curl -s -b jar -c jar -X POST http://localhost:8000/api/v1/activities/ \
  -H 'Content-Type: application/json' -H "X-CSRFToken: $CSRF" -H 'Referer: http://localhost:8000' \
  -d "{\"trip\": 1, \"name\": \"Pizza night\", \"place_id\": \"$PLACE\", \"cost_estimate_cents\": 4000}"
```

**UNDERNEATH.**
- Executed on Sept 4 against the dev stack: every item answered exactly as the Expected list says — `201`, `400`, `201`; list / detail / `201` / `409` / `204`; `200` / `200` / `1` / `403` / `401`; `201` / `200` / `400`; list / id / `201`. Three activity rows (ids 1-3: Sleep in, Malasadas, Pizza night — the Step 4 admin add was skipped; it would be four with it), one lodging, two geocode rows in Postgres at the end.
- Precision nit you will see in the output: the `201` body from a create carries Google's float (`21.2849066`); every later read carries the stored `NUMERIC(9,6)` (`21.284907`). Same point to within 10 cm; the PUT path already re-reads. Making create re-read too is one line if the frontend ever compares the two values.
- `-c jar` writes `Set-Cookie` headers to a Netscape-format file; `-b jar` sends them back. Login writes three cookies: `access_token` and `refresh_token` (marked `#HttpOnly_` in the file) and `csrftoken`. The `awk` picks field 7 (value) of the line whose field 6 (name) is `csrftoken`.
- The `csrftoken` cookie holds the 32-char secret; the `X-CSRFToken` header may be that secret verbatim (what the `awk` line sends) or the 64-char masked form a Django template emits — `_does_token_match` unmasks only the 64-char form and constant-time-compares. GETs need only the jar because `CsrfViewMiddleware.process_view` returns early for GET/HEAD/OPTIONS/TRACE. `Referer` is only checked when `request.is_secure()` — harmless here, required on EC2 over HTTPS.
- `RESP=$(...)` captures the 201 body; `python3 -c` pulls `id` out of the JSON so the walkthrough does not depend on Step 4's admin row being id 1 (if you did the Step 4 admin add it is, and "Sleep in" is 2 and "Malasadas" 3; if you skipped it, as this run did, they are 1 and 2 — no id is ever typed by hand here either way). The bad-place-id call in (2) wrote nothing, so it consumed no id.
- The PUT in (5) is the ONLY place the re-geocode-on-update path (`AnActivity.put` → `geocode_address` → `update_or_create` + the `place_id` rewrite) runs against live Google — the tests mock `requests.get` and Step 5's smoke test never went through the view.
- (6) is the only place the lodging PUT hits live Google through the view, and (7) is the only place `requests.post` runs behind a real HTTP request — Places API (New) must be enabled on the key or the search answers `502` (the helper turned Google's `403` into `None`; the view turned `None` into `502`). The `PLACE` capture pipes the first hit's `place_id` into the activity POST — the exact round trip the frontend will make, and the activity's pin then comes from the place-id branch of the geocoder, not from the search result.

**VERIFY.**
- Macro: cookie auth, the CSRF gate and the live key work end to end through the real HTTP path the tests bypass — on the create and update branches, and on the lodging and search paths that `requests.post` never exercised until now.
- Micro: `-c/-b` write/read the jar; `-s` silences progress; `-o /dev/null -w '%{http_code}\n'` prints only the status for the calls whose body is empty or irrelevant; `psql -c` runs one statement and exits.
- Expected, in order: `{"client":"dom"}`; a token string; (1) JSON with `"latitude":null,"place_id":""`; (2) `{"error":"Address could not be geocoded"}`; (3) JSON with `"latitude":21.28...,"longitude":-157.81...,"place_id":"ChIJ..."` and a `formatted_address`, then its `id` on its own line; (4) a list whose last element is Malasadas (one row per 201 so far, plus the Step 4 admin row), then the detail, then the detail again with `"has_voted":true,"vote_count":1`, then `{"error":"You already voted for this activity."}`, then `204`; (5) the detail with `"cost_estimate_cents":1500`, then the detail with a DIFFERENT `place_id`, `"street":"2199 Kalia Rd"`, and `longitude` moved from ≈ -157.81 to ≈ -157.84 (Waikiki, west of Kapahulu), then `count` = `1` from psql (Malasadas is the only pinned row — updated, not duplicated), then `403` (CSRF gate), then `401` (no cookie). Open `http://localhost:8000/admin/activities_app/activity/<the ID you echoed>/change/` — the geocode inline shows Google's Kalia Rd row. (6) `201` JSON with `"trip":1`, numeric `latitude`/`longitude` (≈ 21.27 / −157.83 — Kalia Rd, Waikiki), a `place_id` and Google's `formatted_address`; the same row back from the GET; then `400`. (7) a list of up to three pizza places, each with `place_id`, `name`, `formatted_address`, `latitude`, `longitude`; a `ChIJ...` id on its own line; then a `201` activity whose `place_id` equals that id and whose pin fields came from the place-id branch of the geocoder. In the admin, Lodgings now lists one row. Then `rm jar` — the file holds your live auth cookies and must never be committed (it is not in any `git add` path in this plan, but do not leave it in the repo).

## Step 11 — Docs, same PR as the code

**MACRO WHY.** README.md:62 names ERD.sql the schema source of truth and requires ERD.sql, erd.mmd and the README diagram to change together. APIendpoints-revised.md is explicitly proposed-not-agreed (lines 3-5) and already stale: it claims no Django app exists, assumes Bearer headers and `/api/token/` (the implemented auth is cookie JWT at `/api/v1/users/`), says `my_vote` where the merged frontend reads `has_voted`, shows Geocoding v3 where CJs and this code use v4, and names the env var `GOOGLE_MAPS_API_KEY` where the code reads `GOOGLE_MAPS_SERVER_KEY` — the exact prose/code mismatch CJs recorded as a time sink. Doing the doc edits in the same PR keeps schema and code reviewable together at the cost of a bigger diff.

### `resources/ERD.sql` — replace the `activities` block (lines 31-46) and add a table after it

```sql
-- Table and column names below are logical. Django creates the physical
-- names activities_app_activity, activities_app_activitygeocode, activities_app_lodging,
-- activities_app_activityvote, trip_app_trip and auth_user_app_auth_user;
-- no model sets db_table.

CREATE TABLE "activities" (
    "id"                  BIGINT       NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "trip_id"             BIGINT       NOT NULL,
    "name"                VARCHAR(255) NOT NULL,
    -- street..country are optional at the API (README "manual-address fallback");
    -- '' is stored when omitted, so the columns stay NOT NULL.
    "street"              VARCHAR(255) NOT NULL,
    "city"                VARCHAR(255) NOT NULL,
    "state"               VARCHAR(255) NOT NULL,
    "zip"                 VARCHAR(255) NOT NULL,
    "country"             VARCHAR(255) NOT NULL,
    -- Google's Place ID for the resolved location, written by the server
    -- from the Geocoding result; '' when the activity has no location.
    "place_id"            VARCHAR(255) NOT NULL,
    "cost_estimate_cents" INTEGER      NOT NULL DEFAULT 0,
    "description"         VARCHAR(255) NOT NULL,
    "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    CONSTRAINT "activities_trip_id_fk" FOREIGN KEY ("trip_id")
        REFERENCES "trips" ("id") ON DELETE CASCADE
);

-- Google Geocoding's answer for an activity's location. One row per located
-- activity; absent when the activity has no address/place. Server-written only.
CREATE TABLE "activity_geocodes" (
    "id"                BIGINT       NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "activity_id"       BIGINT       NOT NULL UNIQUE,
    "latitude"          NUMERIC(9,6) NOT NULL,
    "longitude"         NUMERIC(9,6) NOT NULL,
    "formatted_address" VARCHAR(255) NOT NULL,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    CONSTRAINT "activity_geocodes_activity_id_fk" FOREIGN KEY ("activity_id")
        REFERENCES "activities" ("id") ON DELETE CASCADE
);

-- Where the group is staying. One row per trip; the map centers here and
-- place search is biased here. Address text is the user's; the pin is Google's.
CREATE TABLE "lodgings" (
    "id"                BIGINT       NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "trip_id"           BIGINT       NOT NULL UNIQUE,
    "name"              VARCHAR(255) NOT NULL,
    "street"            VARCHAR(255) NOT NULL,
    "city"              VARCHAR(255) NOT NULL,
    "state"             VARCHAR(255) NOT NULL,
    "zip"               VARCHAR(255) NOT NULL,
    "country"           VARCHAR(255) NOT NULL,
    "place_id"          VARCHAR(255) NOT NULL,
    "latitude"          NUMERIC(9,6) NOT NULL,
    "longitude"         NUMERIC(9,6) NOT NULL,
    "formatted_address" VARCHAR(255) NOT NULL,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    CONSTRAINT "lodgings_trip_id_fk" FOREIGN KEY ("trip_id")
        REFERENCES "trips" ("id") ON DELETE CASCADE
);
```

No new index lines are needed: `activity_id UNIQUE` and `trip_id UNIQUE` are their own indexes. Leave `activity_votes` as is — the model now matches it exactly.

**Review fix, all three schema files:** `Auth_User.id` is a `BigAutoField` (`auth_user_app/migrations/0001_initial.py:20`), so `user_id` on `memberships`, `trip_votes` and `activity_votes` is `BIGINT` in ERD.sql (was `INTEGER`) and `bigint` in erd.mmd / the README block (was `int`), and `AUTH_USER.id` is `bigint`; the ERD.sql header and the README `auth_user` table row now name the custom model. The README's first four relationship lines were reordered to erd.mmd's order so the two blocks byte-match (`diff <(grep -v '^%%' resources/erd.mmd) <(sed -n '/^```mermaid$/,/^```$/p' resources/README.md | sed '1d;$d')` is empty). The ERD.sql index comment now says Django also emits a plain FK index on each `user_id` (the schema editor skips it only for `unique=True` fields, not for `UniqueConstraint`s).

### `resources/erd.mmd` — five edits

Add two relationship lines after line 12:

```text
    ACTIVITIES ||--o| ACTIVITY_GEOCODES : "pinned at"
    TRIPS ||--o| LODGINGS : "stays at"
```

Add two lines at the end of the `ACTIVITIES` block (after `string description`):

```text
        timestamptz created_at
        timestamptz updated_at
```

Add two entity blocks after `ACTIVITIES`:

```text
    ACTIVITY_GEOCODES {
        bigint id PK
        bigint activity_id FK
        decimal latitude
        decimal longitude
        string formatted_address
        timestamptz created_at
    }
    LODGINGS {
        bigint id PK
        bigint trip_id FK
        string name
        string street
        string city
        string state
        string zip
        string country
        string place_id
        decimal latitude
        decimal longitude
        string formatted_address
        timestamptz created_at
        timestamptz updated_at
    }
```

Regenerate the PNG (HOST): `npx -y -p @mermaid-js/mermaid-cli mmdc -i resources/erd.mmd -o resources/travel_planner_erd.png -b white -s 2` (the command from erd.mmd:3). **[assumption]** Node ≥ 18 is on the host (the frontend needs it anyway); the first run downloads a headless Chromium (~150 MB). If it fails, commit the `erd.mmd` + README edits anyway and ask whoever owns the diagram docs to regenerate the PNG — say so in the PR. The frontend container mounts only `./frontend`, so it cannot see `resources/` and is no fallback.

### `resources/README.md`

Apply the same five edits to the mermaid block (lines 64-126), and add two rows to the Data Model table after the `activities` row:

```markdown
| `activity_geocodes` | Google Geocoding's answer for an activity's location (server-written, one per located activity) | latitude, longitude, formatted_address · unique (activity) |
| `lodgings` | Where the group is staying — one per trip; the map centers here and place search is biased here | name, address fields, place_id, latitude, longitude, formatted_address · unique (trip) |
```

In the `activities` row, change the Key fields cell to: `name, address fields (optional), place_id (server-written), cost_estimate_cents, description, created_at/updated_at`.

### `resources/APIendpoints-revised.md`

Replace the **Activities** table (lines 72-80) with:

```markdown
| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| GET | `/api/v1/activities/?trip=<id>` | list activities for a trip | Trip Detail page + map pins; `trip` query param required (400 if missing, 404 if unknown); each row carries `latitude`/`longitude` (numbers or null), `formatted_address`, `vote_count`, `has_voted` |
| POST | `/api/v1/activities/` | add activity | body: `trip`, `name`, `description`, `cost_estimate_cents`, and either `place_id` (Places pick) or any of `street/city/state/zip/country` (manual); server geocodes when a location is given — 400 `{"error": "Address could not be geocoded"}` and no row on failure; no location at all is allowed (no pin) |
| GET | `/api/v1/activities/<int:id>/` | activity detail | same shape as the list rows |
| PUT / PATCH | `/api/v1/activities/<int:id>/` | edit activity | partial — send only changed fields; a changed address or `place_id` re-geocodes (old pin kept if Google fails; blanking every address field drops the pin); `trip` cannot change (400) |
| DELETE | `/api/v1/activities/<int:id>/` | delete activity | 204; cascades pin + votes |
| GET | `/api/v1/activities/lodging/<int:trip_id>/` | where the group is staying | the map center; 404 until set (the UI shows the lodging form) |
| PUT | `/api/v1/activities/lodging/<int:trip_id>/` | set or replace the lodging | body: `name` (optional) and either `place_id` (Places pick) or an address; server geocodes — 201 first time, 200 on replace, 400 `{"error": "Address could not be geocoded"}` and no row on failure; replace, not merge |
| DELETE | `/api/v1/activities/lodging/<int:trip_id>/` | clear the lodging | 204 |
| GET | `/api/v1/activities/search/` | Places Text Search around the lodging | params: `trip`, `query` (both required), `radius_m` (≤ 50000, default 5000), `min_rating`, `max_results` (≤ 20, default 10); 400 if the trip has no lodging; 502 if Google fails; each hit: `place_id, name, formatted_address, latitude, longitude` |
```

The `find_coords` row is replaced by the three lodging rows and the `find_activities` row by the `search/` row — the same two jobs the original spec described, with the lodging persisted and the search centered on it server-side.

Replace the **Activity votes** table (lines 84-87) with:

```markdown
| Method | Endpoint | Purpose | Notes |
|---|---|---|---|
| POST | `/api/v1/activities/<int:id>/vote/` | add my vote | 201 with the updated activity (`vote_count`, `has_voted`); duplicate → 409; DB unique (user, activity) is the backstop |
| DELETE | `/api/v1/activities/<int:id>/vote/` | remove my vote | 204; no vote of mine → 404 |
```

Also in that file (activities rows only — the trips rows are the trips owner's call, see Open decisions):
- line 12: ``... comes back as `my_vote` on the detail GETs ...`` → ``... comes back as `my_vote` on the trip detail GET and `has_voted` on activity GETs ...``;
- line 17: replace ``Both keys stay server-side; **add `GOOGLE_MAPS_API_KEY=` to `backend/.env.example`** — it isn't there yet.`` with ``The server key (`GOOGLE_MAPS_SERVER_KEY` in `backend/.env.example`) serves Geocoding and Places (New) and never ships to the browser; the Maps JS browser key is `VITE_`-exposed and HTTP-referrer restricted.``;
- line 22 → `Auth: httponly cookie JWT (access_token) set by /api/v1/users/login/ + X-CSRFToken header on writes — see backend/Backend.md`;
- line 24: ``` `my_vote` on trips and activities ``` → ``` `my_vote` on trips and `has_voted` on activities ```;
- line 89 heading → `Google integration (two keys: a browser key for Maps JS, HTTP-referrer restricted; a server key for Geocoding + Places (New), never shipped to the browser)`;
- line 93: ``They type an address; we return lat/lng and a place_id. Powers `find_coords`.`` → ``They type the lodging address; the server geocodes it inside `PUT /api/v1/activities/lodging/<trip_id>/` and stores lat/lng + place_id — the map center and the search bias. The same call is the manual-address fallback on activities.``;
- line 140 (Old → New mapping): the row ``| `/activities/find_coords/`, `/activities/find_activities/` | same, under `/api/` |`` becomes ``| `/activities/find_coords/`, `/activities/find_activities/` | `PUT /api/v1/activities/lodging/<trip_id>/` (geocoded, persisted) and `GET /api/v1/activities/search/?trip=&query=` (Places, centered on the lodging) |``;
- line 5 `**Status:**` → `users, trips and groups are implemented by their owners; activities, lodging and search (this doc's Activities tables) are implemented — see backend/Backend.md. The remaining rows are still a target.`;
- line 95: ``Powers `find_activities`.`` → ``Powers `GET /api/v1/activities/search/?trip=&query=` — the circle's center is the trip's stored lodging.``;
- the Practical-notes line: append ``; `pageSize` (≤ 20) replaced the deprecated `maxResultCount`; `rating` stays out of the mask because it moves billing to the Enterprise SKU``;
- Old → New rows for `/activities/create/`, `/activities/<id>` and `/activities_votes/<activity_id>/add_vote/` → the `/api/v1/activities/...` forms (`trip` in the body; `PATCH` added);
- replace the v3 Geocoding block AND the old Text Search block beneath it (lines 99-113: the ``**Geocoding** (for `find_coords`):`` label, both fenced blocks and the ``**Text Search**`` label) with the text below under ONE fence. The new label line is: ``**Geocoding** (lodging PUT and the manual-address fallback on activities) and **Text Search** (`search/`) — v4 / Places (New): header auth, field masks:``

```text
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

### `backend/Backend.md`

Under `## Apps` add `- trip_app — trips` and `- group_app — trip membership (one Group per trip, members via M2M)`, change the `activities_app` line to `- activities_app — activities, activity votes, lodging (where the group stays), Google Geocoding + Places (New)`, and after the `## Group Endpoints` section add (Cody's heading style):

```markdown
## Activities Endpoints

Base path: `/api/v1/activities/` (`tripsync_proj/urls.py` -> `activities_app.urls`). All require the `access_token` cookie (401 otherwise) and `X-CSRFToken` on writes (403 otherwise). Server-side Google: Geocoding inside lodging PUT and activity POST/PUT when a location is supplied; Places (New) Text Search behind `search/`, centered on the trip's lodging. Key = `GOOGLE_MAPS_SERVER_KEY` in `backend/.env` (both APIs enabled on it).

| Method | Path | View | Notes |
|---|---|---|---|
| GET | `/api/v1/activities/?trip=<id>` | `AllActivities` | 400 without `trip`, 404 unknown trip |
| POST | `/api/v1/activities/` | `AllActivities` | 201 activity; 400 field errors or `{"error": "Address could not be geocoded"}` |
| GET | `/api/v1/activities/<id>/` | `AnActivity` | 404 unknown id |
| PUT/PATCH | `/api/v1/activities/<id>/` | `AnActivity` | partial; re-geocodes on address/place_id change |
| DELETE | `/api/v1/activities/<id>/` | `AnActivity` | 204 |
| POST | `/api/v1/activities/<id>/vote/` | `AnActivityVote` | 201 activity; 409 duplicate |
| DELETE | `/api/v1/activities/<id>/vote/` | `AnActivityVote` | 204; 404 if no vote |
| GET | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 404 until set |
| PUT | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 201 first set / 200 replace; always geocodes; 400 on failure, no row |
| DELETE | `/api/v1/activities/lodging/<trip_id>/` | `ALodging` | 204 |
| GET | `/api/v1/activities/search/?trip=<id>&query=<text>` | `FindActivities` | list of places around the lodging; 400 if no lodging; 502 if Google fails |
```

**VERIFY (HOST).**

```bash
git diff --stat resources/ backend/Backend.md
grep -n "activity_geocodes\|ACTIVITY_GEOCODES\|lodgings\|LODGINGS" resources/ERD.sql resources/erd.mmd resources/README.md
grep -n "GOOGLE_MAPS_API_KEY\|find_coords\|maps.googleapis.com" resources/APIendpoints-revised.md
grep -n "my_vote" resources/APIendpoints-revised.md
```

- Macro: the three schema files agree, the PNG is regenerated, and the spec no longer contradicts the code on anything activities-side.
- Micro: `git diff --stat` lists touched files with +/- counts; `grep -n` prints matching lines with numbers so you can cross-check the three schema files line by line; the two spec greps are split because one must be empty and one must not.
- Expected: the first grep hits all three files, both tables in each; the second grep prints exactly three lines — 17 and 91, where the browser key's real name `VITE_GOOGLE_MAPS_API_KEY` contains the retired server-key name as a substring (the server key is `GOOGLE_MAPS_SERVER_KEY` everywhere), and the Old → New row (line 143) whose LEFT column is the historical `find_coords` / `find_activities`; the deprecated-`maxResultCount` note on the Practical-notes line is intentionally outside that grep; the third prints ONLY lines 12, 24, 59 and 139 — the trip-vote mentions, which stay `my_vote` until the trips owner decides (Open decisions #13).

Commit checkpoint: `git add resources backend/Backend.md && git commit -m "docs: activity_geocodes + lodgings + timestamps in ERD trio; align activities spec with implemented routes"`. Stage by path only — never `git add -A` / `git add .` / `git commit -a`: the Step 10 `jar` (live cookies) and any personal notes under `backend/` are untracked and unignored. This plan file is committed with the docs (it is under `resources/`) and the PR body cites it; the superuser password in Steps 4 and 10 is a local-docker fixture, not a real credential.

## Step 12 — PR and the frontend hand-off

**MACRO WHY.** CI runs only on PRs to `backend` and `dev` (backend-tests.yml:3-7) — a PR straight to `main` runs nothing. The PR body is where the migration-ownership agreement (Step 0) and the Phase-1 access gap are recorded so reviewers do not rediscover them; the frontend hand-off is what stops "the backend is broken" on integration day.

**PR (HOST).** Push and open the PR against `backend` — the team's flow is feature → `backend` → `dev` (Cody's #102 then #103), and CI listens on both. The frontend hand-off list below goes into the PR description under its own heading so it sits in front of the reviewers:

```bash
git push -u origin backend-dom-backend
gh pr create --base backend --title "activities_app: CJs-style rebuild + server-side geocoding" --body-file - <<'EOF'
Rebuilds activities_app to the CJs_roofing conventions and folds the Geocoding call into the app.

- APIView only (generics removed); base ActivityView holds IsAuthenticated; broken IsTripMemberAndVoter deleted.
- Models match ERD.sql columns; adds created_at/updated_at and an ActivityGeocode OneToOne (ERD.sql, erd.mmd, README updated together).
- Flat routes under /api/v1/activities/ (list via ?trip=<id>); PUT and PATCH both partial; vote 201/409/204/404.
- Lodging (where the group stays): one row per trip, geocoded on PUT (201 first set / 200 replace), the map center.
- Places (New) Text Search behind GET search/?trip=&query=, biased to the lodging; 502 when Google fails.
- Google Geocoding v4 inside lodging PUT + activity POST/PUT; server key GOOGLE_MAPS_SERVER_KEY with Geocoding + Places (New) enabled (added to .env.example).
- 51 new tests in tests/ (CI path); Google mocked (requests.get + requests.post).

Known gaps (by design, Phase 1): no membership scoping yet — any logged-in user can read/edit/delete/vote any activity by id, the same omission as trips/groups today; group_app's Group.auth_user M2M makes it a one-filter change when we tighten all three together. Vote race is covered: `get_or_create` catches the unique-constraint `IntegrityError` and re-fetches, so the loser gets the 409. Migrations: activities_app/0002 is stacked on the 0001 that shipped with PR #102 (old model shape) — dev databases that applied a locally generated activities_app migration before #102 need `docker compose down -v` once; a DB with no activities_app history just migrates.
EOF
gh pr checks --watch
```

- Macro: the PR exists against a branch CI listens to, and CI runs the same `python manage.py test tests` you ran in Step 9.
- Micro: `--body-file -` reads the PR body from stdin, which the heredoc supplies; `gh pr checks --watch` polls the checks until they finish.
- Expected: `gh pr create` prints the PR URL; `backend-tests` goes green.

**Frontend hand-off (not your files; the backend contract is dead without them).** Send to Mohamed/Simon/Abdel:

1. `frontend/src/utilities.js` uses an ABSOLUTE `http://localhost:8000/api/` baseURL with no `withCredentials` and no XSRF header: every activities call will 401 (no cookie sent), every write 403 (no `X-CSRFToken`), and on EC2 the browser would call the viewer's own laptop. Replace it with the `services/client.js` shape:

```js
import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1/",
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

export default api;
```

   (plus the same 401→refresh interceptor `client.js` has, or import `client` and drop the users prefix).
2. Paths in `TripPage.jsx`: ``api.get(`activities/?trip=${tripId}`)``; `api.post("activities/", { ...payload, trip: Number(tripId) })`; keep ``api.patch(`activities/${id}/`)``, ``api.delete(`activities/${id}/`)``, and the `activities/${id}/vote/` POST/DELETE. `trips/${tripId}/` stays Cody's.
3. Response key is `trip` (an id), not the `trip_id` the mock objects use.
4. Map pins: use `activity.latitude` / `activity.longitude` (numbers, or `null` when no location) — no per-pin Places lookup. Center the map on the lodging (item 9).
5. The vote POST returns the fresh activity — replace the local `vote_count ± 1` / `!has_voted` toggle with the response body; on 409 just refetch.
6. `ActivityCard`'s label `place_id ? "via Google Places" : "manual address"` is wrong once a manual entry gets Google's `place_id`; key it on `formatted_address` or drop it.
7. `App.jsx` imports `./components/Navbar/NavBar` but the folder is `components/NavBar` — fine on macOS, fails the Linux docker build.
8. Keep the browser key (`VITE_GOOGLE_MAPS_API_KEY`) HTTP-referrer restricted and separate from `GOOGLE_MAPS_SERVER_KEY`. It now needs only Maps JS (plus Places Autocomplete if the lodging form uses the widget); the browser-side `searchText` code goes away.
9. Lodging: on Trip Detail load, ``api.get(`activities/lodging/${tripId}/`)`` — a 404 means "not set yet", render the "Where are you staying?" form; ``api.put(`activities/lodging/${tripId}/`, { name, street, city, state, zip, country })`` or `{ name, place_id }` from an Autocomplete pick. Center the map on `lodging.latitude` / `lodging.longitude`, with activity pins around it.
10. Search: a text box + a **button** → ``api.get(`activities/search/?trip=${tripId}&query=${q}&radius_m=3000`)`` — button-triggered, never per keystroke (30 req/min throttle, and every call is billed). Render the hits as a pick list; on pick, `api.post("activities/", { trip: Number(tripId), name: hit.name, place_id: hit.place_id, cost_estimate_cents })` — no lat/lng in the body, the server geocodes the id. A 400 `Set where the group is staying first` means show the lodging form; a 502 means "Google is having a moment, try again".

## Dependencies outside this app

**`trip_app.Trip` (merged, PR #102):** `Trip(name, city, state, country)` — each `CharField(60)`, none optional; `trip_app/0001` + `0002` shipped; `CreateTrip` (`POST /api/v1/trips/create/`) also creates the trip's `Group` with the creator as its first member; `TripById` (`GET/PUT/DELETE /api/v1/trips/<trip_id>/`) is `IsAuthenticated` with no membership check — Cody's own note in `Backend.md` says "worth tightening later". This plan depends on `Trip` only through the FK, the `Trip.objects` lookups, and `make_trip()` in the tests (which passes all four fields). Nothing in models/views/serializers changes when trips change.

**`group_app.Group` (merged, PR #102) — read this before Phase 2.** `Group.trip = OneToOneField(Trip, related_name="group")`, `Group.auth_user = ManyToManyField(Auth_User, related_name="user_trip_groups")`. One group per trip; a member is a row in the M2M through table. It is **not** the ERD's shape (`ERD.sql:48-61`: a group has many trips, a membership carries `read_access` / `write_access` / `is_leader`). README:62 says the ERD and the code move together; which one moves is the `groups` epic owner's decision, not this plan's (Open decisions #17). Phase 2 below is written against the code that exists.

**Phase 2 — membership scoping, when the team decides to close the gap on all three apps at once** (Cody's trip and group endpoints are open by the same omission; closing activities alone gives a false sense of coverage). No permission class — the condition goes into the lookup so strangers answer 404, exactly like CJs's `user=request.user`:

```python
#helper - activities on trips I am a member of (strangers answer 404)
def retrieve_activity(self, request, id):
    return get_object_or_404(
        Activity.objects.select_related("geocode"),
        id=id,
        trip__group__auth_user=request.user,
    )
```

List and search: `trip = get_object_or_404(Trip.objects.filter(group__auth_user=request.user), id=trip_id)`. Lodging GET/DELETE: `get_object_or_404(Lodging, trip_id=trip_id, trip__group__auth_user=request.user)`; lodging PUT uses the scoped `Trip` lookup. There is no `write_access` in Cody's model, so member = reader = writer until the ERD question is settled. One filter, not two: the M2M through table is unique on `(group, user)`, so the JOIN cannot duplicate rows. The tests then need a `Group` row plus `group.auth_user.add(self.user)` in `ActivityTestCase.setUp` (`Trip.objects.create` does not make a group — only `CreateTrip` does) and one "stranger gets 404" test per view — the CJs `rfqs/tests.py:test_01` shape.

**`auth_user_app`:** `Auth_User` (custom, `USERNAME_FIELD = "username"`) is referenced only through `settings.AUTH_USER_MODEL`. Out-of-scope defect found while verifying: `python manage.py createsuperuser` raises `TypeError` because `create_superuser(self, email, username, ...)` requires `email` but `REQUIRED_FIELDS = []` never supplies it (Step 4 has the shell workaround).

**Settings:** no `DEFAULT_PERMISSION_CLASSES` → every view must carry the base class. `group_app` is in `INSTALLED_APPS` since the merge. Throttling (`user 30/min`) already caps Google spend at 30 calls per user per minute across geocoding and search; PATCH edits of name/description/cost never call Google. Throttle counters live in Redis — the compose `redis` service must be up for `runserver` (tests patch the throttle and never touch it).

## Final endpoint table

| Method | Path | Auth | Body / params | Responses |
|---|---|---|---|---|
| GET | `/api/v1/activities/?trip=<id>` | cookie JWT | `trip` query param (int) | 200 list; 400 `{"error": "trip query param is required"}`; 401 no cookie; 404 unknown trip |
| POST | `/api/v1/activities/` | cookie JWT + `X-CSRFToken` | `trip` (int, required), `name` (required), `description`, `cost_estimate_cents` (int ≥ 0, default 0), `street`, `city`, `state`, `zip`, `country` (all optional), `place_id` (optional; `''` = manual) | 201 activity; 400 field errors (`{"trip": [...]}`, `{"cost_estimate_cents": [...]}`) or `{"error": "Address could not be geocoded"}`; 401; 403 CSRF |
| GET | `/api/v1/activities/<id>/` | cookie JWT | — | 200 activity; 401; 404 |
| PUT, PATCH | `/api/v1/activities/<id>/` | cookie JWT + `X-CSRFToken` | any subset of the POST fields; `trip` must equal the current trip | 200 activity (re-read); 400 field errors or `{"error": "trip cannot be changed"}`; 401; 403; 404 |
| DELETE | `/api/v1/activities/<id>/` | cookie JWT + `X-CSRFToken` | — | 204 empty; 401; 403; 404 |
| POST | `/api/v1/activities/<id>/vote/` | cookie JWT + `X-CSRFToken` | — | 201 activity (fresh `vote_count`/`has_voted`); 409 `{"error": "You already voted for this activity."}`; 401; 403; 404 |
| DELETE | `/api/v1/activities/<id>/vote/` | cookie JWT + `X-CSRFToken` | — | 204 empty; 401; 403; 404 (no vote of yours) |
| GET | `/api/v1/activities/lodging/<trip_id>/` | cookie JWT | — | 200 lodging; 401; 404 (unknown trip OR not set yet) |
| PUT | `/api/v1/activities/lodging/<trip_id>/` | cookie JWT + `X-CSRFToken` | `name` (optional) and either `place_id` or any of `street/city/state/zip/country`; always geocodes; replace, not merge | 201 lodging (first set) / 200 lodging (replaced); 400 field errors, `{"error": "Provide a place_id or an address"}` or `{"error": "Address could not be geocoded"}` (no row written); 401; 403; 404 unknown trip |
| DELETE | `/api/v1/activities/lodging/<trip_id>/` | cookie JWT + `X-CSRFToken` | — | 204 empty; 401; 403; 404 |
| GET | `/api/v1/activities/search/` | cookie JWT | `trip` (int, required), `query` (required), `radius_m` (default 5000, clamped ≤ 50000), `min_rating` (0–5, 0.5 steps), `max_results` (default 10, clamped ≤ 20) | 200 list of `{place_id, name, formatted_address, latitude, longitude}` (may be empty); 400 missing/non-numeric params or `{"error": "Set where the group is staying first"}`; 401; 404 unknown trip; 502 `{"error": "Place search failed"}` |

Activity JSON shape (all endpoints): `id, trip, name, description, street, city, state, zip, country, place_id, cost_estimate_cents, latitude, longitude, formatted_address, vote_count, has_voted, created_at, updated_at`. `latitude`/`longitude` are numbers or `null`; `place_id` is `''` when there is no location.

Lodging JSON shape: `id, trip, name, street, city, state, zip, country, place_id, latitude, longitude, formatted_address, created_at, updated_at` — `latitude`/`longitude` are always numbers (a lodging without a pin is never written).

## Works now, breaks at scale

- **2N+3 on the list.** `vote_count` and `has_voted` cost two queries per activity on top of the JWT user lookup, the trip lookup and the activities⋈geocode SELECT; 20 activities ≈ 43 queries per page load (Step 7 shows the ledger). The `annotate` upgrade brings it to 3. The upgrade, inside the README's own `annotate` contract but beyond CJs (`annotate`/`Exists`/`OuterRef` appear nowhere in CJs):

```python
from django.db.models import Count, Exists, OuterRef

activities = (
    Activity.objects.select_related("geocode")
    .filter(trip=trip)
    .annotate(
        vote_count=Count("votes", distinct=True),
        has_voted=Exists(ActivityVote.objects.filter(activity=OuterRef("pk"), user=request.user)),
    )
)
```

  with the two serializer fields becoming `serializers.IntegerField(read_only=True)` / `serializers.BooleanField(read_only=True)`. Two traps: any model `@property` named `vote_count` must be gone first (annotations are set with `setattr`; a read-only property raises), and every re-serialization after `save()` must re-fetch through the annotated queryset or DRF omits the fields. `distinct=True` becomes mandatory the day the membership JOIN lands or `Count` multiplies by memberships.
- **Synchronous Google call in the request** with a 5 s timeout holds a gunicorn worker; at scale it moves to a queue with a "pending pin" state.
- **Vote race is covered:** `get_or_create` runs its INSERT inside `transaction.atomic`, catches the unique-constraint `IntegrityError` and re-fetches, so the loser gets the 409 (verified against Django 6.1's `QuerySet.get_or_create`). Nothing to add.
- **Unpaginated list.** Fine per trip; add DRF pagination if trips ever hold hundreds of activities.
- **`IntegerField` without a DB CHECK** — a shell write can store a negative cost.
- **Re-geocode on every address edit** (activities and the lodging) is a billed call; the throttle bounds it at 30/user/min.
- **Every search is a billed Text Search call** (Pro SKU with this field mask; Enterprise if `rating`/`priceLevel` are ever added). The endpoint is button-triggered by contract; wire it to keystrokes and one user typing "pizza" costs five calls and burns their 30/min throttle. If volume grows, cache `(trip, query, radius)` → results for a few minutes in the Redis you already run — `django.core.cache` is one import, and CACHES is already configured.

## Deviations ledger (own each in one sentence)

| # | This plan does | CJs / ERD / spec does | Why |
|---|---|---|---|
| 1 | `APIView` subclasses only | current app uses DRF generics (CJs never does) | Return to the curriculum ceiling; one explicit method per verb. |
| 2 | `models.UniqueConstraint` on votes | CJs uses `OneToOneField` for uniqueness | A vote is a (user, activity) pair; OneToOne cannot express it; ERD.sql:85 demands it. |
| 3 | 409 on duplicate vote | CJs vocabulary stops at 404 (duplicate = serializer 400) | Spec line 86; `s.HTTP_409_CONFLICT` exists; one owned status. |
| 4 | `patch()` aliases `put()` | CJs has no `patch` anywhere | The merged frontend calls PATCH; `put` is already partial. |
| 5 | `#helper` on the base class | CJs puts it on the detail class | Two views share one model here. |
| 6 | Re-read the row before the PUT response | CJs serializes the in-memory instance | Our helper's `select_related("geocode")` (#19) pre-fills the cache; after `update_or_create`/`delete` it is stale. CJs's un-cached instance re-queries, so it needs no re-read. |
| 7 | `update_fields=["place_id", "updated_at"]` | CJs never uses `update_fields` | `auto_now` only writes when listed. |
| 8 | Unstructured Geocoding URL for manual entry | CJs sends structured `address.*` with `regionCode="US"` | The frontend sends free-text country; v4's structured form requires an ISO code it "never infers". |
| 9 | `os.environ[...]` outside the `try` | CJs `os.environ.get` inside | requests drops a `None` header; a missing key would masquerade as a bad address. |
| 10 | `TypeError`/`ValueError` in the except | CJs catches `RequestException, KeyError` | `"location": null` should be a 400, not a 500. |
| 11 | `place_id` on `Activity` | CJs stores it on the geocode row | ERD.sql:40 and the frontend read it on the activity; still read-only and server-written. |
| 12 | `activity_geocodes` table + timestamps | ERD has neither | README:209 needs lat/long; CJs pattern; three docs updated together. |
| 13 | No `created_by`, no `location` | current model has both; CJs has an owner FK | Not in ERD; ownership is membership, not creator. |
| 14 | Flat `?trip=<id>` list at `api/v1/activities/` | spec proposes nested `/api/trips/<tid>/activities/` | CJs idiom; nested route belongs in Cody's unmounted `trip_app/urls.py`. |
| 15 | Blanking the address drops the pin | CJs's address is required | README makes it optional; a stale pin with no error is the "silent wrong pin" CJs warns about. |
| 16 | `country` free text, no ZIP validator | CJs `state` is 2 chars, ZIP regex US-only | Travel app; the frontend sends `"United States"`. |
| 17 | `APITestCase` + `UnthrottledAPITestCase`, tests in `tests/` | CJs `django.test.TestCase` + `Client`, tests in the app | Throttling + Redis + CI's `test tests` command. |
| 18 | `LOCATION_FIELDS` module constant | CJs inlines `address_fields` in `put` | Used in two methods. |
| 19 | `select_related` inside the helper | CJs's helper is a bare `get_object_or_404(Model, ...)` | Detail GET and every PUT re-read cost one query for the pin; the price is #6. |
| 20 | Helper kwarg and body key `place_id` | CJs `google_place_id` | The merged frontend already posts `place_id` (`''` for manual); same falsy contract. |
| 21 | `?trip=` is required (400 if missing) | CJs `?island=` is an optional filter | Without a trip the list has no scope; a path `<int>` would have guarded it for free. |
| 22 | `urllib.parse.quote`; `mock.patch.dict` / `call_args` / `assert_not_called`; `resp.data` | CJs: none of these | stdlib + the same mock library; needed by the unstructured URL and the loud `KeyError`; `resp.data` is `APITestCase`'s parsed body (see #17). |
| 23 | Empty `GOOGLE_MAPS_SERVER_KEY` raises | CJs would send the empty header and 400 | `.env.example` ships the empty value; the state every fresh clone is in must be loud. |
| 24 | `Lodging` pin fields on the row | activities keep a separate geocode table (#12) | A lodging without a pin cannot exist; a side table would model a case that never happens. |
| 25 | Lodging `PUT` = replace (`update_or_create` from `defaults`), `201` / `200` | CJs `put` is partial and always `200` | One location per trip; a merge leaves stale address text under a new pin; `created` is free. |
| 26 | `search_places` + `FindActivities` + `502` | CJs never proxied a second Google API | Dom's spec (c); the helper copies `geocode_address`'s contract; `502` is Google's failure, not the user's. |
| 27 | No lodging → search answers `400` | — | The lodging is the center by product decision; arbitrary `lat`/`lng` is a two-line addition. |
| 28 | `_api_key()` shared helper | CJs inlines `os.environ.get` in its one function | Two callers of one key; the loud check must not drift between them. |
| 29 | `default=""` on six Activity columns | CJs's optional CharFields have no default | `0002` adds them to a table that already exists on `dev`; Django refuses a NOT NULL `AddField` without a value, and the prompt writes a lying migration. |

## Open decisions for the team

1. **Migrations** (Step 0): Cody's `activities_app/0001` shipped in PR #102 and stays; this plan stacks `0002`. Before the PR to `main`, decide whether to squash `0001` + `0002` into one — only possible if production has never applied `0001` (check `django_migrations` on EC2).
2. **Route shape**: flat `?trip=<id>` under `/api/v1/activities/` (this plan) vs the proposed nested `/api/trips/<tid>/activities/`. Either way the frontend rewires; the nested form needs `trip_app/urls.py` mounted first.
3. **PATCH or PUT** for edits in the spec — the view serves both; pick one for the doc and the frontend.
4. **Places Text Search is server-side** (Dom's call, this plan): the frontend's browser-side `searchText` code (`TripPage.jsx`'s `flattenPlace`) is replaced by the `search/` endpoint, and the browser key drops the Places Text Search restriction. Remaining choice: whether to add `places.rating` / `places.priceLevel` to the field mask for the UI — that moves billing from the Pro to the Enterprise SKU.
5. **`DEFAULT_PERMISSION_CLASSES = ["rest_framework.permissions.IsAuthenticated"]`** project-wide (Cody's `settings.py`), with `permission_classes = []` on `Sign_Up`, `Log_in`, `TokenRefresh` — three apps by three authors is where "open by omission" stops being safe.
6. **Google Cloud ownership**: whose project holds the server key, who sets the IP restriction for EC2, and where the value lives for deploy (not in git).
7. **Phase 2 timing** — `group_app` exists (`Group.trip` OneToOne, `Group.auth_user` M2M), so the scoping filter is known: `trip__group__auth_user=request.user`. The decision is *when*: this plan leaves activities open because trips and groups are open by the same omission; tighten all three in one PR.
8. **`trip` immutable on PUT** (this plan) vs re-parenting with a membership re-check (CJs rfqs pattern) once memberships exist.
9. **409 vs 400** for the duplicate vote — 409 is the spec; CJs precedent is 400.
10. **Move `UnthrottledAPITestCase` to `tests/base.py`** so test modules stop importing from a sibling test file.
11. **ERD naming**: keep `zip` (this plan, matches ERD + frontend) or rename to `zip_code` (CJs); keep the added timestamps on `activities` or drop them from the model to match the original ERD.
12. **`createsuperuser` defect** in `AuthUserManager.create_superuser` — Cody's app; needs `email` in `REQUIRED_FIELDS` or a keyword-tolerant signature.
13. **Trip votes' `my_vote`** — APIendpoints-revised.md lines 12, 24, 59 and 139 keep `my_vote` for trips after Step 11; the trips owner decides whether trips follow activities to `has_voted` (the frontend's `TripsPage.jsx` already reads `has_voted`).
14. **Lodging persisted vs stateless** — this plan stores one `Lodging` row per trip (ERD addition, Step 11). The stateless alternative (a `GET find_coords/` that returns coordinates the browser holds, per the original spec) is smaller but makes every member re-type the Airbnb address on every visit and gives the map no center to remember. Confirm with the team before Step 3, because it is a table.
15. **Where the lodging lives** — its own table in `activities_app` (this plan; no edits to `trip_app`) vs columns on `Trip` (Cody's model — a `trip_app/0003` in his app, and a trip row with nine nullable address/pin columns). Decide with Cody alongside #1.
16. **Search radius default** — 5 km (this plan) vs the original spec's 5 mi ≈ 8,047 m. A query param either way; the default is what the UI sends when the user does not choose.
17. **`group_app.Group` vs `ERD.sql`** — the merged code has one `Group` per trip with an M2M of members and no permissions; the ERD has groups that own many trips and memberships with `read_access` / `write_access` / `is_leader`. README:62 says they move together. The `groups` epic owner decides which one moves; Phase 2's scoping expression (Dependencies) follows whichever wins.
