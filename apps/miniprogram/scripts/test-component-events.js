const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentsRoot = path.join(root, 'components');
const componentNames = fs.readdirSync(componentsRoot).filter((name) => fs.statSync(path.join(componentsRoot, name)).isDirectory());
const missingHandlers = [];

for (const componentName of componentNames) {
  const componentRoot = path.join(componentsRoot, componentName);
  const wxmlPath = path.join(componentRoot, 'index.wxml');
  const tsPath = path.join(componentRoot, 'index.ts');
  if (!fs.existsSync(wxmlPath) || !fs.existsSync(tsPath)) {
    continue;
  }

  const handlers = extractEventHandlers(fs.readFileSync(wxmlPath, 'utf8'));
  const methods = extractComponentMethods(fs.readFileSync(tsPath, 'utf8'));
  for (const handler of handlers) {
    if (!methods.has(handler)) {
      missingHandlers.push(`${path.relative(root, wxmlPath)}:${handler}`);
    }
  }
}

assert.deepStrictEqual(missingHandlers, [], `component WXML event handlers must exist in methods: ${missingHandlers.join(', ')}`);

function extractEventHandlers(wxml) {
  const handlers = new Set();
  const pattern = /\b(?:bind|catch)(?::|[a-z])[\w-]*="([^"{]+)"/g;
  let match = pattern.exec(wxml);
  while (match) {
    handlers.add(match[1]);
    match = pattern.exec(wxml);
  }
  return handlers;
}

function extractComponentMethods(source) {
  const methods = new Set();
  const methodsIndex = source.indexOf('methods:');
  if (methodsIndex < 0) {
    return methods;
  }

  const blockStart = source.indexOf('{', methodsIndex);
  const blockEnd = source.lastIndexOf('}');
  const block = source.slice(blockStart + 1, blockEnd);
  const pattern = /^\s*([A-Za-z_$][\w$]*)\s*\(/gm;
  let match = pattern.exec(block);
  while (match) {
    methods.add(match[1]);
    match = pattern.exec(block);
  }
  return methods;
}
