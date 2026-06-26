# Travel Miniprogram MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local runnable MVP from `docs/superpowers/specs/2026-06-26-travel-miniprogram-design.md`: native WeChat Mini Program frontend, Go/Gin API, MySQL schema, seed import, content exploration, itinerary generation/editing/execution, favorites, and read-only share-copy flow.

**Architecture:** Use a monorepo with `apps/api` for the Go service, `apps/miniprogram` for the native TypeScript Mini Program, `data/seeds` for official content, and `packages/shared` for OpenAPI/types. Implement a vertical slice first with 2 seed cities, then expand the same data model to all 8 cities.

**Tech Stack:** Go 1.22, Gin, GORM, MySQL 8.0, golang-migrate SQL migrations, REST JSON, OpenAPI 3.0, native WeChat Mini Program + TypeScript, npm TypeScript check for the frontend.

---

## File Structure

Create this structure:

```text
.
├── README.md
├── Makefile
├── .env.example
├── apps
│   ├── api
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── cmd
│   │   │   ├── api
│   │   │   │   └── main.go
│   │   │   └── seed
│   │   │       └── main.go
│   │   ├── internal
│   │   │   ├── app
│   │   │   │   ├── app.go
│   │   │   │   └── routes.go
│   │   │   ├── auth
│   │   │   │   ├── handler.go
│   │   │   │   └── service.go
│   │   │   ├── config
│   │   │   │   └── config.go
│   │   │   ├── content
│   │   │   │   ├── handler.go
│   │   │   │   ├── repository.go
│   │   │   │   └── repository_test.go
│   │   │   ├── database
│   │   │   │   └── database.go
│   │   │   ├── favorite
│   │   │   │   ├── handler.go
│   │   │   │   └── repository.go
│   │   │   ├── httpx
│   │   │   │   ├── response.go
│   │   │   │   └── middleware.go
│   │   │   ├── itinerary
│   │   │   │   ├── generator.go
│   │   │   │   ├── generator_test.go
│   │   │   │   ├── handler.go
│   │   │   │   ├── repository.go
│   │   │   │   └── share_test.go
│   │   │   ├── model
│   │   │   │   └── models.go
│   │   │   ├── seed
│   │   │   │   ├── importer.go
│   │   │   │   └── importer_test.go
│   │   │   └── weather
│   │   │       └── handler.go
│   │   └── migrations
│   │       ├── 000001_init.up.sql
│   │       └── 000001_init.down.sql
│   └── miniprogram
│       ├── app.json
│       ├── app.ts
│       ├── app.wxss
│       ├── package.json
│       ├── project.config.json
│       ├── sitemap.json
│       ├── tsconfig.json
│       ├── components
│       │   ├── bottom-sheet
│       │   │   ├── index.json
│       │   │   ├── index.ts
│       │   │   ├── index.wxml
│       │   │   └── index.wxss
│       │   └── ink-map
│       │       ├── index.json
│       │       ├── index.ts
│       │       ├── index.wxml
│       │       └── index.wxss
│       ├── pages
│       │   ├── explore
│       │   │   ├── index.json
│       │   │   ├── index.ts
│       │   │   ├── index.wxml
│       │   │   └── index.wxss
│       │   ├── itinerary
│       │   │   ├── index.json
│       │   │   ├── index.ts
│       │   │   ├── index.wxml
│       │   │   └── index.wxss
│       │   ├── favorite
│       │   │   ├── index.json
│       │   │   ├── index.ts
│       │   │   ├── index.wxml
│       │   │   └── index.wxss
│       │   ├── mine
│       │   │   ├── index.json
│       │   │   ├── index.ts
│       │   │   ├── index.wxml
│       │   │   └── index.wxss
│       │   └── share
│       │       ├── index.json
│       │       ├── index.ts
│       │       ├── index.wxml
│       │       └── index.wxss
│       └── utils
│           ├── api.ts
│           ├── config.ts
│           └── types.ts
├── data
│   └── seeds
│       ├── regions.json
│       ├── services.json
│       ├── pois.json
│       ├── guides.json
│       └── weather.json
└── packages
    └── shared
        └── openapi.yaml
```

## Task 1: Repository Tooling And Environment Contract

**Files:**
- Create: `README.md`
- Create: `Makefile`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `apps/api/go.mod`
- Create: `apps/miniprogram/package.json`
- Create: `apps/miniprogram/tsconfig.json`

- [ ] **Step 1: Add environment contract**

Create `.env.example` with:

```env
APP_ENV=local
HTTP_ADDR=:8080
MYSQL_DSN=travel:travel@tcp(127.0.0.1:3306)/travel_app?charset=utf8mb4&parseTime=True&loc=Local
WECHAT_APP_ID=local-dev-app-id
WECHAT_APP_SECRET=local-dev-app-secret
```

Extend `.gitignore` with:

```gitignore
.env
.superpowers/
apps/api/tmp/
apps/api/bin/
apps/miniprogram/miniprogram_npm/
apps/miniprogram/node_modules/
```

- [ ] **Step 2: Add root commands**

Create `Makefile` with:

```makefile
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
```

- [ ] **Step 3: Initialize Go module**

Create `apps/api/go.mod` with:

```go
module travel/apps/api

go 1.22

require (
	github.com/gin-gonic/gin v1.10.0
	github.com/go-sql-driver/mysql v1.8.1
	github.com/google/uuid v1.6.0
	gorm.io/driver/mysql v1.5.7
	gorm.io/driver/sqlite v1.5.7
	gorm.io/datatypes v1.2.0
	gorm.io/gorm v1.25.12
)
```

Run:

