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
assert.ok(componentSource.includes('getRegion'), 'explore map component should search category POIs inside the current visible map viewport');
assert.ok(componentSource.includes('suggestTencentPlaces'), 'explore map component should request Tencent suggestions while typing');
assert.ok(componentSource.includes('getTencentLocationContext'), 'explore map component should describe the current location with Tencent reverse geocoding');
assert.ok(componentSource.includes('previewTencentRoutes'), 'explore map component should preview Tencent route plans for selected POIs');
assert.ok(componentSource.includes('searchThisArea'), 'explore map component should expose a search-this-area action after map movement');
assert.ok(componentSource.includes('activePlace'), 'explore map component should keep the selected POI for the exploration card');
assert.ok(componentSource.includes('routePlans'), 'explore map component should keep route previews for selected POIs');
assert.ok(componentSource.includes('searchSuggestions'), 'explore map component should keep Tencent suggestion results');
assert.ok(componentSource.includes('selectSuggestion'), 'explore map component should let users pick a Tencent suggestion');
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
assert.ok(componentMarkup.includes('searchSuggestions'), 'explore map should render Tencent search suggestions');
assert.ok(componentMarkup.includes('selectSuggestion'), 'explore map should allow selecting a Tencent search suggestion');
assert.ok(componentMarkup.includes('searchThisArea'), 'explore map should render a search-this-area button after map movement');
assert.ok(componentMarkup.includes('activePlace'), 'explore map should render a selected POI exploration card');
assert.ok(componentMarkup.includes('routePlans'), 'explore map should render Tencent route previews');
assert.ok(componentMarkup.includes('areaContext'), 'explore map should render current-location context');
assert.ok(componentMarkup.includes('joinItinerary'), 'explore map should expose an add-to-itinerary action');
assert.ok(componentMarkup.includes('favoriteActivePlace'), 'explore map should expose a favorite action for selected POIs');
assert.ok(componentMarkup.includes('tapSearchCategory'), 'explore map should expose nearby category buttons');

assert.ok(!exploreSource.includes('chinaProvinces'), 'explore page must not import GeoJSON province data');
assert.ok(!exploreSource.includes('已定位到'), 'explore page should not keep located-to status copy over the map');
assert.ok(!exploreMarkup.includes('status-card'), 'explore page should not render location status text over the map');
assert.ok(!geometrySource.includes('ChinaMapFeature'), 'map geometry utilities should not keep GeoJSON feature types');
assert.ok(!geometrySource.includes('findContainingMapFeature'), 'map geometry utilities should not keep GeoJSON hit testing');
assert.ok(!includeValues.has('data/china-provinces.js'), 'DevTools package should not force-include abandoned GeoJSON data');
assert.ok(includeValues.has('utils/tencent-map.js'), 'DevTools package should force-include Tencent search runtime JS');

assert.ok(!configSource.includes('TENCENT_MAP_KEY'), 'mini program config must not expose Tencent WebService key');
assert.ok(!configSource.includes('TENCENT_MAP_SEARCH_URL'), 'mini program config must not expose Tencent WebService URL');
assert.ok(!tencentMapSource.includes('apis.map.qq.com'), 'mini program must not call Tencent WebService directly');
assert.ok(!tencentMapSource.includes('wx.request'), 'Tencent search helper should use the local API request wrapper');
assert.ok(tencentMapSource.includes('/api/v1/map/places/search'), 'Tencent search helper should call the signed Go API proxy');
assert.ok(tencentMapSource.includes('/api/v1/map/places/suggest'), 'Tencent search helper should call the signed Go API suggestion proxy');
assert.ok(tencentMapSource.includes('/api/v1/map/location/context'), 'Tencent search helper should call the signed Go API reverse geocoder proxy');
assert.ok(tencentMapSource.includes('/api/v1/map/routes/preview'), 'Tencent search helper should call the signed Go API route preview proxy');
assert.ok(tencentMapSource.includes('lat'), 'Tencent search helper should pass the current map center latitude');
assert.ok(tencentMapSource.includes('lng'), 'Tencent search helper should pass the current map center longitude');
assert.ok(tencentMapSource.includes('swLat'), 'Tencent search helper should pass the viewport southwest latitude for rectangle search');
assert.ok(tencentMapSource.includes('neLng'), 'Tencent search helper should pass the viewport northeast longitude for rectangle search');
assert.ok(tencentMapSource.includes('categories'), 'Tencent search helper should pass Tencent category filters');
assert.ok(tencentMapSource.includes('boundary'), 'Tencent search helper should select Tencent boundary mode');
assert.ok(tencentMapSource.includes('radiusMeters'), 'Tencent search helper should pass the nearby search radius');
assert.ok(tencentMapSource.includes('pageSize'), 'Tencent search helper should bound API proxy result count');
for (const label of ['地标', '景观', '美食', '交通', '灵感']) {
  assert.ok(tencentMapSource.includes(label), `Tencent search categories should include ${label}`);
}
for (const keyword of ['地标', '景点', '美食', '交通', '灵感']) {
  assert.ok(tencentMapSource.includes(keyword), `Tencent search category keyword should include ${keyword}`);
}
for (const category of ['旅游景点', '文化场馆', '美食', '交通设施']) {
  assert.ok(tencentMapSource.includes(category), `Tencent category filters should include ${category}`);
}

function assertNativeMapIncludePointsGuard(markup, label) {
  const mapBlocks = markup.match(/<map[\s\S]*?\/>/g) || [];
  assert.strictEqual(mapBlocks.length, 2, `${label} should render guarded native map variants`);
  const withBounds = mapBlocks.find((block) => block.includes('include-points="{{includePoints}}"'));
  const withoutBounds = mapBlocks.find((block) => !block.includes('include-points='));
  assert.ok(withBounds && withBounds.includes('wx:if="{{hasIncludePoints}}"'), `${label} should only bind include-points behind a non-empty guard`);
  assert.ok(withoutBounds && withoutBounds.includes('wx:else'), `${label} should render a map without include-points when bounds are empty`);
}
