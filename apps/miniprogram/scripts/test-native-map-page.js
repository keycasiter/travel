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

const source = fs.readFileSync(path.join(root, 'pages/region-map/index.ts'), 'utf8');
assert.ok(source.includes('scale: 16'), 'region map should default to street-level zoom');
assert.ok(source.includes('zoomToStreet'), 'region map should expose a street-level zoom action');
assert.ok(source.includes('openTraffic'), 'region map should expose traffic guidance from selected POI');