```bash
cd apps/api && go mod tidy
```

Expected: `go.sum` is created and command exits 0.

- [ ] **Step 4: Initialize Mini Program TypeScript check**

Create `apps/miniprogram/package.json` with:

```json
{
  "name": "travel-miniprogram",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "miniprogram-api-typings": "^4.0.5",
    "typescript": "^5.5.4"
  }
}
```

Create `apps/miniprogram/tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "noImplicitAny": true,
    "types": ["miniprogram-api-typings"],
    "typeRoots": ["./node_modules/@types", "./node_modules/miniprogram-api-typings"]
  },
  "include": ["./**/*.ts"]
}
```

Run:

```bash
cd apps/miniprogram && npm install
```

Expected: `package-lock.json` is created and command exits 0. Run TypeScript verification after Task 9 creates Mini Program source files.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example Makefile README.md apps/api/go.mod apps/api/go.sum apps/miniprogram/package.json apps/miniprogram/package-lock.json apps/miniprogram/tsconfig.json
git commit -m "chore: initialize travel app workspace"
```

## Task 2: MySQL Schema And Domain Models

**Files:**
- Create: `apps/api/migrations/000001_init.up.sql`
- Create: `apps/api/migrations/000001_init.down.sql`
- Create: `apps/api/internal/model/models.go`
- Create: `apps/api/internal/config/config.go`
- Create: `apps/api/internal/database/database.go`

- [ ] **Step 1: Write schema migration**

Create `apps/api/migrations/000001_init.up.sql` with tables:

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  nickname VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE regions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  level VARCHAR(32) NOT NULL,
  parent_id VARCHAR(64) NULL,
  center_lat DECIMAL(10, 6) NOT NULL,
  center_lng DECIMAL(10, 6) NOT NULL,
  bounds_json JSON NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_regions_parent (parent_id),
  INDEX idx_regions_level_enabled (level, enabled)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE travel_services (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  tips JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_services_region_type (region_id, type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE pois (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  tags JSON NOT NULL,
  duration_minutes INT NOT NULL,
  cost_level INT NOT NULL,
  hot_score INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_pois_region_type (region_id, type),
  INDEX idx_pois_hot_score (hot_score)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE guides (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  tags JSON NOT NULL,
  cover_url VARCHAR(512) NOT NULL,
  official BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_guides_region (region_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itineraries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  destination_region_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  days INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  budget_cents INT NOT NULL DEFAULT 0,
  share_code VARCHAR(32) NULL UNIQUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_itineraries_user (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itinerary_days (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  itinerary_id BIGINT UNSIGNED NOT NULL,
  day_index INT NOT NULL,
  date DATE NULL,
  summary VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_itinerary_day (itinerary_id, day_index)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itinerary_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_id BIGINT UNSIGNED NOT NULL,
  poi_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL,
  start_hint VARCHAR(64) NOT NULL,
  duration_minutes INT NOT NULL,
  transport_hint VARCHAR(255) NOT NULL,
  note TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_itinerary_items_day (day_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE favorites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_favorite_target (user_id, target_type, target_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE share_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  share_code VARCHAR(32) NOT NULL UNIQUE,
  source_itinerary_id BIGINT UNSIGNED NOT NULL,
  itinerary_snapshot JSON NOT NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE weather_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL UNIQUE,
  summary VARCHAR(255) NOT NULL,
  temperature_range VARCHAR(64) NOT NULL,
  tips JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create `apps/api/migrations/000001_init.down.sql` with:

```sql
DROP TABLE IF EXISTS weather_summaries;
DROP TABLE IF EXISTS share_snapshots;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS itinerary_items;
DROP TABLE IF EXISTS itinerary_days;
DROP TABLE IF EXISTS itineraries;
DROP TABLE IF EXISTS guides;
DROP TABLE IF EXISTS pois;
DROP TABLE IF EXISTS travel_services;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS users;
```

- [ ] **Step 2: Add Go models**

Create `apps/api/internal/model/models.go` with struct names matching the schema:

```go
package model

import (
	"time"

	"gorm.io/datatypes"
)

