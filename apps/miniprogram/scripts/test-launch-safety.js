const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exploreSource = fs.readFileSync(path.join(root, 'pages/explore/index.ts'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'utils/api.ts'), 'utf8');

const bootstrapBody = extractMethodBody(exploreSource, 'bootstrap');
assert.ok(bootstrapBody, 'explore page should define bootstrap()');
assert.ok(!bootstrapBody.includes('login('), 'explore bootstrap must not auto call wx.login on first paint');
assert.ok(!bootstrapBody.includes('loadRegions('), 'explore bootstrap must not auto request API data on first paint');
assert.ok(!bootstrapBody.includes('requestLocation('), 'explore bootstrap must not auto request location on first paint');

const locateBody = extractMethodBody(exploreSource, 'onLocate');
assert.ok(locateBody && locateBody.includes('requestLocation('), 'location should remain available from the locate control');

assert.ok(
  /wx\.request<[\s\S]*?\(\{[\s\S]*?timeout:\s*\d+/m.test(apiSource),
  'API requests must set a timeout so DevTools/API stalls do not block the launch flow'
);

function extractMethodBody(source, methodName) {
  const methodPattern = new RegExp(`\\b(?:async\\s+)?${methodName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = methodPattern.exec(source);
  if (!match) {
    return '';
  }
  let depth = 1;
  let index = match.index + match[0].length;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
    index += 1;
  }
  return source.slice(match.index + match[0].length, index - 1);
}
