const assert = require('assert');

const {
  distanceKm,
  findNearestRegion
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

const nearest = findNearestRegion(seedRegions, { lng: 120.15507, lat: 30.274084 });
assert.strictEqual(nearest.region.id, 'city-hangzhou', 'nearest region to Hangzhou coordinates should be Hangzhou');
assert.ok(nearest.distanceKm < 1, `Hangzhou self distance should be near zero, got ${nearest.distanceKm}`);

assert.ok(distanceKm({ lng: 116.724502, lat: 39.905023 }, { lng: 121.473667, lat: 31.230525 }) > 900);

const unsupported = findNearestRegion(seedRegions, { lng: 87.6168, lat: 43.8256 });
assert.ok(unsupported.distanceKm > 120, `Urumqi should be outside seed city coverage, got ${unsupported.distanceKm}`);