type User struct {
	ID        uint64 `gorm:"primaryKey"`
	OpenID    string `gorm:"uniqueIndex;size:128"`
	Nickname  *string
	AvatarURL *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Region struct {
	ID        string `gorm:"primaryKey;size:64" json:"id"`
	Name      string `json:"name"`
	Level     string `json:"level"`
	ParentID  *string `json:"parentId"`
	CenterLat float64 `json:"centerLat"`
	CenterLng float64 `json:"centerLng"`
	BoundsJSON datatypes.JSON `json:"bounds"`
	Enabled   bool `json:"enabled"`
	SortOrder int `json:"sortOrder"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type TravelService struct {
	ID        string `gorm:"primaryKey;size:64" json:"id"`
	RegionID  string `json:"regionId"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	Tips      datatypes.JSON `json:"tips"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Poi struct {
	ID              string `gorm:"primaryKey;size:64" json:"id"`
	RegionID        string `json:"regionId"`
	Type            string `json:"type"`
	Name            string `json:"name"`
	Summary         string `json:"summary"`
	Lat             float64 `json:"lat"`
	Lng             float64 `json:"lng"`
	Tags            datatypes.JSON `json:"tags"`
	DurationMinutes int `json:"durationMinutes"`
	CostLevel       int `json:"costLevel"`
	HotScore        int `json:"hotScore"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Guide struct {
	ID        string `gorm:"primaryKey;size:64" json:"id"`
	RegionID  string `json:"regionId"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Tags      datatypes.JSON `json:"tags"`
	CoverURL  string `json:"coverUrl"`
	Official  bool `json:"official"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Itinerary struct {
	ID                  uint64 `gorm:"primaryKey" json:"id"`
	UserID              uint64 `json:"userId"`
	DestinationRegionID string `json:"destinationRegionId"`
	Title               string `json:"title"`
	Days                int `json:"days"`
	Status              string `json:"status"`
	BudgetCents         int `json:"budgetCents"`
	ShareCode           *string `json:"shareCode"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type ItineraryDay struct {
	ID          uint64 `gorm:"primaryKey" json:"id"`
	ItineraryID uint64 `json:"itineraryId"`
	DayIndex    int `json:"dayIndex"`
	Date        *time.Time `json:"date"`
	Summary     string `json:"summary"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type ItineraryItem struct {
	ID              uint64 `gorm:"primaryKey" json:"id"`
	DayID           uint64 `json:"dayId"`
	PoiID           string `json:"poiId"`
	SortOrder       int `json:"sortOrder"`
	StartHint       string `json:"startHint"`
	DurationMinutes int `json:"durationMinutes"`
	TransportHint   string `json:"transportHint"`
	Note            string `json:"note"`
	Done            bool `json:"done"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Favorite struct {
	ID         uint64 `gorm:"primaryKey" json:"id"`
	UserID     uint64 `json:"userId"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	CreatedAt  time.Time
}

type ShareSnapshot struct {
	ID                uint64 `gorm:"primaryKey" json:"id"`
	ShareCode         string `json:"shareCode"`
	SourceItineraryID uint64 `json:"sourceItineraryId"`
	ItinerarySnapshot datatypes.JSON `json:"itinerarySnapshot"`
	ExpiresAt         *time.Time `json:"expiresAt"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type WeatherSummary struct {
	ID               uint64 `gorm:"primaryKey" json:"id"`
	RegionID         string `json:"regionId"`
	Summary          string `json:"summary"`
	TemperatureRange string `json:"temperatureRange"`
	Tips             datatypes.JSON `json:"tips"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
```

- [ ] **Step 3: Run model compile and fix dependency**

Run:

```bash
cd apps/api && go mod tidy && go test ./internal/model
```

Expected: compile succeeds for the model package.

- [ ] **Step 4: Commit**

```bash
git add apps/api/go.mod apps/api/go.sum apps/api/migrations apps/api/internal/model
git commit -m "feat(api): add travel domain schema"
```

## Task 3: Seed Data And Importer

**Files:**
- Create: `data/seeds/regions.json`
- Create: `data/seeds/services.json`
- Create: `data/seeds/pois.json`
- Create: `data/seeds/guides.json`
- Create: `data/seeds/weather.json`
- Create: `apps/api/internal/seed/importer.go`
- Create: `apps/api/internal/seed/importer_test.go`
- Create: `apps/api/cmd/seed/main.go`

- [ ] **Step 1: Write failing seed importer test**

Create `apps/api/internal/seed/importer_test.go`:

```go
package seed

import (
	"path/filepath"
	"testing"
)

func TestLoadBundleReadsSeedFiles(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}
	if len(bundle.Regions) < 4 {
		t.Fatalf("expected at least 4 region records for the vertical slice, got %d", len(bundle.Regions))
	}
	if len(bundle.POIs) == 0 {
		t.Fatal("expected POIs")
	}
	if len(bundle.Guides) == 0 {
		t.Fatal("expected guides")
	}
}
```

Run:

```bash
cd apps/api && go test ./internal/seed -run TestLoadBundleReadsSeedFiles -v
```

Expected: FAIL because package `seed` or `LoadBundle` is undefined.

- [ ] **Step 2: Create seed JSON**

Create seed files with real entries for the vertical slice cities `city-hangzhou` and `city-beijing`. Include at minimum 1 city region, 1 area region, 2 POIs, 1 guide, 3 service records, and 1 weather summary for each city. Use IDs like `city-beijing`, `poi-beijing-palace-museum`, `guide-beijing-72h`.

Example entry shape in `data/seeds/regions.json`:

```json
[
  {"id":"city-beijing","name":"北京","level":"city","parentId":null,"centerLat":39.9042,"centerLng":116.4074,"enabled":true,"sortOrder":10},
  {"id":"area-beijing-dongcheng","name":"东城热门片区","level":"district","parentId":"city-beijing","centerLat":39.9175,"centerLng":116.3972,"enabled":true,"sortOrder":11}
]
```

Example entry shape in `data/seeds/pois.json`:

```json
[
  {"id":"poi-beijing-palace-museum","regionId":"area-beijing-dongcheng","type":"landmark","name":"故宫博物院","summary":"北京历史文化核心点位，适合半日深度参观。","lat":39.9163,"lng":116.3972,"tags":["历史文化","地标"],"durationMinutes":180,"costLevel":2,"hotScore":98}
]
```

- [ ] **Step 3: Implement importer**

Create `apps/api/internal/seed/importer.go`:

```go
package seed

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type RegionSeed struct {
	ID string `json:"id"`
	Name string `json:"name"`
	Level string `json:"level"`
	ParentID *string `json:"parentId"`
	CenterLat float64 `json:"centerLat"`
	CenterLng float64 `json:"centerLng"`
	Enabled bool `json:"enabled"`
	SortOrder int `json:"sortOrder"`
}

type ServiceSeed struct {
	ID string `json:"id"`
	RegionID string `json:"regionId"`
	Type string `json:"type"`
	Title string `json:"title"`
	Summary string `json:"summary"`
	Tips []string `json:"tips"`
}

type POISeed struct {
	ID string `json:"id"`
	RegionID string `json:"regionId"`
	Type string `json:"type"`
	Name string `json:"name"`
	Summary string `json:"summary"`
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
	Tags []string `json:"tags"`
	DurationMinutes int `json:"durationMinutes"`
	CostLevel int `json:"costLevel"`
	HotScore int `json:"hotScore"`
}

type GuideSeed struct {
	ID string `json:"id"`
	RegionID string `json:"regionId"`
	Title string `json:"title"`
	Content string `json:"content"`
	Tags []string `json:"tags"`
	CoverURL string `json:"coverUrl"`
	Official bool `json:"official"`
}

type WeatherSeed struct {
	RegionID string `json:"regionId"`
	Summary string `json:"summary"`
	TemperatureRange string `json:"temperatureRange"`
	Tips []string `json:"tips"`
}

type Bundle struct {
	Regions []RegionSeed
	Services []ServiceSeed
	POIs []POISeed
	Guides []GuideSeed
	Weather []WeatherSeed
}

func LoadBundle(dir string) (*Bundle, error) {
	var bundle Bundle
	if err := readJSON(filepath.Join(dir, "regions.json"), &bundle.Regions); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "services.json"), &bundle.Services); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "pois.json"), &bundle.POIs); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "guides.json"), &bundle.Guides); err != nil {
		return nil, err
	}
	if err := readJSON(filepath.Join(dir, "weather.json"), &bundle.Weather); err != nil {
		return nil, err
	}
	return &bundle, nil
}

