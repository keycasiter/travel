const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentSource = fs.readFileSync(path.join(root, 'components/ink-map/index.ts'), 'utf8');
const componentMarkup = fs.readFileSync(path.join(root, 'components/ink-map/index.wxml'), 'utf8');
const componentStyles = fs.readFileSync(path.join(root, 'components/ink-map/index.wxss'), 'utf8');
const exploreSource = fs.readFileSync(path.join(root, 'pages/explore/index.ts'), 'utf8');
const exploreMarkup = fs.readFileSync(path.join(root, 'pages/explore/index.wxml'), 'utf8');
const geometrySource = fs.readFileSync(path.join(root, 'utils/map-geometry.ts'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'utils/config.ts'), 'utf8');
const tencentMapPath = path.join(root, 'utils/tencent-map.ts');
assert.ok(fs.existsSync(tencentMapPath), 'mini program should keep Tencent WebService search in utils/tencent-map.ts');
const tencentMapSource = fs.readFileSync(tencentMapPath, 'utf8');
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const includeValues = new Set(((projectConfig.packOptions && projectConfig.packOptions.include) || []).map((rule) => rule.value));

assert.ok(componentMarkup.includes('<map'), 'explore map component should use native WeChat map');
assert.ok(componentMarkup.includes('bindmarkertap="onMarkerTap"'), 'native explore map should handle city marker taps');
assert.ok(componentMarkup.includes('bindregionchange="onRegionChange"'), 'native explore map should track the visible map center after pan and zoom');
assert.ok(componentMarkup.includes('show-location'), 'native explore map should show authorized user location');
assert.ok(!componentMarkup.includes('<canvas'), 'explore map component must not render a canvas map');
assertNativeMapIncludePointsGuard(componentMarkup, 'explore map component');

assert.ok(!componentSource.includes('chinaProvinces'), 'explore map component must not depend on GeoJSON province data');
assert.ok(!componentSource.includes('CanvasRuntime'), 'explore map component should not keep canvas rendering runtime');
assert.ok(!componentSource.includes('drawChinaLayer'), 'explore map component should not draw GeoJSON layers');
assert.ok(componentSource.includes('buildRegionMarkers'), 'explore map component should convert seed regions into native map markers');
assert.ok(componentSource.includes('focusLocation'), 'explore map component should expose a location focus method');
assert.ok(componentSource.includes('focusRegion'), 'explore map component should expose a city focus method');
assert.ok(componentSource.includes('searchTencentPlaces'), 'explore map component should use Tencent WebService place search');
assert.ok(componentSource.includes('SEARCH_MARKER_ID_OFFSET'), 'explore map component should isolate Tencent POI marker ids');
assert.ok(componentSource.includes('handleSearchInput'), 'explore map component should handle free text map search input');
assert.ok(componentSource.includes('submitSearch'), 'explore map component should submit Tencent map searches');
assert.ok(componentSource.includes('tapSearchCategory'), 'explore map component should handle nearby category searches');
assert.ok(componentSource.includes('getCenterLocation'), 'explore map component should search around the current visible map center');
assert.ok(componentSource.includes('searchResults'), 'explore map component should keep Tencent POI results for highlighted markers');
assert.ok(componentSource.includes('activeCategoryId'), 'explore map component should reflect the active nearby search category');
assert.ok(componentSource.includes('hasIncludePoints: false'), 'explore map should default to no include-points guard');
assert.ok(componentSource.includes('hasIncludePoints: includePoints.length > 0'), 'explore map should only enable include-points for non-empty bounds');

assert.ok(componentStyles.includes('.native-map'), 'explore map component should style the native map surface');
assert.ok(componentStyles.includes('.search-input'), 'explore map should style the Tencent search input');
assert.ok(componentStyles.includes('.chip-active'), 'explore map should style the active nearby search category');
assert.ok(!componentStyles.includes('.ink-canvas'), 'explore map styles should not keep canvas surface styles');

assert.ok(componentMarkup.includes('placeholder="搜索好玩的"'), 'explore map search input should use the requested placeholder');
assert.ok(componentMarkup.includes('bindinput="handleSearchInput"'), 'explore map search input should update search text');
assert.ok(componentMarkup.includes('bindconfirm="submitSearch"'), 'explore map search input should submit through Tencent search');
assert.ok(componentMarkup.includes('tapSearchCategory'), 'explore map should expose nearby category buttons');

assert.ok(!exploreSource.includes('chinaProvinces'), 'explore page must not import GeoJSON province data');
assert.ok(!exploreSource.includes('已定位到'), 'explore page should not keep located-to status copy over the map');
assert.ok(!exploreMarkup.includes('status-card'), 'explore page should not render location status text over the map');
assert.ok(!geometrySource.includes('ChinaMapFeature'), 'map geometry utilities should not keep GeoJSON feature types');
assert.ok(!geometrySource.includes('findContainingMapFeature'), 'map geometry utilities should not keep GeoJSON hit testing');
assert.ok(!includeValues.has('data/china-provinces.js'), 'DevTools package should not force-include abandoned GeoJSON data');
assert.ok(includeValues.has('utils/tencent-map.js'), 'DevTools package should force-include Tencent search runtime JS');

assert.ok(configSource.includes("TENCENT_MAP_KEY = '2DHBZ-6RR6W-LYRRN-Y5FY2-KG35Q-OSFGP'"), 'Tencent map key should be configured for local mini program search');
assert.ok(configSource.includes('TENCENT_MAP_SEARCH_URL'), 'Tencent place search URL should be configured centrally');
assert.ok(configSource.includes('/ws/place/v1/search'), 'Tencent place search WebService URL should be configured');
assert.ok(tencentMapSource.includes('TENCENT_MAP_SEARCH_URL'), 'Tencent search helper should call configured place search WebService');
assert.ok(tencentMapSource.includes('wx.request'), 'Tencent search helper should use wx.request in mini program');
assert.ok(tencentMapSource.includes('nearby('), 'Tencent search helper should search near the current map center');
assert.ok(tencentMapSource.includes('page_size'), 'Tencent search helper should bound search result count');
assert.ok(tencentMapSource.includes("orderby: '_distance'"), 'Tencent search helper should order nearby POIs by distance');
for (const label of ['地标', '景观', '美食', '交通', '灵感']) {
  assert.ok(tencentMapSource.includes(label), `Tencent search categories should include ${label}`);
}
for (const keyword of ['地标 建筑', '名胜古迹 景区 公园', '餐厅 小吃街 美食', '地铁站 公交站 汽车站 机场 火车站', '景点 美食 地标']) {
  assert.ok(tencentMapSource.includes(keyword), `Tencent search category keyword should include ${keyword}`);
}

function assertNativeMapIncludePointsGuard(markup, label) {
  const mapBlocks = markup.match(/<map[\s\S]*?\/>/g) || [];
  assert.strictEqual(mapBlocks.length, 2, `${label} should render guarded native map variants`);
  const withBounds = mapBlocks.find((block) => block.includes('include-points="{{includePoints}}"'));
  const withoutBounds = mapBlocks.find((block) => !block.includes('include-points='));
  assert.ok(withBounds && withBounds.includes('wx:if="{{hasIncludePoints}}"'), `${label} should only bind include-points behind a non-empty guard`);
  assert.ok(withoutBounds && withoutBounds.includes('wx:else'), `${label} should render a map without include-points when bounds are empty`);
}
