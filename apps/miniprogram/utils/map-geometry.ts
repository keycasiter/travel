export type LngLatTuple = [number, number];

export interface ChinaMapFeature {
  name: string;
  code: string;
  center?: LngLatTuple;
  rings?: LngLatTuple[][];
  lines?: LngLatTuple[][];
}

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface GeoBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface MapViewport {
  width: number;
  height: number;
  padding: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface ViewportProjector {
  bounds: GeoBounds;
  viewport: MapViewport;
  project(point: GeoPoint): ProjectedPoint;
}

export interface RegionPoint {
  id: string;
  name: string;
  centerLng: number;
  centerLat: number;
}

export type ProjectedRegionMarker<T extends RegionPoint = RegionPoint> = T & {
  left: number;
  top: number;
  x: number;
  y: number;
};

export function computeGeoBounds(features: ChinaMapFeature[]): GeoBounds {
  const bounds: GeoBounds = {
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY
  };

  for (const feature of features) {
    forEachTuple(feature, (point) => extendBounds(bounds, point));
  }

  if (!Number.isFinite(bounds.minLng) || !Number.isFinite(bounds.minLat)) {
    throw new Error('China map data has no coordinates');
  }

  return bounds;
}

export function createViewportProjector(bounds: GeoBounds, viewport: MapViewport): ViewportProjector {
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 1);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 1);
  const safeWidth = Math.max(viewport.width - viewport.padding * 2, 1);
  const safeHeight = Math.max(viewport.height - viewport.padding * 2, 1);
  const baseScale = Math.min(safeWidth / lngSpan, safeHeight / latSpan);
  const mapWidth = lngSpan * baseScale;
  const mapHeight = latSpan * baseScale;
  const baseX = (viewport.width - mapWidth) / 2 - bounds.minLng * baseScale;
  const baseY = (viewport.height - mapHeight) / 2 + bounds.maxLat * baseScale;
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  return {
    bounds,
    viewport,
    project(point: GeoPoint): ProjectedPoint {
      const rawX = baseX + point.lng * baseScale;
      const rawY = baseY - point.lat * baseScale;
      return {
        x: centerX + (rawX - centerX) * viewport.scale + viewport.offsetX,
        y: centerY + (rawY - centerY) * viewport.scale + viewport.offsetY
      };
    }
  };
}

export function projectRegionMarkers<T extends RegionPoint>(regions: T[], projector: ViewportProjector): ProjectedRegionMarker<T>[] {
  return regions
    .filter((region) => Number.isFinite(region.centerLng) && Number.isFinite(region.centerLat))
    .map((region) => {
      const point = projector.project({ lng: region.centerLng, lat: region.centerLat });
      return {
        ...region,
        x: point.x,
        y: point.y,
        left: (point.x / projector.viewport.width) * 100,
        top: (point.y / projector.viewport.height) * 100
      };
    });
}

export function findNearestRegion(regions: RegionPoint[], point: GeoPoint): { region: RegionPoint; distanceKm: number } {
  let nearest: { region: RegionPoint; distanceKm: number } | null = null;

  for (const region of regions) {
    if (!Number.isFinite(region.centerLng) || !Number.isFinite(region.centerLat)) {
      continue;
    }
    const distance = distanceKm(point, { lng: region.centerLng, lat: region.centerLat });
    if (!nearest || distance < nearest.distanceKm) {
      nearest = { region, distanceKm: distance };
    }
  }

  if (!nearest) {
    throw new Error('No regions with valid coordinates');
  }

  return nearest;
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function forEachTuple(feature: ChinaMapFeature, visit: (point: LngLatTuple) => void): void {
  if (feature.rings) {
    for (const ring of feature.rings) {
      for (const point of ring) {
        visit(point);
      }
    }
  }
  if (feature.lines) {
    for (const line of feature.lines) {
      for (const point of line) {
        visit(point);
      }
    }
  }
}

function extendBounds(bounds: GeoBounds, point: LngLatTuple): void {
  bounds.minLng = Math.min(bounds.minLng, point[0]);
  bounds.maxLng = Math.max(bounds.maxLng, point[0]);
  bounds.minLat = Math.min(bounds.minLat, point[1]);
  bounds.maxLat = Math.max(bounds.maxLat, point[1]);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
