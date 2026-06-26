# Travel Miniprogram

Local runnable MVP for a China domestic travel guide WeChat Mini Program.

## Local Requirements

- Go 1.22+
- MySQL 8.0+
- Node.js 20+
- WeChat Developer Tools
- `migrate` CLI from `golang-migrate`

## Workspace

```text
apps/api          Go API service
apps/miniprogram  Native WeChat Mini Program
data/seeds        Official seed content
packages/shared   Shared OpenAPI contract and generated assets
```

## Initial Setup

```bash
cp .env.example .env
make mini-install
```

## Database

Create the local MySQL 8.0 database:

```sql
CREATE DATABASE travel_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'travel'@'localhost' IDENTIFIED BY 'travel';
GRANT ALL PRIVILEGES ON travel_app.* TO 'travel'@'localhost';
FLUSH PRIVILEGES;
```

Run migrations and import official seed content:

```bash
make migrate-up
make api-seed
```

## API

Start the Go API:

```bash
make api-run
```

Smoke checks:

```bash
curl -s http://127.0.0.1:8080/healthz
curl -s "http://127.0.0.1:8080/api/v1/regions?level=city"
```

OpenAPI contract:

```text
packages/shared/openapi.yaml
```

## Mini Program

Install dependencies and run TypeScript checks:

```bash
make mini-install
make mini-check
```

Open `apps/miniprogram` in WeChat Developer Tools.

## Project Docs

- Product design: `docs/superpowers/specs/2026-06-26-travel-miniprogram-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-26-travel-miniprogram-implementation.md`
