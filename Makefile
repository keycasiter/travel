API_DIR := apps/api
MINI_DIR := apps/miniprogram

.PHONY: dev-mysql-init dev-mysql-start dev-mysql-stop dev-mysql-status dev-mysql-dsn migrate-up migrate-down api-test api-run api-seed mini-install mini-check verify

dev-mysql-init:
	scripts/dev-mysql.sh init

dev-mysql-start:
	scripts/dev-mysql.sh start
	scripts/dev-mysql.sh create-user

dev-mysql-stop:
	scripts/dev-mysql.sh stop

dev-mysql-status:
	scripts/dev-mysql.sh status

dev-mysql-dsn:
	scripts/dev-mysql.sh dsn

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