func readJSON(path string, out any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}
```

- [ ] **Step 4: Run importer test**

Run:

```bash
cd apps/api && go test ./internal/seed -run TestLoadBundleReadsSeedFiles -v
```

Expected: PASS.

- [ ] **Step 5: Add database import command**

Create `apps/api/cmd/seed/main.go` to read `--seed-dir`, connect to MySQL from `.env`, and upsert regions/services/pois/guides/weather. Use `gorm.Clauses(clause.OnConflict{UpdateAll: true})` so repeated imports are idempotent.

Run:

```bash
cd apps/api && go run ./cmd/seed --seed-dir ../../data/seeds
```

Expected with MySQL configured: command prints imported counts. Expected without MySQL: connection error that names the DSN source.

- [ ] **Step 6: Commit**

```bash
git add data/seeds apps/api/internal/seed apps/api/cmd/seed
git commit -m "feat(api): add official seed importer"
```

## Task 4: API App Skeleton And Health/Auth

**Files:**
- Create: `apps/api/internal/config/config.go`
- Create: `apps/api/internal/database/database.go`
- Create: `apps/api/internal/httpx/response.go`
- Create: `apps/api/internal/httpx/middleware.go`
- Create: `apps/api/internal/auth/service.go`
- Create: `apps/api/internal/auth/handler.go`
- Create: `apps/api/internal/app/app.go`
- Create: `apps/api/internal/app/routes.go`
- Create: `apps/api/cmd/api/main.go`

- [ ] **Step 1: Implement config loader**

`config.Load()` reads environment variables and returns defaults:

```go
type Config struct {
	Env string
	HTTPAddr string
	MySQLDSN string
	WechatAppID string
	WechatAppSecret string
}
```

Defaults: `APP_ENV=local`, `HTTP_ADDR=:8080`, empty MySQL DSN is an error only when connecting to DB.

- [ ] **Step 2: Implement response envelope**

Create `apps/api/internal/httpx/response.go`:

```go
package httpx

import "github.com/gin-gonic/gin"

type Envelope struct {
	Data any `json:"data,omitempty"`
	Error *ErrorBody `json:"error,omitempty"`
}

type ErrorBody struct {
	Code string `json:"code"`
	Message string `json:"message"`
}

func OK(c *gin.Context, data any) {
	c.JSON(200, Envelope{Data: data})
}

func Fail(c *gin.Context, status int, code string, message string) {
	c.JSON(status, Envelope{Error: &ErrorBody{Code: code, Message: message}})
}
```

- [ ] **Step 3: Implement local auth**

For local MVP, `POST /api/v1/auth/wechat-login` accepts `{ "code": "dev-code" }`. When `APP_ENV=local`, derive openid as `local-` + code and upsert a user. Keep the service boundary so production WeChat exchange can replace it.

Request and response:

```json
{"code":"dev-code"}
```

```json
{"data":{"userId":1,"token":"local-dev-code"}}
```

- [ ] **Step 4: Implement routes**

Routes include:

```text
GET /healthz
POST /api/v1/auth/wechat-login
```

Run:

```bash
cd apps/api && go test ./... && go run ./cmd/api
```

Expected: tests pass; server listens on `:8080`. In another terminal:

```bash
curl -s http://127.0.0.1:8080/healthz
```

Expected:

```json
{"data":{"status":"ok"}}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal apps/api/cmd/api
git commit -m "feat(api): add service skeleton and local auth"
```

## Task 5: Content Query APIs

**Files:**
- Create: `apps/api/internal/content/repository.go`
- Create: `apps/api/internal/content/repository_test.go`
- Create: `apps/api/internal/content/handler.go`
- Modify: `apps/api/internal/app/routes.go`

- [ ] **Step 1: Write repository tests**

Create tests using SQLite in memory or GORM MySQL test helper. Prefer SQLite only for repository logic that does not depend on MySQL JSON behavior.

Test names:

```go
func TestRepositoryListRegionsFiltersEnabledAndParent(t *testing.T) {}
func TestRepositoryRegionOverviewIncludesServicesPOIsAndGuides(t *testing.T) {}
```

Expected assertions:

```go
if got[0].ID != "city-hangzhou" {
	t.Fatalf("expected city-hangzhou, got %s", got[0].ID)
}
if overview.Region.ID != "city-hangzhou" || len(overview.POIs) == 0 {
	t.Fatalf("overview missing region or pois: %+v", overview)
}
```

Run:

```bash
cd apps/api && go test ./internal/content -v
```

Expected: FAIL because repository is undefined.

- [ ] **Step 2: Implement repository**

Repository methods:

```go
ListRegions(ctx context.Context, parentID *string, level *string) ([]model.Region, error)
GetOverview(ctx context.Context, regionID string) (*Overview, error)
ListServices(ctx context.Context, regionID string, serviceType *string) ([]model.TravelService, error)
ListPOIs(ctx context.Context, regionID string, poiType *string) ([]model.Poi, error)
ListGuides(ctx context.Context, regionID string) ([]model.Guide, error)
```

`Overview` contains:

```go
type Overview struct {
	Region model.Region `json:"region"`
	Services []model.TravelService `json:"services"`
	POIs []model.Poi `json:"pois"`
	Guides []model.Guide `json:"guides"`
}
```

- [ ] **Step 3: Implement handlers**

Add routes:

```text
GET /api/v1/regions
GET /api/v1/regions/:id/overview
GET /api/v1/regions/:id/services
GET /api/v1/regions/:id/pois
GET /api/v1/regions/:id/guides
```

Supported query params:

```text
parentId
level
type
```

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/api && go test ./...
```

