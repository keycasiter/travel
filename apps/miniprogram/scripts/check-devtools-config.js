const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const projectConfigPath = path.join(root, 'project.config.json');
const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

const compilerPlugins = config.setting && config.setting.useCompilerPlugins;
if (compilerPlugins !== false) {
  throw new Error('project.config.json must disable DevTools TypeScript compiler and use checked-in runtime JS');
}

if (config.setting && config.setting.ignoreDevUnusedFiles !== false) {
  throw new Error('project.config.json must explicitly disable setting.ignoreDevUnusedFiles');
}

const runtimeFiles = [
  'app.js',
  'pages/explore/index.js',
  'pages/itinerary/index.js',
  'pages/favorite/index.js',
  'pages/mine/index.js',
  'pages/share/index.js',
  'components/ink-map/index.js',
  'components/bottom-sheet/index.js',
  'utils/api.js',
  'utils/config.js',
  'utils/map-geometry.js',
  'data/china-provinces.js'
];

const includeValues = new Set(((config.packOptions && config.packOptions.include) || []).map((rule) => rule.value));
const missingIncludes = runtimeFiles.filter((value) => !includeValues.has(value));
if (missingIncludes.length > 0) {
  throw new Error(`project.config.json packOptions.include must keep runtime files: ${missingIncludes.join(', ')}`);
}

const missingRuntimeFiles = runtimeFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missingRuntimeFiles.length > 0) {
  throw new Error(`run npm run build:runtime to generate runtime JS files: ${missingRuntimeFiles.join(', ')}`);
}

const missingTabIcons = [];
for (const tab of appConfig.tabBar.list || []) {
  for (const key of ['iconPath', 'selectedIconPath']) {
    if (!tab[key] || !fs.existsSync(path.join(root, tab[key]))) {
      missingTabIcons.push(`${tab.pagePath}:${key}`);
    }
  }
}

if (missingTabIcons.length > 0) {
  throw new Error(`tabBar icon files are missing: ${missingTabIcons.join(', ')}`);
}

const mapData = require(path.join(root, 'data/china-provinces.js'));
if (!Array.isArray(mapData.chinaProvinces) || mapData.chinaProvinces.length < 34) {
  throw new Error('data/china-provinces.js must contain province-level China map data');
}
