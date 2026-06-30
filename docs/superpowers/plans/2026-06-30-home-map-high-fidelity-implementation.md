# Home Map High Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Upgrade the Mini Program home exploration map from a working bitmap prototype into a maintainable high-fidelity bitmap map system with source metadata, extracted city hotspot data, and a developer calibration mode.

**Architecture:** Keep the home page as a bitmap-first surface and keep real street-level map features in `pages/region-map`. Split map content data from `components/ink-map/index.ts`, add map resource metadata under `docs/assets/maps`, and extend existing Node-based checks so future changes cannot silently reintroduce native map or Tencent POI logic on the homepage.

**Tech Stack:** Native WeChat Mini Program, TypeScript, WXSS/WXML, Node assertion scripts, local raster assets.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/miniprogram/components/ink-map/city-hotspots.ts` | Defines `DiscoveryId`, `CityHotspot`, `DISCOVERY_CHIPS`, and `CITY_HOTSPOTS` for the 8 seed cities |
| `apps/miniprogram/components/ink-map/index.ts` | Uses extracted hotspot config, controls pan/zoom, search, city card, and calibration state |
| `apps/miniprogram/components/ink-map/index.wxml` | Renders bitmap layer, hotspots, controls, city card, and dev-only calibration overlay |
| `apps/miniprogram/components/ink-map/index.wxss` | Styles high-fidelity bitmap map, hotspot layer, city card, and calibration overlay |
| `apps/miniprogram/assets/maps/home-map-mobile.jpg` | Runtime mobile hero map asset |
| `docs/assets/maps/home-map-master.jpg` | Archived high-resolution master reference for current implementation |
| `docs/assets/maps/home-map-preview.jpg` | Smaller review preview |
| `docs/assets/maps/home-map-metadata.md` | Records source, processing, review status, and compliance boundary |
| `apps/miniprogram/scripts/test-map-performance.js` | Enforces homepage bitmap, extracted hotspot config, calibration controls, asset metadata, and no native map/Tencent POI logic |

## Task 1: Resource Metadata And Runtime Asset Contract

**Files:**
- Create: `docs/assets/maps/home-map-metadata.md`
- Create: `docs/assets/maps/home-map-master.jpg`
- Create: `docs/assets/maps/home-map-preview.jpg`
- Create: `apps/miniprogram/assets/maps/home-map-mobile.jpg`
- Modify: `apps/miniprogram/scripts/test-map-performance.js`

- [x] **Step 1: Write the failing test**

Add assertions to `apps/miniprogram/scripts/test-map-performance.js`:

```js
const mobileHeroImagePath = path.join(root, 'assets/maps/home-map-mobile.jpg');
const legacyHeroImagePath = path.join(root, 'assets/maps/china-relief-home.jpg');
const metadataPath = path.resolve(root, '..', '..', 'docs/assets/maps/home-map-metadata.md');

assert.ok(fs.existsSync(mobileHeroImagePath), 'homepage should include the production mobile map asset');
assert.ok(!componentSource.includes('china-relief-home.jpg'), 'homepage should not reference the prototype map filename');
assert.ok(fs.existsSync(metadataPath), 'homepage map should include source and compliance metadata');

const metadata = fs.readFileSync(metadataPath, 'utf8');
assert.ok(metadata.includes('标准地图服务系统'), 'metadata should record the standard map source boundary');
assert.ok(metadata.includes('内部原型'), 'metadata should state current review status');
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/miniprogram && npm run test:map-performance`

Expected: FAIL because `home-map-mobile.jpg` and metadata do not exist yet, and the component still references `china-relief-home.jpg`.

- [x] **Step 3: Add metadata and asset copies**

Create `docs/assets/maps/`, copy the current image into the master/runtime paths, generate a preview, and write metadata:

```bash
mkdir -p docs/assets/maps apps/miniprogram/assets/maps
cp apps/miniprogram/assets/maps/china-relief-home.jpg docs/assets/maps/home-map-master.jpg
cp apps/miniprogram/assets/maps/china-relief-home.jpg apps/miniprogram/assets/maps/home-map-mobile.jpg
sips -z 1440 1080 apps/miniprogram/assets/maps/home-map-mobile.jpg --out docs/assets/maps/home-map-preview.jpg
```

Metadata must include:

```md
# 首页地图资源元数据

## 当前状态

