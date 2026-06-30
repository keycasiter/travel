const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentSource = fs.readFileSync(path.join(root, 'components/ink-map/index.ts'), 'utf8');
const componentMarkup = fs.readFileSync(path.join(root, 'components/ink-map/index.wxml'), 'utf8');
const componentStyles = fs.readFileSync(path.join(root, 'components/ink-map/index.wxss'), 'utf8');
const exploreSource = fs.readFileSync(path.join(root, 'pages/explore/index.ts'), 'utf8');
const exploreMarkup = fs.readFileSync(path.join(root, 'pages/explore/index.wxml'), 'utf8');
const hotspotSourcePath = path.join(root, 'components/ink-map/city-hotspots.ts');
const heroImagePath = path.join(root, 'assets/maps/home-map-mobile.jpg');
const legacyHeroImagePath = path.join(root, 'assets/maps/china-relief-home.jpg');
const metadataPath = path.resolve(root, '..', '..', 'docs/assets/maps/home-map-metadata.md');

assert.ok(fs.existsSync(heroImagePath), 'homepage should include the 3D China bitmap master asset');
assert.ok(fs.statSync(heroImagePath).size > 500 * 1024, 'homepage bitmap master should be a high-quality raster asset');
assert.ok(!fs.existsSync(legacyHeroImagePath), 'prototype map asset should not remain in runtime assets');
assert.ok(!componentSource.includes('china-relief-home.jpg'), 'homepage should not reference the prototype map filename');
assert.ok(fs.existsSync(metadataPath), 'homepage map should include source and compliance metadata');

const metadata = fs.readFileSync(metadataPath, 'utf8');
assert.ok(metadata.includes('标准地图服务系统'), 'metadata should record the standard map source boundary');
assert.ok(metadata.includes('内部原型'), 'metadata should state current review status');
assert.ok(fs.existsSync(hotspotSourcePath), 'homepage city hotspots should live in a dedicated config file');

const hotspotSource = fs.readFileSync(hotspotSourcePath, 'utf8');
for (const cityId of [
  'city-beijing',
  'city-shanghai',
  'city-hangzhou',
  'city-chengdu',
  'city-xian',
  'city-guangzhou',
  'city-shenzhen',
  'city-xiamen'
]) {
  assert.ok(hotspotSource.includes(cityId), `hotspot config should include ${cityId}`);
}
assert.ok(componentSource.includes("from './city-hotspots'"), 'ink map should import hotspot config');
assert.ok(!componentSource.includes('notes: {'), 'ink map component should not inline city copy');

assert.ok(!componentMarkup.includes('<map'), 'homepage hero map must not use native Tencent/WeChat map');
assert.ok(componentMarkup.includes('<image'), 'homepage hero map should render the bitmap master with image');
assert.ok(componentMarkup.includes('src="{{heroImage}}"'), 'homepage hero map should bind the bitmap master source');
assert.ok(componentMarkup.includes('tapCityHotspot'), 'homepage hero map should expose tappable city hotspots');
assert.ok(componentMarkup.includes('city-card'), 'homepage hero map should render a selected city exploration card');
assert.ok(componentMarkup.includes('zoomHeroMap'), 'homepage hero map should expose controlled zoom buttons');
assert.ok(componentMarkup.includes('onMapTouchStart'), 'homepage hero map should support light dragging');
assert.ok(componentMarkup.includes('enterCityDetail'), 'homepage city card should provide a city detail entry');
assert.ok(componentMarkup.includes('goPlan'), 'homepage city card should provide an itinerary planning entry');

for (const forbidden of [
  'show-location',
  'bindmarkertap',
  'bindregionchange',
  'include-points',
  'searchSuggestions',
  'routePlans',
  'areaContext',
  'searchThisArea',
  'favoriteActivePlace'
]) {
  assert.ok(!componentMarkup.includes(forbidden), `homepage bitmap map should not keep native map/POI UI: ${forbidden}`);
}

for (const required of [
  'MAP_HERO_IMAGE',
  'CITY_HOTSPOTS',
  'heroScale',
  'heroOffsetX',
  'heroOffsetY',
  'tapCityHotspot',
  'zoomHeroMap',
  'focusRegion',
  'selectedCityCard'
]) {
  assert.ok(componentSource.includes(required), `homepage bitmap map should keep ${required}`);
}

for (const forbidden of [
  'calibrationAvailable',
  'calibrationEnabled',
  'calibrationPoint',
  'toggleCalibrationMode',
  'markCalibrationPoint',
  'copyCalibrationPoint'
]) {
  assert.ok(!componentSource.includes(forbidden), `homepage should not keep dev calibration code: ${forbidden}`);
}

for (const forbidden of [
  'searchTencentPlaces',
  'suggestTencentPlaces',
  'getTencentLocationContext',
  'previewTencentRoutes',
  'wx.createMapContext',
  'NativeMapMarker',
  'TencentPoi',
  'includePoints',
  'markers:'
]) {
  assert.ok(!componentSource.includes(forbidden), `homepage bitmap map must not depend on Tencent/native map code: ${forbidden}`);
}

assert.ok(componentStyles.includes('.hero-map-image'), 'homepage should style the bitmap map image');
assert.ok(componentStyles.includes('.city-hotspot'), 'homepage should style city hotspots');
assert.ok(componentStyles.includes('.city-card'), 'homepage should style the city exploration card');
assert.ok(componentStyles.includes('touch-action'), 'homepage should avoid browser gesture interference where supported');
assert.ok(!componentStyles.includes('.native-map'), 'homepage styles should not keep native map surface styles');
assert.ok(!componentStyles.includes('.search-suggestions'), 'homepage styles should not keep Tencent POI suggestion UI');

for (const forbidden of [
  'map-layer-status',
  'map-layer-chip',
  'resetHeroMap',
  '回到全国视角',
  'calibration-overlay',
  'markCalibrationPoint',
  'copyCalibrationPoint',
  'toggleCalibrationMode',
  '标定'
]) {
  assert.ok(!componentMarkup.includes(forbidden), `homepage should not render removed map utility UI: ${forbidden}`);
}

for (const forbidden of [
  '.map-layer-status',
  '.map-layer-chip',
  '.reset-control',
  '.calibration-toggle',
  '.calibration-overlay',
  '.calibration-guide',
  '.calibration-cross',
  '.calibration-copy'
]) {
  assert.ok(!componentStyles.includes(forbidden), `homepage styles should not keep removed map utility UI: ${forbidden}`);
}

assert.ok(exploreMarkup.includes('bind:regiontap="onRegionTap"'), 'explore page should still open city exploration cards from hotspots');
assert.ok(exploreSource.includes('focusMapRegion'), 'explore page should still support programmatic city focus');
assert.ok(!exploreSource.includes('focusMapLocation'), 'explore page should not focus a native map location on the bitmap homepage');
