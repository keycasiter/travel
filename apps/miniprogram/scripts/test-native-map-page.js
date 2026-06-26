const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const includeValues = new Set(((projectConfig.packOptions && projectConfig.packOptions.include) || []).map((rule) => rule.value));

assert.ok(appConfig.pages.includes('pages/region-map/index'), 'app.json should register the street-level region map page');
assert.ok(includeValues.has('pages/region-map/index.js'), 'project.config.json should include region map runtime JS');

const wxml = fs.readFileSync(path.join(root, 'pages/region-map/index.wxml'), 'utf8');
assert.ok(wxml.includes('<map'), 'region map page should use the native WeChat map component');
assert.ok(wxml.includes('show-location'), 'region map should show user location when authorized');
assert.ok(wxml.includes('bindmarkertap'), 'region map should support POI marker selection');
assertNativeMapIncludePointsGuard(wxml, 'region map page');

const source = fs.readFileSync(path.join(root, 'pages/region-map/index.ts'), 'utf8');
assert.ok(source.includes('scale: 16'), 'region map should default to street-level zoom');
assert.ok(source.includes('zoomToStreet'), 'region map should expose a street-level zoom action');
assert.ok(source.includes('openTraffic'), 'region map should expose traffic guidance from selected POI');
assert.ok(source.includes('hasIncludePoints: false'), 'region map should default to no include-points guard');

const loadOverviewSource = sliceBetween(source, 'async loadOverview', 'onMarkerTap');
assert.ok(loadOverviewSource.includes('includePoints: []'), 'initial street map load should not fit all POIs');
assert.ok(loadOverviewSource.includes('hasIncludePoints: false'), 'initial street map load should not bind empty include-points');
assert.ok(!loadOverviewSource.includes('includePoints: pois.map'), 'initial street map load must not override street zoom with POI bounds');

const markerTapSource = sliceBetween(source, 'onMarkerTap', 'zoomToStreet');
assert.ok(markerTapSource.includes('includePoints: []'), 'marker selection should clear POI bounds before zooming in');
assert.ok(markerTapSource.includes('hasIncludePoints: false'), 'marker selection should not bind empty include-points');
assert.ok(markerTapSource.includes('scale: 19'), 'marker selection should use street-level zoom');

const streetZoomSource = sliceBetween(source, 'zoomToStreet', 'showAllPois');
assert.ok(streetZoomSource.includes('includePoints: []'), 'street zoom should clear POI bounds');
assert.ok(streetZoomSource.includes('hasIncludePoints: false'), 'street zoom should not bind empty include-points');
assert.ok(streetZoomSource.includes('scale: 20'), 'street zoom should request the closest street-level scale');

const allPoisSource = sliceBetween(source, 'showAllPois', 'locateMe');
assert.ok(allPoisSource.includes('includePoints: this.data.pois.map'), 'all POIs view should be the only mode that fits POI bounds');
assert.ok(allPoisSource.includes('hasIncludePoints: true'), 'all POIs view should enable include-points only for non-empty bounds');
assert.ok(allPoisSource.includes('scale: 13'), 'all POIs view should keep overview zoom');

const locateSource = sliceBetween(source, 'locateMe', 'openTraffic');
assert.ok(locateSource.includes('includePoints: []'), 'user location should clear POI bounds before zooming in');
assert.ok(locateSource.includes('hasIncludePoints: false'), 'user location should not bind empty include-points');
assert.ok(locateSource.includes('scale: 19'), 'user location should use street-level zoom');

function sliceBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, `missing ${endNeedle} after ${startNeedle}`);
  return text.slice(start, end);
}

function assertNativeMapIncludePointsGuard(markup, label) {
  const mapBlocks = markup.match(/<map[\s\S]*?\/>/g) || [];
  assert.strictEqual(mapBlocks.length, 2, `${label} should render guarded native map variants`);
  const withBounds = mapBlocks.find((block) => block.includes('include-points="{{includePoints}}"'));
  const withoutBounds = mapBlocks.find((block) => !block.includes('include-points='));
  assert.ok(withBounds && withBounds.includes('wx:if="{{hasIncludePoints}}"'), `${label} should only bind include-points behind a non-empty guard`);
  assert.ok(withoutBounds && withoutBounds.includes('wx:else'), `${label} should render a map without include-points when bounds are empty`);
}
