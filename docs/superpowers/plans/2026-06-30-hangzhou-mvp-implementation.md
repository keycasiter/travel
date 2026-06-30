# Hangzhou MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the travel mini program from an eight-city shell into a Hangzhou-first MVP with a complete exploration-to-itinerary-to-share loop.

**Architecture:** Keep the existing monorepo and APIs. Expand seed content for Hangzhou, mark homepage hotspots with MVP readiness, wire Hangzhou content actions into favorites and itinerary planning, and keep non-Hangzhou cities as visible but incomplete inspiration.

**Tech Stack:** Native WeChat Mini Program + TypeScript, Go + Gin + GORM, MySQL seed JSON, Node verification scripts.

---

### Task 1: Lock Hangzhou Content Contract

**Files:**
- Modify: `apps/api/internal/seed/importer_test.go`
- Modify: `apps/api/internal/app/app_test.go`
- Modify: `apps/api/internal/itinerary/generator_test.go`

- [ ] Add failing tests requiring Hangzhou to have multiple areas, at least twelve POIs, at least four guides, and user-facing itinerary titles.
- [ ] Run targeted Go tests and confirm the new assertions fail against the current thin seed data.

### Task 2: Expand Hangzhou Seed And Itinerary Naming

**Files:**
- Modify: `data/seeds/regions.json`
- Modify: `data/seeds/pois.json`
- Modify: `data/seeds/services.json`
- Modify: `data/seeds/guides.json`
- Modify: `data/seeds/weather.json`
- Modify: `apps/api/internal/itinerary/generator.go`

- [ ] Add Hangzhou areas for West Lake, Lingyin/Longjing, Hubin/Wulin, Shangcheng old street, and Grand Canal.
- [ ] Add Hangzhou POIs across landmark, scenic, food, transport-adjacent, street, museum, tea, and night-view categories.
- [ ] Add Hangzhou guides for 48-hour slow travel, West Lake route, Lingyin/Longjing half day, food/accommodation/traffic avoidance.
- [ ] Generate readable Hangzhou itinerary title and daily summaries.
- [ ] Run targeted Go tests and confirm green.

### Task 3: Make Homepage Hangzhou-First

**Files:**
- Modify: `apps/miniprogram/components/ink-map/city-hotspots.ts`
- Modify: `apps/miniprogram/components/ink-map/index.wxml`
- Modify: `apps/miniprogram/components/ink-map/index.wxss`
- Modify: `apps/miniprogram/components/ink-map/index.ts`
- Modify: `apps/miniprogram/scripts/test-hangzhou-mvp.js`
- Modify: `apps/miniprogram/package.json`

- [ ] Add a failing Mini Program contract test for Hangzhou-only MVP readiness.
- [ ] Mark Hangzhou as `mvpReady: true` and other hotspots as `false`.
- [ ] Show full actions only for Hangzhou and show “待完善” messaging for other cities.
- [ ] Run the new script and existing mini program checks.

### Task 4: Wire Hangzhou Content Actions

**Files:**
- Modify: `apps/miniprogram/pages/explore/index.ts`
- Modify: `apps/miniprogram/pages/explore/index.wxml`
- Modify: `apps/miniprogram/pages/explore/index.wxss`
- Modify: `apps/miniprogram/pages/itinerary/index.ts`
- Modify: `apps/miniprogram/pages/itinerary/index.wxml`
- Modify: `apps/miniprogram/pages/region-map/index.ts`
- Modify: `apps/miniprogram/pages/region-map/index.wxml`

- [ ] Add favorite and “加入行程” actions from the Hangzhou bottom sheet.
- [ ] Make itinerary page consume `pendingDestinationRegionId` and `pendingItineraryPlace`.
- [ ] Make region map selected POI support favorite and add-to-itinerary.
- [ ] Run TypeScript and UI verification.

### Task 5: Verify And Publish

**Files:**
- All changed files above.

- [ ] Run Go targeted tests, Mini Program checks, and `git diff --check`.
- [ ] Stage only Hangzhou MVP related files; leave local DevTools config and generated outputs untouched.
- [ ] Commit and push to `origin/main`.
