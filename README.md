# Travel Miniprogram

Local runnable MVP for a China domestic travel guide WeChat Mini Program.

## Local Requirements

- Go 1.22+
- MySQL 8.0+
- Node.js 20+
- WeChat Developer Tools

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

## MVP Verification

Run automated checks:

```bash
make api-test
make mini-check
```

Verify the local data/API path:

```bash
cp .env.example .env
make migrate-up
make api-seed
make api-run
```

Smoke check in another terminal:

```bash
curl -s http://127.0.0.1:8080/healthz
curl -s "http://127.0.0.1:8080/api/v1/regions?level=city"
curl -s -H "X-User-ID: 1" -H "Content-Type: application/json" \
  -d '{"destinationRegionId":"city-hangzhou","days":2,"preferences":["城市漫步"]}' \
  http://127.0.0.1:8080/api/v1/itineraries/generate
```

Manual Mini Program flow:

- Open `apps/miniprogram` in WeChat Developer Tools.
- Verify Explore shows the ink map and loads city hotspots when the API is running.
- Tap a city hotspot and verify the bottom sheet lists services, POIs, and guides.
- Switch to Itinerary, generate a 2-day Hangzhou itinerary, mark an item done, add a note, and create a share.
- Open the share page with the generated `shareCode` and copy it as an independent itinerary.

## Project Docs

- Product design: `docs/superpowers/specs/2026-06-26-travel-miniprogram-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-26-travel-miniprogram-implementation.md`
