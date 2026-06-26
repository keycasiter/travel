API_DIR := apps/api
MINI_DIR := apps/miniprogram

.PHONY: migrate-up migrate-down api-test api-run api-seed mini-install mini-check verify

migrate-up:
	set -a; . ./.env; set +a; migrate -path $(API_DIR)/migrations -database "mysql://$${MYSQL_DSN}" up

migrate-down:
	set -a; . ./.env; set +a; migrate -path $(API_DIR)/migrations -database "mysql://$${MYSQL_DSN}" down 1

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