| 字段 | 内容 |
|---|---|
| 资源版本 | `home-map-v1-prototype` |
| 运行资源 | `apps/miniprogram/assets/maps/home-map-mobile.jpg` |
| 母版资源 | `docs/assets/maps/home-map-master.jpg` |
| 预览资源 | `docs/assets/maps/home-map-preview.jpg` |
| 来源基准 | 自然资源部标准地图服务系统：`http://bzdt.ch.mnr.gov.cn/` |
| 审图号 | 当前资源为内部原型图，未作为对外上线审图底图 |
| 下载日期 | 未下载正式标准地图 |
| 处理方式 | 当前使用已生成的水墨玉石 2.5D 位图作为交互原型，后续对外上线前需基于标准地图重新制图 |
| 是否改变底图 | 当前资源不是正式标准地图加工件 |

## 上线边界

当前资源可用于内部原型和交互验收。对外展示或上线前，需要以自然资源部标准地图服务系统下载的标准地图为形状基准重新制作母版，记录标准地图名称、审图号、下载日期和处理方式，并确认是否需要重新送审。
```

- [x] **Step 4: Update component image constant**

Change `MAP_HERO_IMAGE` in `apps/miniprogram/components/ink-map/index.ts`:

```ts
const MAP_HERO_IMAGE = '/assets/maps/home-map-mobile.jpg';
```

- [x] **Step 5: Run test to verify it passes**

Run: `cd apps/miniprogram && npm run test:map-performance`

Expected: PASS.

## Task 2: Extract City Hotspot Data

**Files:**
- Create: `apps/miniprogram/components/ink-map/city-hotspots.ts`
- Modify: `apps/miniprogram/components/ink-map/index.ts`
- Modify: `apps/miniprogram/scripts/test-map-performance.js`

- [x] **Step 1: Write the failing test**

Add checks:

```js
const hotspotSourcePath = path.join(root, 'components/ink-map/city-hotspots.ts');
assert.ok(fs.existsSync(hotspotSourcePath), 'homepage city hotspots should live in a dedicated config file');
const hotspotSource = fs.readFileSync(hotspotSourcePath, 'utf8');
for (const cityId of ['city-beijing', 'city-shanghai', 'city-hangzhou', 'city-chengdu', 'city-xian', 'city-guangzhou', 'city-shenzhen', 'city-xiamen']) {
  assert.ok(hotspotSource.includes(cityId), `hotspot config should include ${cityId}`);
}
assert.ok(componentSource.includes("from './city-hotspots'"), 'ink map should import hotspot config');
assert.ok(!componentSource.includes('notes: {'), 'ink map component should not inline city copy');
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/miniprogram && npm run test:map-performance`

Expected: FAIL because `city-hotspots.ts` does not exist and component data is still inline.

- [x] **Step 3: Create hotspot config**

Move `DiscoveryId`, `DiscoveryChip`, `CityHotspot`, `SelectedCityCard`, `DISCOVERY_CHIPS`, and `CITY_HOTSPOTS` into `apps/miniprogram/components/ink-map/city-hotspots.ts`.

Export:

```ts
export type DiscoveryId = 'landmark' | 'scenic' | 'food' | 'transport' | 'inspiration';

export interface DiscoveryChip {
  id: DiscoveryId;
  label: string;
}

export interface CityHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  recommendedDays: string;
  mood: string;
  summary: string;
  tags: string[];
  notes: Record<DiscoveryId, string>;
}

export interface SelectedCityCard extends CityHotspot {
  activeDiscoveryLabel: string;
  activeDiscoveryNote: string;
}
```

- [x] **Step 4: Import config in component**

Replace inline definitions in `index.ts` with:

```ts
import {
  CITY_HOTSPOTS,
  DISCOVERY_CHIPS,
  type CityHotspot,
  type DiscoveryId,
  type SelectedCityCard
} from './city-hotspots';
```

- [x] **Step 5: Run test and typecheck**

Run:

```bash
cd apps/miniprogram
npm run test:map-performance
npm run typecheck
```

Expected: both PASS.

## Task 3: Developer Calibration Mode

**Files:**
- Modify: `apps/miniprogram/components/ink-map/index.ts`
- Modify: `apps/miniprogram/components/ink-map/index.wxml`
- Modify: `apps/miniprogram/components/ink-map/index.wxss`
- Modify: `apps/miniprogram/scripts/test-map-performance.js`

- [x] **Step 1: Write the failing test**

Add checks:

```js
for (const required of ['calibrationEnabled', 'calibrationPoint', 'toggleCalibrationMode', 'markCalibrationPoint', 'copyCalibrationPoint']) {
  assert.ok(componentSource.includes(required), `homepage should support dev calibration: ${required}`);
}
assert.ok(componentMarkup.includes('calibration-overlay'), 'homepage should render calibration overlay');
assert.ok(componentMarkup.includes('markCalibrationPoint'), 'homepage should capture calibration taps');
assert.ok(componentMarkup.includes('copyCalibrationPoint'), 'homepage should copy calibration coordinates');
assert.ok(componentStyles.includes('.calibration-overlay'), 'homepage should style calibration overlay');
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/miniprogram && npm run test:map-performance`

Expected: FAIL because calibration fields and markup do not exist.

- [x] **Step 3: Add calibration state and methods**

Add data:

```ts
calibrationEnabled: false,
calibrationPoint: null as { x: number; y: number; left: string; top: string; snippet: string } | null
```

Add methods:

```ts
toggleCalibrationMode() {
  this.setData({
    calibrationEnabled: !this.data.calibrationEnabled,
    calibrationPoint: null
  });
},

