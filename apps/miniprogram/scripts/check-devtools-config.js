const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const projectConfigPath = path.join(root, 'project.config.json');
const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));

const compilerPlugins = config.setting && config.setting.useCompilerPlugins;
if (!Array.isArray(compilerPlugins) || !compilerPlugins.includes('typescript')) {
  throw new Error('project.config.json must enable setting.useCompilerPlugins: ["typescript"]');
}

if (config.srcMiniprogramRoot !== config.miniprogramRoot) {
  throw new Error('project.config.json must set srcMiniprogramRoot to the same value as miniprogramRoot for TypeScript compilation');
}

const disallowedGeneratedJs = [
  'app.js',
  'pages/explore/index.js',
  'pages/itinerary/index.js',
  'pages/favorite/index.js',
  'pages/mine/index.js',
  'pages/share/index.js',
  'components/ink-map/index.js',
  'components/bottom-sheet/index.js'
];

const existing = disallowedGeneratedJs.filter((file) => fs.existsSync(path.join(root, file)));
if (existing.length > 0) {
  throw new Error(`remove DevTools generated JS files and let the TypeScript compiler plugin build them: ${existing.join(', ')}`);
}