Expected: PASS.

With MySQL and seed data:

```bash
curl -s "http://127.0.0.1:8080/api/v1/regions?level=city"
curl -s "http://127.0.0.1:8080/api/v1/regions/city-hangzhou/overview"
```

Expected: responses contain Hangzhou region data and at least one POI.

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/content apps/api/internal/app/routes.go
git commit -m "feat(api): add content query endpoints"
```

## Task 6: Itinerary Generation And CRUD APIs

**Files:**
- Create: `apps/api/internal/itinerary/generator.go`
- Create: `apps/api/internal/itinerary/generator_test.go`
- Create: `apps/api/internal/itinerary/repository.go`
- Create: `apps/api/internal/itinerary/handler.go`
- Modify: `apps/api/internal/app/routes.go`

- [ ] **Step 1: Write generator test**

Create `apps/api/internal/itinerary/generator_test.go`:

```go
package itinerary

import "testing"

func TestGeneratePlanDistributesPOIsAcrossDays(t *testing.T) {
	input := GenerateInput{
		DestinationRegionID: "city-hangzhou",
		Days: 2,
		Preferences: []string{"城市漫步", "历史文化"},
	}
	pois := []CandidatePOI{
		{ID: "poi-1", Name: "西湖", RegionID: "area-hangzhou-westlake", Tags: []string{"城市漫步"}, DurationMinutes: 120, HotScore: 99},
		{ID: "poi-2", Name: "灵隐寺", RegionID: "area-hangzhou-westlake", Tags: []string{"历史文化"}, DurationMinutes: 120, HotScore: 95},
		{ID: "poi-3", Name: "南宋御街", RegionID: "area-hangzhou-shangcheng", Tags: []string{"城市漫步"}, DurationMinutes: 90, HotScore: 88},
	}
	plan, err := GeneratePlan(input, pois)
	if err != nil {
		t.Fatalf("GeneratePlan returned error: %v", err)
	}
	if len(plan.Days) != 2 {
		t.Fatalf("expected 2 days, got %d", len(plan.Days))
	}
	if len(plan.Days[0].Items) == 0 || len(plan.Days[1].Items) == 0 {
		t.Fatalf("expected both days to contain items: %+v", plan.Days)
	}
}
```

Run:

```bash
cd apps/api && go test ./internal/itinerary -run TestGeneratePlanDistributesPOIsAcrossDays -v
```

Expected: FAIL because generator types are undefined.

- [ ] **Step 2: Implement generator**

Create types:

```go
type GenerateInput struct {
	UserID uint64
	DestinationRegionID string
	Days int
	Preferences []string
}

type CandidatePOI struct {
	ID string
	Name string
	RegionID string
	Tags []string
	DurationMinutes int
	HotScore int
}

type GeneratedPlan struct {
	Title string
	Days []GeneratedDay
}

type GeneratedDay struct {
	DayIndex int
	Summary string
	Items []GeneratedItem
}

type GeneratedItem struct {
	POIID string
	StartHint string
	DurationMinutes int
	TransportHint string
}
```

Rules:
- Reject `Days < 1` and `Days > 14`.
- Score POIs by `HotScore + 20` for each matching preference tag.
- Sort descending by score.
- Distribute items round-robin across days.
- `StartHint` uses `上午`, `下午`, `傍晚` by item index.
- `TransportHint` defaults to `同片区步行或公共交通衔接，跨片区建议地铁或打车。`

- [ ] **Step 3: Implement itinerary repository and handlers**

Routes:

```text
POST /api/v1/itineraries/generate
GET /api/v1/itineraries
GET /api/v1/itineraries/:id
PATCH /api/v1/itineraries/:id
PATCH /api/v1/itinerary-items/:id
```

Use header `X-User-ID` for local MVP auth. Middleware parses it into request context; if missing on user-owned APIs, return 401 `AUTH_REQUIRED`.

Generate request:

```json
{
  "destinationRegionId": "city-hangzhou",
  "days": 2,
  "preferences": ["城市漫步", "历史文化"]
}
```

Patch item request:

```json
{
  "sortOrder": 2,
  "note": "雨天改到室内展馆",
  "done": true
}
```

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/api && go test ./...
```

