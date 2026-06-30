const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

assertContains('app.wxss', [
  '.app-paper-bg',
  '.ink-card',
  '.seal-badge',
  '.primary-cta',
  '--travel-jade'
]);

assertContains('pages/itinerary/index.wxml', [
  'itinerary-hero',
  'planning-step',
  'preference-chip',
  'butler-grid',
  'timeline-item',
  '生成行程'
]);
assertContains('pages/itinerary/index.wxss', [
  '.itinerary-hero',
  '.planning-panel',
  '.butler-grid',
  '.timeline-dot',
  '.generate-button'
]);

assertContains('pages/favorite/index.wxml', [
  'favorite-tabs',
  'favorite-card',
  'favorite-empty',
  '加入行程'
]);
assertContains('pages/favorite/index.wxss', [
  '.favorite-tabs',
  '.favorite-card',
  '.favorite-stamp'
]);

assertContains('pages/mine/index.wxml', [
  'profile-hero',
  'mine-stats',
  'sync-panel',
  'settings-list'
]);
assertContains('pages/mine/index.wxss', [
  '.profile-hero',
  '.mine-stats',
  '.setting-row'
]);

assertContains('pages/share/index.wxml', [
  'share-notice',
  'share-hero',
  'share-tabs',
  'share-timeline',
  '收藏副本'
]);
assertContains('pages/share/index.wxss', [
  '.share-hero',
  '.share-timeline',
  '.share-action-bar'
]);

assertContains('pages/region-map/index.wxml', [
  'map-filter-chips',
  'poi-sheet',
  '加入行程',
  '收藏'
]);
assertContains('pages/region-map/index.wxss', [
  '.map-filter-chips',
  '.poi-sheet',
  '.poi-action-row'
]);

function assertContains(relativePath, patterns) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const pattern of patterns) {
    assert.ok(content.includes(pattern), `${relativePath} should include ${pattern}`);
  }
}
