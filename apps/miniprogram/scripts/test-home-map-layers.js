const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentSource = read('components/ink-map/index.ts');
const componentMarkup = read('components/ink-map/index.wxml');
const componentStyles = read('components/ink-map/index.wxss');
const packageJson = JSON.parse(read('package.json'));
const layerConfigPath = path.join(root, 'components/ink-map/home-map-layers.ts');

assert.ok(fs.existsSync(layerConfigPath), 'homepage semantic map layer data should live in home-map-layers.ts');

const layerConfig = fs.existsSync(layerConfigPath) ? fs.readFileSync(layerConfigPath, 'utf8') : '';

for (const required of [
  'HOME_MAP_ZOOM_LEVELS',
  'HomeMapVisualDepth',
  'HANGZHOU_AREAS',
  'HANGZHOU_POIS',
  'getSemanticLayer',
  'getVisualDepthLevel',
  'filterLayerItems',
  'cityMin',
  'areaMin',
  'poiMin',
  'city-hangzhou',
  '西湖',
  '灵隐',
  '湖滨',
  '地标',
  '美食',
  '交通'
]) {
  assert.ok(layerConfig.includes(required), `home map layer data should include ${required}`);
}

for (const required of [
  'HOME_MAP_ZOOM_LEVELS',
  'getLayerItems',
  'getSemanticLayer',
  'getVisualDepthLevel',
  'semanticLayer',
  'visualDepthLevel',
  'cityFocusImage',
  'areaDetailImage',
  'poiDetailImage',
  'selectedMapItem',
  'layerItems',
  'pinchStartDistance',
  'pinchStartScale',
  'tapLayerMarker',
  'goPlanWithSelectedItem',
  'openStreetMapWithSelectedItem'
]) {
  assert.ok(componentSource.includes(required), `ink map component should implement ${required}`);
}

for (const required of [
  '搜索杭州好玩的',
  'hero-map-layer-{{visualDepthLevel}}',
  'hero-map-depth-city',
  'hero-map-depth-area',
  'hero-map-depth-poi',
  'layer-marker',
  'area-marker',
  'poi-marker',
  'tapLayerMarker',
  'home-map-sheet',
  'selectedMapItem',
  'goPlanWithSelectedItem',
  'openStreetMapWithSelectedItem'
]) {
  assert.ok(componentMarkup.includes(required), `ink map markup should render ${required}`);
}

for (const required of [
  '.hero-map-depth',
  '.hero-map-layer-city',
  '.layer-marker',
  '.area-marker',
  '.poi-marker',
  '.home-map-sheet',
  '.home-map-sheet-scroll',
  '.zoom-controls'
]) {
  assert.ok(componentStyles.includes(required), `ink map styles should include ${required}`);
}

for (const removedUi of [
  'map-layer-status',
  'map-layer-chip',
  'resetHeroMap',
  'calibration-toggle',
  'calibration-overlay'
]) {
  assert.ok(!componentMarkup.includes(removedUi), `ink map should not render removed homepage control ${removedUi}`);
  assert.ok(!componentStyles.includes(`.${removedUi}`), `ink map styles should not keep removed homepage control ${removedUi}`);
}

assert.ok(componentSource.includes('selectedMapItem: null'), 'first screen should not open a half-screen map sheet by default');
assert.ok(!componentSource.includes('selectedMapItem: build'), 'first screen should not prebuild the selected map sheet');
assert.ok(componentSource.includes('MIN_HERO_SCALE = 1'), 'national view should remain the default map scale');
assert.ok(componentSource.includes('MAX_HERO_SCALE = HOME_MAP_ZOOM_LEVELS.poiMax'), 'homepage should support the local detailed POI zoom ceiling');
assert.ok(layerConfig.includes('cityMin: 1.05'), 'city focus layer should have a distinct zoom threshold');
assert.ok(layerConfig.includes('areaMin: 1.18'), 'area layer should not appear during the light Hangzhou focus zoom');
assert.ok(layerConfig.includes('poiMin: 1.35'), 'POI layer should require a deeper zoom than area labels');
assert.ok(packageJson.scripts['test:home-map-layers'], 'package scripts should expose the home map layer test');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
