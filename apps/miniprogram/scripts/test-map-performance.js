const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentSource = fs.readFileSync(path.join(root, 'components/ink-map/index.ts'), 'utf8');
const componentMarkup = fs.readFileSync(path.join(root, 'components/ink-map/index.wxml'), 'utf8');
const componentStyles = fs.readFileSync(path.join(root, 'components/ink-map/index.wxss'), 'utf8');
const exploreSource = fs.readFileSync(path.join(root, 'pages/explore/index.ts'), 'utf8');
const geometrySource = fs.readFileSync(path.join(root, 'utils/map-geometry.ts'), 'utf8');
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const includeValues = new Set(((projectConfig.packOptions && projectConfig.packOptions.include) || []).map((rule) => rule.value));

assert.ok(componentMarkup.includes('<map'), 'explore map component should use native WeChat map');
assert.ok(componentMarkup.includes('bindmarkertap="onMarkerTap"'), 'native explore map should handle city marker taps');
assert.ok(componentMarkup.includes('show-location'), 'native explore map should show authorized user location');
assert.ok(!componentMarkup.includes('<canvas'), 'explore map component must not render a canvas map');
assertNativeMapIncludePointsGuard(componentMarkup, 'explore map component');

assert.ok(!componentSource.includes('chinaProvinces'), 'explore map component must not depend on GeoJSON province data');
assert.ok(!componentSource.includes('CanvasRuntime'), 'explore map component should not keep canvas rendering runtime');
assert.ok(!componentSource.includes('drawChinaLayer'), 'explore map component should not draw GeoJSON layers');
assert.ok(componentSource.includes('buildRegionMarkers'), 'explore map component should convert seed regions into native map markers');
assert.ok(componentSource.includes('focusLocation'), 'explore map component should expose a location focus method');
assert.ok(componentSource.includes('focusRegion'), 'explore map component should expose a city focus method');
assert.ok(componentSource.includes('hasIncludePoints: false'), 'explore map should default to no include-points guard');
assert.ok(componentSource.includes('hasIncludePoints: includePoints.length > 0'), 'explore map should only enable include-points for non-empty bounds');

assert.ok(componentStyles.includes('.native-map'), 'explore map component should style the native map surface');
assert.ok(!componentStyles.includes('.ink-canvas'), 'explore map styles should not keep canvas surface styles');

assert.ok(!exploreSource.includes('chinaProvinces'), 'explore page must not import GeoJSON province data');
assert.ok(!geometrySource.includes('ChinaMapFeature'), 'map geometry utilities should not keep GeoJSON feature types');
assert.ok(!geometrySource.includes('findContainingMapFeature'), 'map geometry utilities should not keep GeoJSON hit testing');
assert.ok(!includeValues.has('data/china-provinces.js'), 'DevTools package should not force-include abandoned GeoJSON data');

function assertNativeMapIncludePointsGuard(markup, label) {
  const mapBlocks = markup.match(/<map[\s\S]*?\/>/g) || [];
  assert.strictEqual(mapBlocks.length, 2, `${label} should render guarded native map variants`);
  const withBounds = mapBlocks.find((block) => block.includes('include-points="{{includePoints}}"'));
  const withoutBounds = mapBlocks.find((block) => !block.includes('include-points='));
  assert.ok(withBounds && withBounds.includes('wx:if="{{hasIncludePoints}}"'), `${label} should only bind include-points behind a non-empty guard`);
  assert.ok(withoutBounds && withoutBounds.includes('wx:else'), `${label} should render a map without include-points when bounds are empty`);
}
