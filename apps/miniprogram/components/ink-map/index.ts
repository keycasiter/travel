import type { Region } from '../../utils/types';
import { chinaProvinces } from '../../data/china-provinces';
import {
  ChinaMapFeature,
  GeoPoint,
  clampMapScale,
  computeChinaViewBounds,
  createFocusedViewport,
  createViewportProjector,
  findMapFeatureAtViewportPoint,
  projectRegionMarkers
} from '../../utils/map-geometry';

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number;
  startOffsetX: number;
  startOffsetY: number;
  startScale: number;
}

interface Point {
  clientX: number;
  clientY: number;
}

type DisplayRegion = Region & {
  markerLeft: number;
  markerTop: number;
  markerVisible: boolean;
};

interface CurrentLocation {
  lng: number;
  lat: number;
  label: string;
}

type DisplayCurrentLocation = CurrentLocation & {
  markerLeft: number;
  markerTop: number;
  markerVisible: boolean;
};

const CHINA_VIEW_BOUNDS = computeChinaViewBounds(chinaProvinces);

interface CanvasRuntime {
  canvas?: WechatMiniprogram.Canvas;
  ctx?: any;
  width: number;
  height: number;
  pixelRatio: number;
  canvasKey: string;
  drawTimer: number | null;
  drawInFlight: boolean;
  drawQueued: boolean;
  needsMarkerUpdate: boolean;
}