markCalibrationPoint(event: WechatMiniprogram.TouchEvent) {
  if (!this.data.calibrationEnabled) {
    return;
  }
  const touch = firstChangedTouch(event);
  if (!touch) {
    return;
  }
  const query = this.createSelectorQuery();
  query.select('.hero-map-stage').boundingClientRect((rect) => {
    const box = rect as WechatMiniprogram.BoundingClientRectCallbackResult;
    if (!box || !box.width || !box.height) {
      return;
    }
    const x = clampPercent(((touch.clientX - box.left) / box.width) * 100);
    const y = clampPercent(((touch.clientY - box.top) / box.height) * 100);
    this.setData({
      calibrationPoint: {
        x,
        y,
        left: `${x}%`,
        top: `${y}%`,
        snippet: `x: ${x}, y: ${y}`
      }
    });
    console.info(`[home-map-calibration] x=${x}, y=${y}`);
  }).exec();
},

copyCalibrationPoint() {
  const point = this.data.calibrationPoint;
  if (!point) {
    wx.showToast({ title: '先点地图取坐标', icon: 'none' });
    return;
  }
  wx.setClipboardData({ data: point.snippet });
}
```

Add helpers:

```ts
function firstChangedTouch(event: WechatMiniprogram.TouchEvent): WechatMiniprogram.TouchDetail | null {
  const touches = event.changedTouches || event.touches || [];
  return touches.length > 0 ? touches[0] : null;
}

function clampPercent(value: number): number {
  return Number(Math.max(0, Math.min(100, value)).toFixed(2));
}
```

- [x] **Step 4: Add WXML controls**

Add a small dev button and overlay:

```xml
<button class="calibration-toggle" catchtap="toggleCalibrationMode">标定</button>
<view wx:if="{{calibrationEnabled}}" class="calibration-overlay" catchtap="markCalibrationPoint">
  <view wx:if="{{calibrationPoint}}" class="calibration-cross" style="left: {{calibrationPoint.left}}; top: {{calibrationPoint.top}};"></view>
  <button wx:if="{{calibrationPoint}}" class="calibration-copy" catchtap="copyCalibrationPoint">{{calibrationPoint.snippet}}</button>
</view>
```

- [x] **Step 5: Add WXSS styles**

Add `.calibration-toggle`, `.calibration-overlay`, `.calibration-cross`, and `.calibration-copy`.

- [x] **Step 6: Run tests**

Run:

```bash
cd apps/miniprogram
npm run test:map-performance
npm run test:components
npm run typecheck
```

Expected: all PASS.

## Task 4: Final Verification And Commit

**Files:**
- All modified files

- [x] **Step 1: Run complete Mini Program checks**

Run:

```bash
cd apps/miniprogram
npm run test:map-performance
npm run test:map
npm run test:native-map-page
npm run test:components
npm run check:devtools
npm run typecheck
```

Expected: all commands exit 0.

- [x] **Step 2: Check asset dimensions and size**

Run:

```bash
sips -g pixelWidth -g pixelHeight -g format apps/miniprogram/assets/maps/home-map-mobile.jpg
du -h apps/miniprogram/assets/maps/home-map-mobile.jpg docs/assets/maps/home-map-master.jpg docs/assets/maps/home-map-preview.jpg
```

Expected: runtime image is 2048×2732 JPEG and under 2MB.

- [x] **Step 3: Check git diff hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only plan/resource/home-map files are modified.

- [x] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-30-home-map-high-fidelity-implementation.md docs/assets/maps apps/miniprogram/assets/maps/home-map-mobile.jpg apps/miniprogram/components/ink-map apps/miniprogram/scripts/test-map-performance.js
git commit -m "feat(miniprogram): add high fidelity map calibration"
```
