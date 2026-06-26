const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { chinaProvinces } = require('../data/china-provinces.js');

const pointCount = chinaProvinces.reduce((total, feature) => {
  const ringPoints = (feature.rings || []).reduce((sum, ring) => sum + ring.length, 0);
  const linePoints = (feature.lines || []).reduce((sum, line) => sum + line.length, 0);
  return total + ringPoints + linePoints;
}, 0);
assert.ok(pointCount <= 2600, `ink map should keep simplified map data under 2600 points, got ${pointCount}`);

const componentSource = fs.readFileSync(path.resolve(__dirname, '../components/ink-map/index.ts'), 'utf8');
const touchMoveStart = componentSource.indexOf('touchMove(event: WechatMiniprogram.TouchEvent)');
assert.ok(touchMoveStart >= 0, 'ink-map component should define touchMove');
const touchMoveEnd = componentSource.indexOf('touchEnd()', touchMoveStart);
assert.ok(touchMoveEnd > touchMoveStart, 'ink-map component should define touchEnd after touchMove');
const touchMoveSource = componentSource.slice(touchMoveStart, touchMoveEnd);
assert.ok(!touchMoveSource.includes('setData('), 'touchMove must not call setData on every frame');
assert.ok(touchMoveSource.includes('drawInkMap(false)'), 'touchMove should schedule a non-marker canvas redraw');