Expected: PASS.

With MySQL and seed data:

```bash
curl -s -H "X-User-ID: 1" -H "Content-Type: application/json" \
  -d '{"destinationRegionId":"city-hangzhou","days":2,"preferences":["城市漫步"]}' \
  http://127.0.0.1:8080/api/v1/itineraries/generate
```

Expected: response contains an itinerary with 2 days and itinerary items.

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/itinerary apps/api/internal/app/routes.go
git commit -m "feat(api): add itinerary generation and editing"
```

## Task 7: Favorites, Weather, And Share Copy APIs

**Files:**
- Create: `apps/api/internal/favorite/repository.go`
- Create: `apps/api/internal/favorite/handler.go`
- Create: `apps/api/internal/weather/handler.go`
- Create: `apps/api/internal/itinerary/share_test.go`
- Modify: `apps/api/internal/itinerary/repository.go`
- Modify: `apps/api/internal/itinerary/handler.go`
- Modify: `apps/api/internal/app/routes.go`

- [ ] **Step 1: Write share copy test**

Create `apps/api/internal/itinerary/share_test.go`:

```go
package itinerary

import "testing"

func TestCopyShareCreatesIndependentItinerary(t *testing.T) {
	original := ShareItinerarySnapshot{
		Title: "杭州 2 日",
		DestinationRegionID: "city-hangzhou",
		Days: []ShareDay{{DayIndex: 1, Items: []ShareItem{{POIID: "poi-hangzhou-westlake"}}}},
	}
	copy := CopySnapshotToInput(42, original)
	if copy.UserID != 42 {
		t.Fatalf("expected user 42, got %d", copy.UserID)
	}
	if copy.Title != "杭州 2 日 副本" {
		t.Fatalf("unexpected title %q", copy.Title)
	}
	if len(copy.Days) != 1 || len(copy.Days[0].Items) != 1 {
		t.Fatalf("copy lost day items: %+v", copy)
	}
}
```

Run:

```bash
cd apps/api && go test ./internal/itinerary -run TestCopyShareCreatesIndependentItinerary -v
```

Expected: FAIL because share types are undefined.

- [ ] **Step 2: Implement favorite routes**

Routes:

```text
POST /api/v1/favorites
DELETE /api/v1/favorites/:id
GET /api/v1/favorites
```

Create request:

```json
{"targetType":"poi","targetId":"poi-hangzhou-westlake"}
```

Use unique key to make repeated favorite idempotent; return existing favorite when duplicate.

- [ ] **Step 3: Implement weather route**

Route:

```text
GET /api/v1/weather/summary?regionId=city-hangzhou
```

Response:

```json
{
  "data": {
    "regionId": "city-hangzhou",
    "summary": "春秋舒适，夏季注意午后阵雨。",
    "temperatureRange": "18-28°C",
    "tips": ["带轻薄外套", "雨天优先安排室内点位"]
  }
}
```

- [ ] **Step 4: Implement share routes**

Routes:

```text
POST /api/v1/itineraries/:id/share
GET /api/v1/shares/:shareCode
POST /api/v1/shares/:shareCode/copy
```

`POST /share` creates `ShareSnapshot` with serialized itinerary detail. `POST /copy` creates a new independent itinerary for `X-User-ID`.

- [ ] **Step 5: Verify**

Run:

```bash
cd apps/api && go test ./...
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/internal/favorite apps/api/internal/weather apps/api/internal/itinerary apps/api/internal/app/routes.go
git commit -m "feat(api): add favorites weather and sharing"
```

## Task 8: OpenAPI And Backend README

**Files:**
- Create: `packages/shared/openapi.yaml`
- Modify: `README.md`

- [ ] **Step 1: Add OpenAPI skeleton with concrete endpoints**

Create `packages/shared/openapi.yaml` with:

```yaml
openapi: 3.0.3
info:
  title: Travel Miniprogram API
  version: 0.1.0
servers:
  - url: http://127.0.0.1:8080
paths:
  /healthz:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
  /api/v1/regions:
    get:
      summary: List regions
      parameters:
        - in: query
          name: level
          schema:
            type: string
        - in: query
          name: parentId
          schema:
            type: string
      responses:
        "200":
          description: Region list
  /api/v1/itineraries/generate:
    post:
      summary: Generate itinerary
      parameters:
        - in: header
          name: X-User-ID
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Generated itinerary
```

Add every route from Tasks 4-7 before committing.

- [ ] **Step 2: Add local setup README**

`README.md` must include:

````markdown
# Travel Miniprogram

## Local Requirements

- Go 1.22+
- MySQL 8.0+
- Node.js 20+
- WeChat Developer Tools

## Database

```sql
CREATE DATABASE travel_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'travel'@'localhost' IDENTIFIED BY 'travel';
GRANT ALL PRIVILEGES ON travel_app.* TO 'travel'@'localhost';
FLUSH PRIVILEGES;
```

## API

```bash
cp .env.example .env
make api-seed
make api-run
```

## Mini Program

```bash
make mini-install
make mini-check
```

Open `apps/miniprogram` in WeChat Developer Tools.
````

- [ ] **Step 3: Verify**

Run:

```bash
make api-test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md packages/shared/openapi.yaml
git commit -m "docs: add API contract and local setup"
```

## Task 9: Mini Program Shell, API Client, And Tabs

**Files:**
- Create: `apps/miniprogram/app.json`
- Create: `apps/miniprogram/app.ts`
- Create: `apps/miniprogram/app.wxss`
- Create: `apps/miniprogram/project.config.json`
- Create: `apps/miniprogram/sitemap.json`
- Create: `apps/miniprogram/utils/config.ts`
- Create: `apps/miniprogram/utils/api.ts`
- Create: `apps/miniprogram/utils/types.ts`
- Create: all four tab page base files under `pages/explore`, `pages/itinerary`, `pages/favorite`, `pages/mine`

- [ ] **Step 1: Add Mini Program config**

Create `apps/miniprogram/app.json`:

```json
{
  "pages": [
    "pages/explore/index",
    "pages/itinerary/index",
    "pages/favorite/index",
    "pages/mine/index",
    "pages/share/index"
  ],
  "window": {
    "navigationStyle": "custom",
    "backgroundTextStyle": "dark",
    "backgroundColor": "#f7f2e8"
  },
  "tabBar": {
    "color": "#6f7a73",
    "selectedColor": "#22564b",
    "backgroundColor": "#fffdf8",
    "borderStyle": "white",
    "list": [
      {"pagePath":"pages/explore/index","text":"探索"},
      {"pagePath":"pages/itinerary/index","text":"行程"},
      {"pagePath":"pages/favorite/index","text":"收藏"},
      {"pagePath":"pages/mine/index","text":"我的"}
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于将探索地图定位到你附近的城市和旅行内容"
    }
  },
  "requiredPrivateInfos": ["getLocation"]
}
```

- [ ] **Step 2: Add typed API client**

Create `utils/config.ts`:

```ts
export const API_BASE_URL = 'http://127.0.0.1:8080';
```

Create `utils/api.ts`:

```ts
import { API_BASE_URL } from './config';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

