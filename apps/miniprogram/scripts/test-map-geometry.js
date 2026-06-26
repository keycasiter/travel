const assert = require('assert');

const { chinaProvinces } = require('../data/china-provinces.js');
const {
  clampMapScale,
  computeGeoBounds,
  createFocusedViewport,
  createViewportProjector,
  distanceKm,
  findContainingMapFeature,
  findMapFeatureAtViewportPoint,
  findNearestRegion,
  projectRegionMarkers
} = require('../utils/map-geometry.js');

const seedRegions = [
  { id: 'city-beijing', name: '北京', centerLng: 116.724502, centerLat: 39.905023 },
  { id: 'city-shanghai', name: '上海', centerLng: 121.473667, centerLat: 31.230525 },
  { id: 'city-hangzhou', name: '杭州', centerLng: 120.15507, centerLat: 30.274084 },
  { id: 'city-chengdu', name: '成都', centerLng: 104.066541, centerLat: 30.572269 },
  { id: 'city-xian', name: '西安', centerLng: 108.940174, centerLat: 34.341568 },
  { id: 'city-guangzhou', name: '广州', centerLng: 113.264385, centerLat: 23.129112 },
  { id: 'city-shenzhen', name: '深圳', centerLng: 114.057868, centerLat: 22.543099 },
  { id: 'city-xiamen', name: '厦门', centerLng: 118.089425, centerLat: 24.479834 }
];

assert.ok(chinaProvinces.length >= 34, 'province map data should include mainland provinces and special regions');

const bounds = computeGeoBounds(chinaProvinces);
assert.ok(bounds.minLng < 75, `minLng should cover west China, got ${bounds.minLng}`);
assert.ok(bounds.maxLng > 134, `maxLng should cover east China, got ${bounds.maxLng}`);
assert.ok(bounds.minLat < 18, `minLat should cover south China, got ${bounds.minLat}`);
assert.ok(bounds.maxLat > 52, `maxLat should cover north China, got ${bounds.maxLat}`);

const projector = createViewportProjector(bounds, {
  width: 375,
  height: 667,
  padding: 28,
  scale: 1,
  offsetX: 0,
  offsetY: 0
});
const markers = projectRegionMarkers(seedRegions, projector);
assert.strictEqual(markers.length, 8, 'all seed cities should produce map markers');

for (const marker of markers) {
  assert.ok(marker.left >= 8 && marker.left <= 92, `${marker.name} marker left ${marker.left} should stay inside viewport`);
  assert.ok(marker.top >= 18 && marker.top <= 82, `${marker.name} marker top ${marker.top} should stay inside viewport`);
}

const nearest = findNearestRegion(seedRegions, { lng: 120.15507, lat: 30.274084 });
assert.strictEqual(nearest.region.id, 'city-hangzhou', 'nearest region to Hangzhou coordinates should be Hangzhou');
assert.ok(nearest.distanceKm < 1, `Hangzhou self distance should be near zero, got ${nearest.distanceKm}`);

assert.ok(distanceKm({ lng: 116.724502, lat: 39.905023 }, { lng: 121.473667, lat: 31.230525 }) > 900);

const hangzhouFeature = findContainingMapFeature(chinaProvinces, { lng: 120.15507, lat: 30.274084 });
assert.strictEqual(hangzhouFeature && hangzhouFeature.name, '浙江', 'Hangzhou coordinates should resolve to Zhejiang province');

const beijingFeature = findContainingMapFeature(chinaProvinces, { lng: 116.724502, lat: 39.905023 });
assert.strictEqual(beijingFeature && beijingFeature.name, '北京', 'Beijing coordinates should resolve to Beijing province-level region');

assert.strictEqual(clampMapScale(0.2), 0.78, 'zoom out should clamp to minimum map scale');
assert.strictEqual(clampMapScale(4), 2.35, 'zoom in should clamp to maximum map scale');

const focusedViewport = createFocusedViewport(bounds, {
  width: 375,
  height: 667,
  padding: 28,
  scale: 1,
  offsetX: 0,
  offsetY: 0
}, { lng: 120.15507, lat: 30.274084 }, 1.7);
const focusedProjector = createViewportProjector(bounds, focusedViewport);
const focusedPoint = focusedProjector.project({ lng: 120.15507, lat: 30.274084 });
assert.ok(Math.abs(focusedPoint.x - 187.5) < 0.01, `focused point x should be centered, got ${focusedPoint.x}`);
assert.ok(Math.abs(focusedPoint.y - 320.16) < 0.01, `focused point y should use map focus anchor, got ${focusedPoint.y}`);

const hangzhouScreenPoint = projector.project({ lng: 120.15507, lat: 30.274084 });
const viewportHit = findMapFeatureAtViewportPoint(chinaProvinces, bounds, projector.viewport, hangzhouScreenPoint);
assert.strictEqual(viewportHit && viewportHit.name, '浙江', 'clicking the projected Hangzhou screen point should hit Zhejiang');