Component({
  properties: {
    regions: {
      type: Array,
      value: []
    },
    selectedRegionId: {
      type: String,
      value: ''
    },
    currentLocation: {
      type: Object,
      value: {}
    }
  },

  data: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    displayRegions: [] as DisplayRegion[],
    displayCurrentLocation: null as DisplayCurrentLocation | null,
    isInteracting: false,
    touchState: null as TouchState | null
  },

  lifetimes: {
    ready() {
      this.drawInkMap();
    }
  },

  observers: {
    regions() {
      this.drawInkMap();
    },
    selectedRegionId() {
      this.drawInkMap();
    },
    currentLocation() {
      this.drawInkMap();
    }
  },

  methods: {
    drawInkMap(updateMarkers = true) {
      const runtime = getRuntime(this);
      runtime.needsMarkerUpdate = runtime.needsMarkerUpdate || updateMarkers;
      if (runtime.drawTimer !== null || runtime.drawInFlight) {
        runtime.drawQueued = true;
        return;
      }

      runtime.drawTimer = setTimeout(() => {
        runtime.drawTimer = null;
        this.flushInkMapDraw();
      }, updateMarkers ? 0 : 16);
    },

    flushInkMapDraw() {
      const runtime = getRuntime(this);
      runtime.drawInFlight = true;
      this.resolveCanvasRuntime((resolved) => {
        const shouldUpdateMarkers = runtime.needsMarkerUpdate;
        runtime.needsMarkerUpdate = false;

        drawBackground(resolved.ctx, resolved.width, resolved.height);
        const projector = createViewportProjector(CHINA_VIEW_BOUNDS, {
          width: resolved.width,
          height: resolved.height,
          padding: Math.max(resolved.width * 0.075, 24),
          scale: this.data.scale,
          offsetX: this.data.offsetX,
          offsetY: this.data.offsetY
        });
        drawChinaLayer(resolved.ctx, projector.project, chinaProvinces, !shouldUpdateMarkers);
        if (shouldUpdateMarkers) {
          this.updateRegionMarkers(resolved.width, resolved.height);
        }

        runtime.drawInFlight = false;
        if (runtime.drawQueued) {
          const nextNeedsMarkerUpdate = runtime.needsMarkerUpdate;
          runtime.drawQueued = false;
          this.drawInkMap(nextNeedsMarkerUpdate);
        }
      });
    },

    resolveCanvasRuntime(callback: (runtime: CanvasRuntime) => void) {
      const runtime = getRuntime(this);
      if (runtime.canvas && runtime.ctx && runtime.width > 0 && runtime.height > 0) {
        callback(runtime);
        return;
      }

      const query = this.createSelectorQuery();
      query.select('#inkCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvas = res?.[0]?.node as WechatMiniprogram.Canvas | undefined;
        if (!canvas) {
          runtime.drawInFlight = false;
          return;
        }
        const width = Number(res[0].width || 320);
        const height = Number(res[0].height || 520);
        const pixelRatio = getPixelRatio();
        const canvasKey = `${width}:${height}:${pixelRatio}`;
        if (runtime.canvasKey !== canvasKey) {
          canvas.width = width * pixelRatio;
          canvas.height = height * pixelRatio;
          runtime.canvasKey = canvasKey;
        }
        const ctx = canvas.getContext('2d') as any;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        runtime.canvas = canvas;
        runtime.ctx = ctx;
        runtime.width = width;
        runtime.height = height;
        runtime.pixelRatio = pixelRatio;
        callback(runtime);
      });
    },

    updateRegionMarkers(width: number, height: number) {
      const projector = createViewportProjector(CHINA_VIEW_BOUNDS, {
        width,
        height,
        padding: Math.max(width * 0.075, 24),
        scale: this.data.scale,
        offsetX: this.data.offsetX,
        offsetY: this.data.offsetY
      });
      const regions = (this.data as unknown as { regions: Region[] }).regions || [];
      const markers = projectRegionMarkers(regions, projector).map((marker) => ({
        ...marker,
        markerLeft: marker.left,
        markerTop: marker.top,
        markerVisible: marker.left > -8 && marker.left < 108 && marker.top > -8 && marker.top < 108
      }));
      const currentLocation = (this.data as unknown as { currentLocation?: CurrentLocation }).currentLocation || null;
      let displayCurrentLocation: DisplayCurrentLocation | null = null;
      if (isValidLocation(currentLocation)) {
        const point = projector.project({ lng: currentLocation.lng, lat: currentLocation.lat });
        const markerLeft = (point.x / width) * 100;
        const markerTop = (point.y / height) * 100;
        displayCurrentLocation = {
          ...currentLocation,
          markerLeft,
          markerTop,
          markerVisible: markerLeft > -8 && markerLeft < 108 && markerTop > -8 && markerTop < 108
        };
      }
      this.setData({ displayRegions: markers, displayCurrentLocation });
    },

    tapRegion(event: WechatMiniprogram.TouchEvent) {
      const regionId = String(event.currentTarget.dataset.id || '');
      if (regionId) {
        this.triggerEvent('regiontap', { regionId });
      }
    },

    tapMap(event: WechatMiniprogram.TouchEvent) {
      const touch = (event.changedTouches as unknown as Point[])[0];
      if (!touch) {
        return;
      }

      const query = this.createSelectorQuery();
      query.select('#inkCanvas').boundingClientRect().exec((res) => {
        const rect = res?.[0] as WechatMiniprogram.BoundingClientRectCallbackResult | undefined;
        if (!rect) {
          return;
        }

        const width = Number(rect.width || 320);
        const height = Number(rect.height || 520);
        const viewport = {
          width,
          height,
          padding: Math.max(width * 0.075, 24),
          scale: this.data.scale,
          offsetX: this.data.offsetX,
          offsetY: this.data.offsetY
        };
        const feature = findMapFeatureAtViewportPoint(chinaProvinces, CHINA_VIEW_BOUNDS, viewport, {
          x: touch.clientX - Number(rect.left || 0),
          y: touch.clientY - Number(rect.top || 0)
        });
        if (!feature?.center) {
          return;
        }

        this.triggerEvent('featuretap', { name: feature.name, code: feature.code });
        this.focusLocation({ lng: feature.center[0], lat: feature.center[1], label: feature.name }, Math.max(this.data.scale, 1.68));
      });
    },

    locate() {
      this.triggerEvent('locate');
    },

    focusRegion(regionId: string) {
      const regions = (this.data as unknown as { regions: Region[] }).regions || [];
      const region = regions.find((item) => item.id === regionId);
      if (!region) {
        return;
      }
      this.focusLocation({ lng: region.centerLng, lat: region.centerLat, label: region.name }, 1.45);
    },

    focusLocation(location: CurrentLocation, scale = 1.7) {
      const query = this.createSelectorQuery();
      query.select('#inkCanvas').fields({ size: true }).exec((res) => {
        const width = Number(res?.[0]?.width || 320);
        const height = Number(res?.[0]?.height || 520);
        const viewport = createFocusedViewport(
          CHINA_VIEW_BOUNDS,
          {
            width,
            height,
            padding: Math.max(width * 0.075, 24),
            scale: this.data.scale,
            offsetX: this.data.offsetX,
            offsetY: this.data.offsetY
          },
          location,
          scale
        );
        this.setData(
          {
            scale: viewport.scale,
            offsetX: viewport.offsetX,
            offsetY: viewport.offsetY
          },
          () => this.drawInkMap()
        );
      });
    },

    zoomBy(event: WechatMiniprogram.TouchEvent) {
      const delta = Number(event.currentTarget.dataset.delta || 0);
      this.setData({ scale: clampMapScale(this.data.scale + delta * 0.28) }, () => this.drawInkMap());
    },

    resetView() {
      this.setData({ scale: 1, offsetX: 0, offsetY: 0 }, () => this.drawInkMap());
    },

    touchStart(event: WechatMiniprogram.TouchEvent) {
      const touches = event.touches as unknown as Point[];
      if (touches.length === 1) {
        this.setData({
          isInteracting: true,
          touchState: {
            startX: touches[0].clientX,
            startY: touches[0].clientY,
            startDistance: 0,
            startOffsetX: this.data.offsetX,
            startOffsetY: this.data.offsetY,
            startScale: this.data.scale
          }
        });
        return;
      }
      if (touches.length >= 2) {
        this.setData({
          isInteracting: true,
          touchState: {
            startX: touches[0].clientX,
            startY: touches[0].clientY,
            startDistance: distance(touches[0], touches[1]),
            startOffsetX: this.data.offsetX,
            startOffsetY: this.data.offsetY,
            startScale: this.data.scale
          }
        });
      }
    },

    touchMove(event: WechatMiniprogram.TouchEvent) {
      const state = this.data.touchState;
      if (!state) {
        return;
      }
      const touches = event.touches as unknown as Point[];
      if (touches.length === 1) {
        this.data.offsetX = state.startOffsetX + touches[0].clientX - state.startX;
        this.data.offsetY = state.startOffsetY + touches[0].clientY - state.startY;
        this.drawInkMap(false);
        return;
      }
      if (touches.length >= 2 && state.startDistance > 0) {
        const next = distance(touches[0], touches[1]);
        this.data.scale = clampMapScale(state.startScale * (next / state.startDistance));
        this.drawInkMap(false);
      }
    },

    touchEnd() {
      this.setData(
        {
          scale: this.data.scale,
          offsetX: this.data.offsetX,
          offsetY: this.data.offsetY,
          isInteracting: false,
          touchState: null
        },
        () => this.drawInkMap()
      );
    }
  }
});