export async function request<T>(path: string, method: Method = 'GET', data?: unknown): Promise<T> {
  const userId = wx.getStorageSync('userId') as number | '';
  const res = await wx.request<Envelope<T>>({
    url: `${API_BASE_URL}${path}`,
    method,
    data,
    header: {
      'Content-Type': 'application/json',
      ...(userId ? {'X-User-ID': String(userId)} : {})
    }
  });
  if (res.statusCode >= 400 || res.data.error) {
    throw new Error(res.data.error?.message || `HTTP ${res.statusCode}`);
  }
  return res.data.data as T;
}
```

- [ ] **Step 3: Add page placeholders with real navigation**

Each tab page should have a TypeScript `Page({})`, WXML root, WXSS. `explore` includes a button:

```xml
<button class="plan-button" bindtap="goPlan">规划行程</button>
```

`goPlan`:

```ts
goPlan() {
  wx.switchTab({ url: '/pages/itinerary/index' });
}
```

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/miniprogram && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/miniprogram
git commit -m "feat(miniprogram): add app shell and API client"
```

## Task 10: Explore Page With Ink Map And Content Sheet

**Files:**
- Create: `apps/miniprogram/components/ink-map/*`
- Create: `apps/miniprogram/components/bottom-sheet/*`
- Modify: `apps/miniprogram/pages/explore/*`

- [ ] **Step 1: Add map component contract**

`ink-map` properties:

```ts
properties: {
  regions: { type: Array, value: [] },
  selectedRegionId: { type: String, value: '' }
}
```

Events:

```ts
this.triggerEvent('regiontap', { regionId: region.id });
this.triggerEvent('locate');
```

- [ ] **Step 2: Implement Canvas 2D fallback with pseudo-3D**

Use `<canvas type="2d" id="inkCanvas">`. Draw:
- parchment background
- layered ink mountain shapes
- stylized China silhouette
- city hotspot circles from region center coordinates normalized into canvas coordinates

Implement touch handlers for pan and pinch scale. Store:

```ts
data: {
  scale: 1,
  offsetX: 0,
  offsetY: 0
}
```

- [ ] **Step 3: Implement explore data flow**

On page load:
1. `POST /api/v1/auth/wechat-login` with `code` from `wx.login`.
2. Store `userId`.
3. Load `/api/v1/regions?level=city`.
4. Prompt location with a visible card. If accepted, call `wx.getLocation({ type: 'gcj02' })`; if rejected, keep national view.

