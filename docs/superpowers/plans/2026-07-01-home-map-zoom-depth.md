# Home Map Zoom Depth Implementation Plan

**Goal:** Land a local, multi-depth ink map experience on the Mini Program homepage so zooming into Hangzhou reveals progressively richer visual detail instead of simply scaling one bitmap.

**Architecture:** Keep the homepage bitmap-first. Add deterministic Hangzhou overlay assets generated from the existing master map and local POI data, wire visual depth state into `components/ink-map`, and extend existing Node checks to protect asset inclusion, package size, and no-third-party-map boundaries.

## File Structure

| File | Responsibility |
|---|---|
| `apps/miniprogram/scripts/generate-map-depth-assets.py` | Reproducibly generates Hangzhou focus, area texture, and POI detail overlays |
| `apps/miniprogram/assets/maps/home-map-hangzhou-focus.jpg` | City focus raster layer |
| `apps/miniprogram/assets/maps/home-map-hangzhou-areas.png` | Transparent area texture layer |
| `apps/miniprogram/assets/maps/home-map-hangzhou-poi-detail.png` | Transparent POI detail layer |
| `apps/miniprogram/components/ink-map/home-map-layers.ts` | Defines zoom thresholds and semantic layer boundaries |
| `apps/miniprogram/components/ink-map/index.ts` | Tracks visual depth and keeps layer items in sync with zoom |
| `apps/miniprogram/components/ink-map/index.wxml` | Renders depth image layers beneath native hotspots |
| `apps/miniprogram/components/ink-map/index.wxss` | Crossfades depth image layers and keeps markers readable |
| `apps/miniprogram/scripts/test-map-performance.js` | Enforces map assets and homepage bitmap constraints |
| `apps/miniprogram/scripts/test-home-map-layers.js` | Enforces zoom-depth state and semantic item behavior |

## Tasks

- [ ] Generate local Hangzhou depth assets from the current map master.
- [ ] Raise zoom thresholds so city focus, area, and POI are distinct states.
- [ ] Add `visualDepthLevel` to the map component and crossfade the proper raster layers.
- [ ] Include the new assets in DevTools packaging rules.
- [ ] Extend automated checks for assets, layer classes, and no native map regression.
- [ ] Run build, typecheck, map checks, UI checks, and DevTools compile/preview.
