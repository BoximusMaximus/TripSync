# One env file drives the whole deploy: backend/.env feeds the containers (env_file:) AND the
# ${VAR} interpolation in docker-compose.prod.yml (--env-file), e.g. the frontend's build arg.
DC = docker compose --env-file backend/.env -f docker-compose.prod.yml

.PHONY: \
	check-env deploy prod down rebuild restart ps logs \
	backend-bash backend-logs backend-restart backend-rebuild backend-recreate \
	frontend-bash frontend-logs frontend-restart frontend-rebuild frontend-recreate \
	db-logs redis-logs \
	makemigrations migrate showmigrations superuser check shell \
	allowed-hosts env


# =========================================================
# Production
# =========================================================

# Fail early. The browser key is baked into the frontend bundle at build time - without it the
# map ships as a placeholder; without the server key geocoding and place search answer 500.
check-env:
	@grep -qE '^VITE_GOOGLE_MAPS_API_KEY=.+' backend/.env || (echo "VITE_GOOGLE_MAPS_API_KEY is missing or empty in backend/.env - the map would ship as a placeholder" && exit 1)
	@grep -qE '^GOOGLE_MAPS_SERVER_KEY=.+' backend/.env || (echo "GOOGLE_MAPS_SERVER_KEY is missing or empty in backend/.env - geocoding and place search would fail" && exit 1)

# The one command for a redeploy: pull main, rebuild every image, start, migrate
deploy: check-env
	git pull --ff-only
	$(DC) up -d --build
	$(DC) exec backend python manage.py migrate --noinput

# Build and start everything, then apply migrations
prod: check-env
	$(DC) up -d --build
	$(DC) exec backend python manage.py migrate --noinput

# Stop everything
down:
	$(DC) down

# Rebuild everything, then apply migrations
rebuild: check-env
	$(DC) up -d --build
	$(DC) exec backend python manage.py migrate --noinput

# Restart everything without rebuilding
restart:
	$(DC) restart

# Show container status
ps:
	$(DC) ps

# Follow all logs
logs:
	$(DC) logs -f


# =========================================================
# Backend
# =========================================================

backend-bash:
	$(DC) exec backend bash

backend-logs:
	$(DC) logs backend --tail=50

backend-restart:
	$(DC) restart backend

backend-rebuild:
	$(DC) up -d --build backend
	$(DC) exec backend python manage.py migrate --noinput

backend-recreate:
	$(DC) up -d --force-recreate backend


# =========================================================
# Frontend
# =========================================================

frontend-bash:
	$(DC) exec frontend sh

frontend-logs:
	$(DC) logs frontend --tail=50

frontend-restart:
	$(DC) restart frontend

frontend-rebuild: check-env
	$(DC) up -d --build frontend

frontend-recreate:
	$(DC) up -d --force-recreate frontend


# =========================================================
# Database / Redis
# =========================================================

db-logs:
	$(DC) logs db --tail=50

redis-logs:
	$(DC) logs redis --tail=50


# =========================================================
# Django
# =========================================================

makemigrations:
	$(DC) exec backend python manage.py makemigrations

migrate:
	$(DC) exec backend python manage.py migrate

showmigrations:
	$(DC) exec backend python manage.py showmigrations

superuser:
	$(DC) exec backend python manage.py createsuperuser

check:
	$(DC) exec backend python manage.py check

shell:
	$(DC) exec backend python manage.py shell


# =========================================================
# Environment / Debugging
# =========================================================

allowed-hosts:
	$(DC) exec backend env | grep ALLOWED_HOSTS

env:
	$(DC) exec backend env