function distance(a: Point, b: Point): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function isValidLocation(location: CurrentLocation | null): location is CurrentLocation {
  return !!location && Number.isFinite(location.lng) && Number.isFinite(location.lat);
}

function getRuntime(instance: unknown): CanvasRuntime {
  const host = instance as { __inkMapRuntime?: CanvasRuntime };
  if (!host.__inkMapRuntime) {
    host.__inkMapRuntime = {
      width: 0,
      height: 0,
      pixelRatio: 1,
      canvasKey: '',
      drawTimer: null,
      drawInFlight: false,
      drawQueued: false,
      needsMarkerUpdate: false
    };
  }
  return host.__inkMapRuntime;
}

function getPixelRatio(): number {
  const wxApi = wx as unknown as {
    getWindowInfo?: () => { pixelRatio?: number };
    getSystemInfoSync: () => { pixelRatio?: number };
  };
  if (wxApi.getWindowInfo) {
    return Math.min(wxApi.getWindowInfo().pixelRatio || 1, 2);
  }
  return Math.min(wxApi.getSystemInfoSync().pixelRatio || 1, 2);
}

function drawBackground(ctx: any, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fbf6e8');
  gradient.addColorStop(0.55, '#f2ead8');
  gradient.addColorStop(1, '#e3d4b8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawChinaLayer(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  features: ChinaMapFeature[],
  fastMode = false
): void {
  if (!fastMode) {
    drawFilledFeatures(ctx, project, features, 14, 16, 'rgba(79, 68, 43, 0.18)', 'rgba(79, 68, 43, 0)');
    drawFilledFeatures(ctx, project, features, 7, 8, 'rgba(62, 97, 78, 0.22)', 'rgba(62, 97, 78, 0)');
  }
  drawFilledFeatures(ctx, project, features, 0, 0, 'rgba(42, 103, 88, 0.92)', 'rgba(245, 238, 220, 0.5)');
  if (!fastMode) {
    drawLineFeatures(ctx, project, features);
  }
}

function drawFilledFeatures(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  features: ChinaMapFeature[],
  offsetX: number,
  offsetY: number,
  fillStyle: string,
  strokeStyle: string
): void {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = offsetX === 0 ? 0.8 : 0;
  ctx.shadowColor = offsetX === 0 ? 'rgba(31, 54, 49, 0.18)' : 'transparent';
  ctx.shadowBlur = offsetX === 0 ? 18 : 0;

  for (const feature of features) {
    if (!feature.rings) {
      continue;
    }
    for (const ring of feature.rings) {
      drawRingPath(ctx, project, ring, offsetX, offsetY);
      ctx.fill();
      if (offsetX === 0) {
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawLineFeatures(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  features: ChinaMapFeature[]
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(42, 103, 88, 0.6)';
  ctx.lineWidth = 1.2;
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([5, 6]);
  }

  for (const feature of features) {
    if (!feature.lines) {
      continue;
    }
    for (const line of feature.lines) {
      drawOpenPath(ctx, project, line);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawRingPath(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  ring: [number, number][],
  offsetX: number,
  offsetY: number
): void {
  ctx.beginPath();
  ring.forEach((tuple, index) => {
    const point = project({ lng: tuple[0], lat: tuple[1] });
    if (index === 0) {
      ctx.moveTo(point.x + offsetX, point.y + offsetY);
      return;
    }
    ctx.lineTo(point.x + offsetX, point.y + offsetY);
  });
  ctx.closePath();
}

function drawOpenPath(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  line: [number, number][]
): void {
  ctx.beginPath();
  line.forEach((tuple, index) => {
    const point = project({ lng: tuple[0], lat: tuple[1] });
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    ctx.lineTo(point.x, point.y);
  });
}
