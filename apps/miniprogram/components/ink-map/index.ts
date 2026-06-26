import type { Region } from '../../utils/types';

interface CurrentLocation {
  lng: number;
  lat: number;
  label: string;
}

interface MapPoint {
  latitude: number;
  longitude: number;
}

interface NativeMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  width: number;
  height: number;
  callout: {
    content: string;
    color: string;
    fontSize: number;
    borderRadius: number;
    bgColor: string;
    padding: number;
    display: 'ALWAYS' | 'BYCLICK';
  };
}

const DEFAULT_LONGITUDE = 104.1954;
const DEFAULT_LATITUDE = 35.8617;
const DEFAULT_SCALE = 4;
const CITY_SCALE = 10;
const LOCATION_SCALE = 14;
const MIN_NATIVE_SCALE = 4;
const MAX_NATIVE_SCALE = 20;
const CURRENT_LOCATION_MARKER_ID = 900000;

type ComponentDataHost = {
  data: Record<string, unknown>;
};

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
    longitude: DEFAULT_LONGITUDE,
    latitude: DEFAULT_LATITUDE,
    scale: DEFAULT_SCALE,
    markers: [] as NativeMapMarker[],
    includePoints: [] as MapPoint[],
    hasIncludePoints: false
  },

  lifetimes: {
    ready() {
      this.syncMapMarkers(true);
    }
  },

  observers: {
    'regions, selectedRegionId, currentLocation'() {
      this.syncMapMarkers();
    }
  },

  methods: {
    syncMapMarkers(fitAll = false) {
      const regions = getRegions(this);
      const selectedRegionId = String(this.data.selectedRegionId || '');
      const currentLocation = getCurrentLocation(this);
      const markers = buildRegionMarkers(regions, selectedRegionId);
      if (isValidLocation(currentLocation)) {
        markers.push(buildCurrentLocationMarker(currentLocation));
      }

      const nextData: Partial<{
        markers: NativeMapMarker[];
        includePoints: MapPoint[];
        hasIncludePoints: boolean;
        longitude: number;
        latitude: number;
        scale: number;
      }> = { markers };

      if (fitAll && regions.length > 0) {
        const includePoints = regionPoints(regions);
        const center = centerOf(includePoints);
        nextData.includePoints = includePoints;
        nextData.hasIncludePoints = includePoints.length > 0;
        if (center) {
          nextData.longitude = center.longitude;
          nextData.latitude = center.latitude;
          nextData.scale = DEFAULT_SCALE;
        }
      }

      this.setData(nextData);
    },

    onMarkerTap(event: WechatMiniprogram.CustomEvent<{ markerId: number }>) {
      const markerId = Number(event.detail.markerId || 0);
      if (markerId === CURRENT_LOCATION_MARKER_ID) {
        const currentLocation = getCurrentLocation(this);
        if (isValidLocation(currentLocation)) {
          this.focusLocation(currentLocation);
        }
        return;
      }

      const region = getRegions(this)[markerId - 1];
      if (!region) {
        return;
      }
      this.focusRegion(region.id);
      this.triggerEvent('regiontap', { regionId: region.id });
    },

    locate() {
      this.triggerEvent('locate');
    },

    focusRegion(regionId: string) {
      const region = getRegions(this).find((item) => item.id === regionId);
      if (!isValidRegion(region)) {
        return;
      }
      this.setData({
        longitude: region.centerLng,
        latitude: region.centerLat,
        scale: CITY_SCALE,
        includePoints: [],
        hasIncludePoints: false
      });
    },

    focusLocation(location: CurrentLocation, scale = LOCATION_SCALE) {
      if (!isValidLocation(location)) {
        return;
      }
      this.setData({
        longitude: location.lng,
        latitude: location.lat,
        scale: clampNativeScale(scale),
        includePoints: [],
        hasIncludePoints: false
      });
    },

    zoomBy(event: WechatMiniprogram.TouchEvent) {
      const delta = Number(event.currentTarget.dataset.delta || 0);
      this.setData({
        scale: clampNativeScale(this.data.scale + delta),
        includePoints: [],
        hasIncludePoints: false
      });
    },

    resetView() {
      const regions = getRegions(this);
      const includePoints = regionPoints(regions);
      const center = centerOf(includePoints);
      this.setData({
        longitude: center?.longitude || DEFAULT_LONGITUDE,
        latitude: center?.latitude || DEFAULT_LATITUDE,
        scale: DEFAULT_SCALE,
        includePoints,
        hasIncludePoints: includePoints.length > 0
      });
    }
  }
});

function getRegions(instance: ComponentDataHost): Region[] {
  return ((instance.data as unknown as { regions?: Region[] }).regions || []).filter(isValidRegion);
}

function getCurrentLocation(instance: ComponentDataHost): CurrentLocation | null {
  return ((instance.data as unknown as { currentLocation?: CurrentLocation }).currentLocation || null);
}

function buildRegionMarkers(regions: Region[], selectedRegionId: string): NativeMapMarker[] {
  return regions.map((region, index) => {
    const active = region.id === selectedRegionId;
    return {
      id: index + 1,
      latitude: region.centerLat,
      longitude: region.centerLng,
      title: region.name,
      width: active ? 34 : 28,
      height: active ? 40 : 34,
      callout: {
        content: region.name,
        color: active ? '#fffdf8' : '#22322d',
        fontSize: active ? 14 : 13,
        borderRadius: 4,
        bgColor: active ? '#22564b' : '#fffdf8',
        padding: 7,
        display: 'ALWAYS'
      }
    };
  });
}

function buildCurrentLocationMarker(location: CurrentLocation): NativeMapMarker {
  return {
    id: CURRENT_LOCATION_MARKER_ID,
    latitude: location.lat,
    longitude: location.lng,
    title: location.label,
    width: 26,
    height: 26,
    callout: {
      content: location.label,
      color: '#fffdf8',
      fontSize: 12,
      borderRadius: 4,
      bgColor: '#2d78c4',
      padding: 6,
      display: 'ALWAYS'
    }
  };
}

function regionPoints(regions: Region[]): MapPoint[] {
  return regions.map((region) => ({ latitude: region.centerLat, longitude: region.centerLng }));
}

function centerOf(points: MapPoint[]): MapPoint | null {
  if (points.length === 0) {
    return null;
  }
  const total = points.reduce(
    (sum, point) => ({
      latitude: sum.latitude + point.latitude,
      longitude: sum.longitude + point.longitude
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: total.latitude / points.length,
    longitude: total.longitude / points.length
  };
}

function isValidRegion(region: Region | undefined): region is Region {
  return !!region && Number.isFinite(region.centerLng) && Number.isFinite(region.centerLat);
}

function isValidLocation(location: CurrentLocation | null): location is CurrentLocation {
  return !!location && Number.isFinite(location.lng) && Number.isFinite(location.lat);
}

function clampNativeScale(scale: number): number {
  return Math.max(MIN_NATIVE_SCALE, Math.min(MAX_NATIVE_SCALE, Math.round(scale)));
}