On hotspot tap:
1. Load `/api/v1/regions/{id}/overview`.
2. Open bottom sheet.
3. Render services, POIs, guides, favorite and add-to-itinerary buttons.

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/miniprogram && npm run typecheck
```

Expected: PASS.

Manual check in WeChat Developer Tools:
- Explore page opens.
- Map draws nonblank visual.
- Hotspot tap opens bottom sheet.
- Plan button switches to itinerary tab.

- [ ] **Step 5: Commit**

```bash
git add apps/miniprogram/components apps/miniprogram/pages/explore
git commit -m "feat(miniprogram): add ink map exploration"
```

## Task 11: Itinerary, Favorites, Mine, And Share Pages

**Files:**
- Modify: `apps/miniprogram/pages/itinerary/*`
- Modify: `apps/miniprogram/pages/favorite/*`
- Modify: `apps/miniprogram/pages/mine/*`
- Create: `apps/miniprogram/pages/share/*`

- [ ] **Step 1: Implement itinerary tab**

State:

```ts
data: {
  destinations: [],
  selectedDestinationId: 'city-hangzhou',
  days: 2,
  preferences: ['城市漫步'],
  currentItinerary: null,
  weather: null
}
```

Actions:
- Load city regions.
- Generate itinerary through `POST /api/v1/itineraries/generate`.
- Render days and items.
- Patch item done/note/order through `PATCH /api/v1/itinerary-items/:id`.
- Load weather summary through `/api/v1/weather/summary?regionId=...`.
- Create share through `POST /api/v1/itineraries/:id/share`.

- [ ] **Step 2: Implement favorite tab**

Render favorites from `GET /api/v1/favorites`. Provide empty state:

```text
还没有收藏。去探索地图中收藏景点、攻略或片区。
```

- [ ] **Step 3: Implement mine tab**

Render:
- current user ID
- login status
- local API URL
- saved itinerary count from `GET /api/v1/itineraries`

- [ ] **Step 4: Implement share page**

`pages/share/index` reads `shareCode` from query, calls `GET /api/v1/shares/:shareCode`, renders read-only daily plan, and offers:

```xml
<button bindtap="copyShare">收藏为我的行程</button>
```

`copyShare` calls `POST /api/v1/shares/:shareCode/copy` and switches to itinerary tab.

- [ ] **Step 5: Verify**

Run:

```bash
cd apps/miniprogram && npm run typecheck
```

Expected: PASS.

Manual check in WeChat Developer Tools:
- Generate Hangzhou 2-day itinerary.
- Mark an item done.
- Add a note.
- Create share.
- Open share page with `shareCode`.
- Copy share and see independent itinerary.

- [ ] **Step 6: Commit**

```bash
git add apps/miniprogram/pages apps/miniprogram/utils
git commit -m "feat(miniprogram): add itinerary favorites and sharing"
```

## Task 12: Expand Seed Coverage To 8 Cities

**Files:**
- Modify: `data/seeds/regions.json`
- Modify: `data/seeds/services.json`
- Modify: `data/seeds/pois.json`
- Modify: `data/seeds/guides.json`
- Modify: `data/seeds/weather.json`
- Modify: `apps/api/internal/seed/importer_test.go`

- [ ] **Step 1: Add coverage assertion**

Extend importer test:

```go
func TestSeedBundleCoversEightCities(t *testing.T) {
	bundle, err := LoadBundle(filepath.Join("..", "..", "..", "..", "data", "seeds"))
	if err != nil {
		t.Fatalf("LoadBundle returned error: %v", err)
	}
	required := map[string]bool{
		"city-beijing": false,
		"city-shanghai": false,
		"city-hangzhou": false,
		"city-chengdu": false,
		"city-xian": false,
		"city-guangzhou": false,
		"city-shenzhen": false,
		"city-xiamen": false,
	}
	for _, region := range bundle.Regions {
		if _, ok := required[region.ID]; ok {
			required[region.ID] = true
		}
	}
	for id, found := range required {
		if !found {
			t.Fatalf("missing seed city %s", id)
		}
	}
}
```

Run:

```bash
cd apps/api && go test ./internal/seed -run TestSeedBundleCoversEightCities -v
```

Expected: FAIL until all city seeds exist.

- [ ] **Step 2: Complete city data**

For each city, add:
- 1 city region
- 1-2 area regions
- 1 food service
- 1 accommodation service
- 1 transport service
- at least 2 POIs
- at least 1 guide
- 1 weather summary

- [ ] **Step 3: Verify**

Run:

```bash
cd apps/api && go test ./internal/seed -v
make api-test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add data/seeds apps/api/internal/seed/importer_test.go
git commit -m "data: expand official city seeds"
```

## Task 13: Final Verification And Completion Docs

**Files:**
- Modify: `README.md`
- Modify: `packages/shared/openapi.yaml`

- [ ] **Step 1: Run backend tests**

```bash
make api-test
```

Expected: all Go tests pass.

- [ ] **Step 2: Run frontend typecheck**

```bash
make mini-check
```

Expected: TypeScript exits 0.

- [ ] **Step 3: Run seed import against local MySQL**

```bash
make api-seed
```

Expected: command exits 0 and prints counts for regions, services, pois, guides, and weather.

- [ ] **Step 4: Run API smoke check**

Start API:

```bash
make api-run
```

Smoke commands:

```bash
curl -s http://127.0.0.1:8080/healthz
curl -s "http://127.0.0.1:8080/api/v1/regions?level=city"
curl -s -H "X-User-ID: 1" -H "Content-Type: application/json" \
  -d '{"destinationRegionId":"city-hangzhou","days":2,"preferences":["城市漫步"]}' \
  http://127.0.0.1:8080/api/v1/itineraries/generate
```

Expected:
- health returns status ok.
- regions contains 8 city records.
- itinerary generate returns 2 days.

- [ ] **Step 5: Update README verification section**

Add a concise checklist:

```markdown
## MVP Verification

- `make api-test`
- `make mini-check`
- `make api-seed`
- `make api-run`
- Open `apps/miniprogram` in WeChat Developer Tools.
- Verify Explore → city sheet → Itinerary → share copy flow.
```

- [ ] **Step 6: Final commit**

```bash
git add README.md packages/shared/openapi.yaml
git commit -m "docs: add MVP verification checklist"
```

## Self-Review Checklist

Spec coverage:
- Goal and MVP standard are covered by Tasks 1, 8, and 13.
- Monorepo structure is covered by Task 1.
- Go/Gin/GORM/MySQL schema and seed import are covered by Tasks 2-4.
- Content APIs are covered by Task 5.
- Itinerary generation/editing is covered by Task 6.
- Favorites, weather, and share-copy are covered by Task 7.
- OpenAPI and README are covered by Task 8 and Task 13.
- Native Mini Program tabs, API client, map exploration, itinerary, favorite, mine, and share pages are covered by Tasks 9-11.
- Eight seed cities are covered by Task 12.

Risk controls:
- WeChat AppID, Tencent Location key, production weather provider, and image licensing remain documented product-level external dependencies. The local MVP uses local auth, mock weather, and official text seed data so the core loop can run without those external accounts.
