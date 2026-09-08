DC = docker compose -f docker-compose.prod.yml

.PHONY: \
	prod down rebuild restart ps logs \
	backend-bash backend-logs backend-restart backend-rebuild backend-recreate \
	frontend-bash frontend-logs frontend-restart frontend-rebuild frontend-recreate \
	db-logs redis-logs \
	makemigrations migrate showmigrations superuser check shell \
	allowed-hosts env


# =========================================================
# Production
# =========================================================

# Build and start everything
prod:
	$(DC) up -d --build

# Stop everything
down:
	$(DC) down

# Rebuild everything
rebuild:
	$(DC) up -d --build

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

frontend-rebuild:
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