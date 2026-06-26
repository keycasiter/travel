import type { Region } from '../../utils/types';
import { request } from '../../utils/api';
import {
  getTencentLocationContext,
  MAP_SEARCH_CATEGORIES,
  previewTencentRoutes,
  searchTencentPlaces,
  suggestTencentPlaces,
  type MapSearchCategoryId,
  type MapViewport,
  type TencentLocationContext,
  type TencentPoi,
  type TencentRoutePlan
} from '../../utils/tencent-map';

interface CurrentLocation {
  lng: number;
  lat: number;
  label: string;
}

interface MapPoint {
  latitude: number;
  longitude: number;
}

interface NativeMapRegionPoint {
  latitude?: number;
  longitude?: number;
}

interface NativeMapRegionResult {
  southwest?: NativeMapRegionPoint;
  northeast?: NativeMapRegionPoint;
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
const SEARCH_SCALE = 15;
const MIN_NATIVE_SCALE = 4;
const MAX_NATIVE_SCALE = 20;
const SEARCH_MARKER_ID_OFFSET = 10000;
const CURRENT_LOCATION_MARKER_ID = 900000;
const SUGGESTION_DELAY_MS = 320;
const DEFAULT_AREA_KEYWORD = '景点';
const MAX_RECTANGLE_SPAN_DEGREES = 2.2;

type ComponentDataHost = {
  data: Record<string, unknown>;
};

let suggestionTimer: number | undefined;
let suggestionSequence = 0;
let lastContextKey = '';

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
    hasIncludePoints: false,
    searchKeyword: '',
    activeCategoryId: '' as MapSearchCategoryId | '',
    searchCategories: MAP_SEARCH_CATEGORIES,
    searchResults: [] as TencentPoi[],
    searchSuggestions: [] as TencentPoi[],
    viewportDirty: false,
    activePlace: null as TencentPoi | null,
    routePlans: [] as TencentRoutePlan[],
    routeLoading: false,
    areaContext: null as TencentLocationContext | null,
    areaHeadline: '',
    areaSummary: ''
  },

  lifetimes: {
    ready() {
      this.syncMapMarkers(true);
      const currentLocation = getCurrentLocation(this);
      if (isValidLocation(currentLocation)) {
        this.loadLocationContext(currentLocation);
      }
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
      const searchResults = getSearchResults(this);
      const markers = buildMapMarkers(regions, selectedRegionId, currentLocation, searchResults);

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

      if (markerId >= SEARCH_MARKER_ID_OFFSET && markerId < CURRENT_LOCATION_MARKER_ID) {
        const result = getSearchResults(this)[markerId - SEARCH_MARKER_ID_OFFSET];
        if (result) {
          this.focusSearchResult(result);
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

    onRegionChange(event: WechatMiniprogram.CustomEvent<{ type?: string }>) {
      const changeType = event.detail?.type || event.type;
      if (changeType === 'begin') {
        return;
      }
      const mapContext = wx.createMapContext('nativeExploreMap', this);
      mapContext.getCenterLocation({
        success: (res) => {
          if (!Number.isFinite(res.longitude) || !Number.isFinite(res.latitude)) {
            return;
          }
          this.setData({
            longitude: res.longitude,
            latitude: res.latitude,
            viewportDirty: true
          });
        }
      });
    },

    locate() {
      this.triggerEvent('locate');
    },

    handleSearchInput(event: WechatMiniprogram.Input) {
      const searchKeyword = String(event.detail.value || '');
      this.setData({ searchKeyword, activeCategoryId: '' });
      this.queueSuggestions(searchKeyword);
    },

    submitSearch() {
      const keyword = String(this.data.searchKeyword || '').trim();
      if (!keyword) {
        wx.showToast({ title: '输入想找的地点', icon: 'none' });
        return;
      }
      this.setData({ searchSuggestions: [] });
      this.runPlaceSearch(keyword, '', { radiusMeters: 1000 });
    },

    searchThisArea() {
      const activeCategoryId = String(this.data.activeCategoryId || '') as MapSearchCategoryId | '';
      const category = MAP_SEARCH_CATEGORIES.find((item) => item.id === activeCategoryId);
      const keyword = category?.keyword || String(this.data.searchKeyword || '').trim() || DEFAULT_AREA_KEYWORD;
      this.runPlaceSearch(keyword, activeCategoryId, { categories: category?.categories, useViewport: true });
    },

    tapSearchCategory(event: WechatMiniprogram.TouchEvent) {
      const categoryId = String(event.currentTarget.dataset.id || '') as MapSearchCategoryId;
      const category = MAP_SEARCH_CATEGORIES.find((item) => item.id === categoryId);
      if (!category) {
        return;
      }
      this.setData({ searchKeyword: category.label, searchSuggestions: [] });
      this.runPlaceSearch(category.keyword, category.id, { categories: category.categories, useViewport: true });
    },

    async runPlaceSearch(
      keyword: string,
      activeCategoryId: MapSearchCategoryId | '',
      options: { categories?: readonly string[]; radiusMeters?: number; useViewport?: boolean } = {}
    ) {
      const center = { lng: Number(this.data.longitude), lat: Number(this.data.latitude) };
      if (!isValidSearchCenter(center) && !options.useViewport) {
        wx.showToast({ title: '地图中心不可用', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '搜索中' });
      try {
        const visibleViewport = options.useViewport ? await this.getVisibleViewport() : null;
        const viewport = visibleViewport && !isWideViewport(visibleViewport) ? visibleViewport : null;
        const searchResults = await searchTencentPlaces({
          keyword,
          center: isValidSearchCenter(center) ? center : undefined,
          viewport,
          categories: options.categories,
          radiusMeters: options.radiusMeters || 1000,
          pageSize: 12
        });
        this.applySearchResults(searchResults, activeCategoryId);
        this.setData({ viewportDirty: false });
        if (searchResults.length === 0) {
          wx.showToast({ title: '附近暂未找到结果', icon: 'none' });
        }
      } catch (error) {
        wx.showToast({ title: messageOf(error), icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    queueSuggestions(keyword: string) {
      if (suggestionTimer !== undefined) {
        clearTimeout(suggestionTimer);
      }
      const trimmed = keyword.trim();
      const sequence = ++suggestionSequence;
      if (trimmed.length < 2) {
        this.setData({ searchSuggestions: [] });
        return;
      }
      suggestionTimer = setTimeout(() => {
        this.loadSuggestions(trimmed, sequence);
      }, SUGGESTION_DELAY_MS) as unknown as number;
    },

    async loadSuggestions(keyword: string, sequence: number) {
      const center = { lng: Number(this.data.longitude), lat: Number(this.data.latitude) };
      try {
        const searchSuggestions = await suggestTencentPlaces({
          keyword,
          center: isValidSearchCenter(center) ? center : undefined,
          pageSize: 6
        });
        if (sequence !== suggestionSequence) {
          return;
        }
        this.setData({ searchSuggestions });
      } catch (_error) {
        if (sequence === suggestionSequence) {
          this.setData({ searchSuggestions: [] });
        }
      }
    },

    selectSuggestion(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const suggestion = getSearchSuggestions(this)[index];
      if (!suggestion) {
        return;
      }
      this.setData({ searchKeyword: suggestion.title, searchSuggestions: [] });
      this.applySearchResults([suggestion], '');
    },

    applySearchResults(searchResults: TencentPoi[], activeCategoryId: MapSearchCategoryId | '') {
      const includePoints = searchResultPoints(searchResults);
      const nextData: Partial<{
        searchResults: TencentPoi[];
        activeCategoryId: MapSearchCategoryId | '';
        activePlace: TencentPoi | null;
        routePlans: TencentRoutePlan[];
        routeLoading: boolean;
        markers: NativeMapMarker[];
        includePoints: MapPoint[];
        hasIncludePoints: boolean;
        longitude: number;
        latitude: number;
        scale: number;
      }> = {
        searchResults,
        activeCategoryId,
        activePlace: searchResults.length === 1 ? searchResults[0] : null,
        routePlans: [],
        routeLoading: false,
        markers: buildMapMarkers(getRegions(this), String(this.data.selectedRegionId || ''), getCurrentLocation(this), searchResults),
        includePoints,
        hasIncludePoints: includePoints.length > 0
      };

      if (searchResults.length === 1) {
        nextData.longitude = searchResults[0].location.lng;
        nextData.latitude = searchResults[0].location.lat;
        nextData.scale = SEARCH_SCALE;
        nextData.includePoints = [];
        nextData.hasIncludePoints = false;
      }

      this.setData(nextData);
      if (searchResults.length === 1) {
        this.loadRoutePreview(searchResults[0]);
      }
    },

    getVisibleViewport(): Promise<MapViewport | null> {
      return new Promise((resolve) => {
        const mapContext = wx.createMapContext('nativeExploreMap', this);
        const regionGetter = (mapContext as unknown as {
          getRegion?: (options: {
            success?: (res: NativeMapRegionResult) => void;
            fail?: () => void;
          }) => void;
        }).getRegion;
        if (!regionGetter) {
          resolve(null);
          return;
        }
        regionGetter.call(mapContext, {
          success: (res) => resolve(regionToViewport(res)),
          fail: () => resolve(null)
        });
      });
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
        searchResults: [],
        searchSuggestions: [],
        activeCategoryId: '',
        includePoints: [],
        hasIncludePoints: false,
        markers: buildMapMarkers(getRegions(this), region.id, getCurrentLocation(this), [])
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
        searchResults: [],
        searchSuggestions: [],
        activePlace: null,
        routePlans: [],
        routeLoading: false,
        viewportDirty: false,
        activeCategoryId: '',
        includePoints: [],
        hasIncludePoints: false,
        markers: buildMapMarkers(getRegions(this), String(this.data.selectedRegionId || ''), location, [])
      });
      this.loadLocationContext(location);
    },

    focusSearchResult(result: TencentPoi) {
      this.setData({
        longitude: result.location.lng,
        latitude: result.location.lat,
        scale: SEARCH_SCALE,
        activePlace: result,
        routePlans: [],
        routeLoading: false,
        includePoints: [],
        hasIncludePoints: false
      });
      this.loadRoutePreview(result);
    },

    async loadLocationContext(location: CurrentLocation) {
      const contextKey = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
      if (contextKey === lastContextKey) {
        return;
      }
      lastContextKey = contextKey;
      try {
        const areaContext = await getTencentLocationContext({
          center: { lat: location.lat, lng: location.lng },
          radiusMeters: 3000,
          pageSize: 6
        });
        this.setData({
          areaContext,
          areaHeadline: locationContextHeadline(areaContext),
          areaSummary: locationContextSummary(areaContext)
        });
      } catch (_error) {
        this.setData({
          areaContext: null,
          areaHeadline: '',
          areaSummary: ''
        });
      }
    },

    async loadRoutePreview(place: TencentPoi) {
      const currentLocation = getCurrentLocation(this);
      if (!isValidLocation(currentLocation)) {
        this.setData({ routePlans: [], routeLoading: false });
        return;
      }
      this.setData({ routeLoading: true });
      try {
        const routePlans = await previewTencentRoutes({
          from: { lat: currentLocation.lat, lng: currentLocation.lng },
          to: place.location,
          modes: ['walking', 'transit', 'driving']
        });
        this.setData({ routePlans, routeLoading: false });
      } catch (_error) {
        this.setData({ routePlans: [], routeLoading: false });
      }
    },

    favoriteActivePlace() {
      const activePlace = getActivePlace(this);
      if (!activePlace) {
        return;
      }
      request('/api/v1/favorites', 'POST', { targetType: 'map_poi', targetId: activePlace.id })
        .then(() => wx.showToast({ title: '已收藏', icon: 'success' }))
        .catch((error) => wx.showToast({ title: messageOf(error), icon: 'none' }));
    },

    joinItinerary() {
      const activePlace = getActivePlace(this);
      if (!activePlace) {
        return;
      }
      wx.setStorageSync('pendingItineraryPlace', {
        id: activePlace.id,
        title: activePlace.title,
        address: activePlace.address,
        category: activePlace.category,
        location: activePlace.location
      });
      wx.switchTab({ url: '/pages/itinerary/index' });
    },

    nearbyActivePlace() {
      const activePlace = getActivePlace(this);
      if (!activePlace) {
        return;
      }
      this.setData({
        longitude: activePlace.location.lng,
        latitude: activePlace.location.lat,
        searchKeyword: '附近继续逛',
        searchSuggestions: []
      });
      this.runPlaceSearch('景点 美食', '', { radiusMeters: 1000 });
    },

    closeExploreCard() {
      this.setData({ activePlace: null, routePlans: [], routeLoading: false });
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
        searchResults: [],
        searchSuggestions: [],
        activeCategoryId: '',
        includePoints,
        hasIncludePoints: includePoints.length > 0,
        markers: buildMapMarkers(regions, String(this.data.selectedRegionId || ''), getCurrentLocation(this), [])
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

function getSearchResults(instance: ComponentDataHost): TencentPoi[] {
  return ((instance.data as unknown as { searchResults?: TencentPoi[] }).searchResults || []).filter(isValidSearchResult);
}

function getSearchSuggestions(instance: ComponentDataHost): TencentPoi[] {
  return ((instance.data as unknown as { searchSuggestions?: TencentPoi[] }).searchSuggestions || []).filter(isValidSearchResult);
}

function getActivePlace(instance: ComponentDataHost): TencentPoi | null {
  const activePlace = (instance.data as unknown as { activePlace?: TencentPoi | null }).activePlace || null;
  return activePlace && isValidSearchResult(activePlace) ? activePlace : null;
}

function buildMapMarkers(
  regions: Region[],
  selectedRegionId: string,
  currentLocation: CurrentLocation | null,
  searchResults: TencentPoi[]
): NativeMapMarker[] {
  const markers = buildRegionMarkers(regions, selectedRegionId);
  markers.push(...buildSearchMarkers(searchResults));
  if (isValidLocation(currentLocation)) {
    markers.push(buildCurrentLocationMarker(currentLocation));
  }
  return markers;
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

function buildSearchMarkers(results: TencentPoi[]): NativeMapMarker[] {
  return results.map((result, index) => ({
    id: SEARCH_MARKER_ID_OFFSET + index,
    latitude: result.location.lat,
    longitude: result.location.lng,
    title: result.title,
    width: 30,
    height: 36,
    callout: {
      content: result.title,
      color: '#fffdf8',
      fontSize: 12,
      borderRadius: 4,
      bgColor: index === 0 ? '#b5522d' : '#22564b',
      padding: 6,
      display: index === 0 ? 'ALWAYS' : 'BYCLICK'
    }
  }));
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

function searchResultPoints(results: TencentPoi[]): MapPoint[] {
  return results.map((result) => ({ latitude: result.location.lat, longitude: result.location.lng }));
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

function isValidSearchCenter(center: { lng: number; lat: number }): center is CurrentLocation {
  return Number.isFinite(center.lng) && Number.isFinite(center.lat);
}

function isValidSearchResult(result: TencentPoi): boolean {
  return Number.isFinite(result.location?.lng) && Number.isFinite(result.location?.lat);
}

function regionToViewport(region: NativeMapRegionResult): MapViewport | null {
  const southwest = region.southwest;
  const northeast = region.northeast;
  if (
    !southwest ||
    !northeast ||
    !Number.isFinite(southwest.latitude) ||
    !Number.isFinite(southwest.longitude) ||
    !Number.isFinite(northeast.latitude) ||
    !Number.isFinite(northeast.longitude)
  ) {
    return null;
  }
  return {
    southwest: { lat: Number(southwest.latitude), lng: Number(southwest.longitude) },
    northeast: { lat: Number(northeast.latitude), lng: Number(northeast.longitude) }
  };
}

function isWideViewport(viewport: MapViewport): boolean {
  const latSpan = Math.abs(viewport.northeast.lat - viewport.southwest.lat);
  const lngSpan = Math.abs(viewport.northeast.lng - viewport.southwest.lng);
  return latSpan > MAX_RECTANGLE_SPAN_DEGREES || lngSpan > MAX_RECTANGLE_SPAN_DEGREES;
}

function locationContextHeadline(context: TencentLocationContext): string {
  return context.recommendAddress || context.district || context.city || context.address || '当前位置附近';
}

function locationContextSummary(context: TencentLocationContext): string {
  const area = [context.city, context.district, context.street].filter(Boolean).join(' · ');
  const poiCount = context.pois.length;
  if (area && poiCount > 0) {
    return `${area}，附近有 ${poiCount} 个可探索点位`;
  }
  if (area) {
    return area;
  }
  if (poiCount > 0) {
    return `附近有 ${poiCount} 个可探索点位`;
  }
  return context.address || '可拖动地图搜索周边内容';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clampNativeScale(scale: number): number {
  return Math.max(MIN_NATIVE_SCALE, Math.min(MAX_NATIVE_SCALE, Math.round(scale)));
}
