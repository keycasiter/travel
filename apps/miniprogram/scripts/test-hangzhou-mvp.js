const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const hotspotSource = read('components/ink-map/city-hotspots.ts');
assert.ok(hotspotSource.includes("mvpReady: true"), 'Hangzhou hotspot should be marked MVP ready');
assert.ok(hotspotSource.includes("mvpReady: false"), 'Non-Hangzhou hotspots should be marked pending');
assert.ok(hotspotSource.includes('杭州先行版'), 'Hotspot card should carry Hangzhou-first copy');
assert.ok(hotspotSource.includes('待完善'), 'Non-Hangzhou hotspots should carry pending copy');

const inkMapMarkup = read('components/ink-map/index.wxml');
assertIncludes(inkMapMarkup, [
  'city-status-badge',
  'mvpReady',
  '城市待完善',
  '看杭州内容',
  '规划杭州行程'
], 'ink map markup');

const exploreSource = read('pages/explore/index.ts');
assertIncludes(exploreSource, [
  "HANGZHOU_REGION_ID",
  'saveFavorite',
  'addPoiToItinerary',
  'addGuideToFavorite',
  'pendingItineraryPlace',
  '/api/v1/favorites'
], 'explore page source');

const exploreMarkup = read('pages/explore/index.wxml');
assertIncludes(exploreMarkup, [
  'hangzhou-sheet-hero',
  '杭州先行版',
  '加入行程',
  '收藏',
  '精选攻略'
], 'explore page markup');

const itinerarySource = read('pages/itinerary/index.ts');
assertIncludes(itinerarySource, [
  'pendingDestinationRegionId',
  'city-hangzhou',
  '杭州',
  'consumePendingDestination'
], 'itinerary source');

const regionMapSource = read('pages/region-map/index.ts');
assertIncludes(regionMapSource, [
  'saveSelectedPoi',
  'addSelectedPoiToItinerary',
  'pendingItineraryPlace'
], 'region map source');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, patterns, label) {
  for (const pattern of patterns) {
    assert.ok(content.includes(pattern), `${label} should include ${pattern}`);
  }
}
