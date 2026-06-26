import type { Region } from '../../utils/types';
import { chinaProvinces } from '../../data/china-provinces';
import {
  ChinaMapFeature,
  GeoPoint,
  clampMapScale,
  computeGeoBounds,
  createFocusedViewport,
  createViewportProjector,
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

const CHINA_BOUNDS = computeGeoBounds(chinaProvinces);

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
    drawInkMap() {
      const query = this.createSelectorQuery();
      query.select('#inkCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvas = res?.[0]?.node as WechatMiniprogram.Canvas | undefined;
        if (!canvas) {
          return;
        }
        const width = Number(res[0].width || 320);
        const height = Number(res[0].height || 520);
        const pixelRatio = getPixelRatio();
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        const ctx = canvas.getContext('2d') as any;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, width, height);

        drawBackground(ctx, width, height);
        const projector = createViewportProjector(CHINA_BOUNDS, {
          width,
          height,
          padding: Math.max(width * 0.075, 24),
          scale: this.data.scale,
          offsetX: this.data.offsetX,
          offsetY: this.data.offsetY
        });
        drawChinaLayer(ctx, projector.project, chinaProvinces);
        this.updateRegionMarkers(width, height);
      });
    },

    updateRegionMarkers(width: number, height: number) {
      const projector = createViewportProjector(CHINA_BOUNDS, {
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
          CHINA_BOUNDS,
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
        this.setData({
          offsetX: state.startOffsetX + touches[0].clientX - state.startX,
          offsetY: state.startOffsetY + touches[0].clientY - state.startY
        });
        this.drawInkMap();
        return;
      }
      if (touches.length >= 2 && state.startDistance > 0) {
        const next = distance(touches[0], touches[1]);
        const scale = clampMapScale(state.startScale * (next / state.startDistance));
        this.setData({ scale });
        this.drawInkMap();
      }
    },

    touchEnd() {
      this.setData({ touchState: null });
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

function getPixelRatio(): number {
  const wxApi = wx as unknown as {
    getWindowInfo?: () => { pixelRatio?: number };
    getSystemInfoSync: () => { pixelRatio?: number };
  };
  if (wxApi.getWindowInfo) {
    return wxApi.getWindowInfo().pixelRatio || 1;
  }
  return wxApi.getSystemInfoSync().pixelRatio || 1;
}

function drawBackground(ctx: any, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fbf6e8');
  gradient.addColorStop(0.55, '#f2ead8');
  gradient.addColorStop(1, '#e3d4b8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#91a48f';
  ctx.beginPath();
  ctx.ellipse(width * 0.26, height * 0.68, width * 0.34, height * 0.08, -0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#b89159';
  ctx.beginPath();
  ctx.ellipse(width * 0.75, height * 0.3, width * 0.28, height * 0.07, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChinaLayer(
  ctx: any,
  project: (point: GeoPoint) => { x: number; y: number },
  features: ChinaMapFeature[]
): void {
  drawFilledFeatures(ctx, project, features, 14, 16, 'rgba(79, 68, 43, 0.18)', 'rgba(79, 68, 43, 0)');
  drawFilledFeatures(ctx, project, features, 7, 8, 'rgba(62, 97, 78, 0.22)', 'rgba(62, 97, 78, 0)');
  drawFilledFeatures(ctx, project, features, 0, 0, 'rgba(42, 103, 88, 0.92)', 'rgba(245, 238, 220, 0.5)');
  drawLineFeatures(ctx, project, features);
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
