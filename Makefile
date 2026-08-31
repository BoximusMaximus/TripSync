.PHONY: dev dev-down prod prod-down logs backend frontend

dev:
	docker compose up --build

dev-down:
	docker compose down

prod:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

logs:
	docker compose logs -f

backend:
	docker compose exec backend bash

frontend:
	docker compose exec frontend sh