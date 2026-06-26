API_DIR := apps/api
MINI_DIR := apps/miniprogram

.PHONY: migrate-up migrate-down api-test api-run api-seed mini-install mini-check verify

migrate-up:
	cd $(API_DIR) && go run ./cmd/migrate --direction up --path migrations

migrate-down:
	cd $(API_DIR) && go run ./cmd/migrate --direction down --steps 1 --path migrations

api-test:
	cd $(API_DIR) && go test ./...

api-run:
	cd $(API_DIR) && go run ./cmd/api

api-seed:
	cd $(API_DIR) && go run ./cmd/seed --seed-dir ../../data/seeds

mini-install:
	cd $(MINI_DIR) && npm install

mini-check:
	cd $(MINI_DIR) && npm run typecheck

verify: api-test mini-check
