"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tencent_map_1 = require("../../utils/tencent-map");
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
let suggestionTimer;
let suggestionSequence = 0;
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
        markers: [],
        includePoints: [],
        hasIncludePoints: false,
        searchKeyword: '',
        activeCategoryId: '',
        searchCategories: tencent_map_1.MAP_SEARCH_CATEGORIES,
        searchResults: [],
        searchSuggestions: []
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
            const searchResults = getSearchResults(this);
            const markers = buildMapMarkers(regions, selectedRegionId, currentLocation, searchResults);
            const nextData = { markers };
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
        onMarkerTap(event) {
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
        onRegionChange(event) {
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
                        latitude: res.latitude
                    });
                }
            });
        },
        locate() {
            this.triggerEvent('locate');
        },
        handleSearchInput(event) {
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
        tapSearchCategory(event) {
            const categoryId = String(event.currentTarget.dataset.id || '');
            const category = tencent_map_1.MAP_SEARCH_CATEGORIES.find((item) => item.id === categoryId);
            if (!category) {
                return;
            }
            this.setData({ searchKeyword: category.label, searchSuggestions: [] });
            this.runPlaceSearch(category.keyword, category.id, { categories: category.categories, useViewport: true });
        },
        async runPlaceSearch(keyword, activeCategoryId, options = {}) {
            const center = { lng: Number(this.data.longitude), lat: Number(this.data.latitude) };
            if (!isValidSearchCenter(center) && !options.useViewport) {
                wx.showToast({ title: '地图中心不可用', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '搜索中' });
            try {
                const viewport = options.useViewport ? await this.getVisibleViewport() : null;
                const searchResults = await (0, tencent_map_1.searchTencentPlaces)({
                    keyword,
                    center: isValidSearchCenter(center) ? center : undefined,
                    viewport,
                    categories: options.categories,
                    radiusMeters: options.radiusMeters || 1000,
                    pageSize: 20
                });
                this.applySearchResults(searchResults, activeCategoryId);
                if (searchResults.length === 0) {
                    wx.showToast({ title: '附近暂未找到结果', icon: 'none' });
                }
            }
            catch (error) {
                wx.showToast({ title: messageOf(error), icon: 'none' });
            }
            finally {
                wx.hideLoading();
            }
        },
        queueSuggestions(keyword) {
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
            }, SUGGESTION_DELAY_MS);
        },
        async loadSuggestions(keyword, sequence) {
            const center = { lng: Number(this.data.longitude), lat: Number(this.data.latitude) };
            try {
                const searchSuggestions = await (0, tencent_map_1.suggestTencentPlaces)({
                    keyword,
                    center: isValidSearchCenter(center) ? center : undefined,
                    pageSize: 6
                });
                if (sequence !== suggestionSequence) {
                    return;
                }
                this.setData({ searchSuggestions });
            }
            catch (_error) {
                if (sequence === suggestionSequence) {
                    this.setData({ searchSuggestions: [] });
                }
            }
        },
        selectSuggestion(event) {
            const index = Number(event.currentTarget.dataset.index || 0);
            const suggestion = getSearchSuggestions(this)[index];
            if (!suggestion) {
                return;
            }
            this.setData({ searchKeyword: suggestion.title, searchSuggestions: [] });
            this.applySearchResults([suggestion], '');
        },
        applySearchResults(searchResults, activeCategoryId) {
            const includePoints = searchResultPoints(searchResults);
            const nextData = {
                searchResults,
                activeCategoryId,
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
        },
        getVisibleViewport() {
            return new Promise((resolve) => {
                const mapContext = wx.createMapContext('nativeExploreMap', this);
                const regionGetter = mapContext.getRegion;
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
        focusRegion(regionId) {
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
        focusLocation(location, scale = LOCATION_SCALE) {
            if (!isValidLocation(location)) {
                return;
            }
            this.setData({
                longitude: location.lng,
                latitude: location.lat,
                scale: clampNativeScale(scale),
                searchResults: [],
                searchSuggestions: [],
                activeCategoryId: '',
                includePoints: [],
                hasIncludePoints: false,
                markers: buildMapMarkers(getRegions(this), String(this.data.selectedRegionId || ''), location, [])
            });
        },
        focusSearchResult(result) {
            this.setData({
                longitude: result.location.lng,
                latitude: result.location.lat,
                scale: SEARCH_SCALE,
                includePoints: [],
                hasIncludePoints: false
            });
            wx.showToast({ title: result.title, icon: 'none' });
        },
        zoomBy(event) {
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
function getRegions(instance) {
    return (instance.data.regions || []).filter(isValidRegion);
}
function getCurrentLocation(instance) {
    return (instance.data.currentLocation || null);
}
function getSearchResults(instance) {
    return (instance.data.searchResults || []).filter(isValidSearchResult);
}
function getSearchSuggestions(instance) {
    return (instance.data.searchSuggestions || []).filter(isValidSearchResult);
}
function buildMapMarkers(regions, selectedRegionId, currentLocation, searchResults) {
    const markers = buildRegionMarkers(regions, selectedRegionId);
    markers.push(...buildSearchMarkers(searchResults));
    if (isValidLocation(currentLocation)) {
        markers.push(buildCurrentLocationMarker(currentLocation));
    }
    return markers;
}
function buildRegionMarkers(regions, selectedRegionId) {
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
function buildSearchMarkers(results) {
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
function buildCurrentLocationMarker(location) {
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
function searchResultPoints(results) {
    return results.map((result) => ({ latitude: result.location.lat, longitude: result.location.lng }));
}
function regionPoints(regions) {
    return regions.map((region) => ({ latitude: region.centerLat, longitude: region.centerLng }));
}
function centerOf(points) {
    if (points.length === 0) {
        return null;
    }
    const total = points.reduce((sum, point) => ({
        latitude: sum.latitude + point.latitude,
        longitude: sum.longitude + point.longitude
    }), { latitude: 0, longitude: 0 });
    return {
        latitude: total.latitude / points.length,
        longitude: total.longitude / points.length
    };
}
function isValidRegion(region) {
    return !!region && Number.isFinite(region.centerLng) && Number.isFinite(region.centerLat);
}
function isValidLocation(location) {
    return !!location && Number.isFinite(location.lng) && Number.isFinite(location.lat);
}
function isValidSearchCenter(center) {
    return Number.isFinite(center.lng) && Number.isFinite(center.lat);
}
function isValidSearchResult(result) {
    return Number.isFinite(result.location?.lng) && Number.isFinite(result.location?.lat);
}
function regionToViewport(region) {
    const southwest = region.southwest;
    const northeast = region.northeast;
    if (!southwest ||
        !northeast ||
        !Number.isFinite(southwest.latitude) ||
        !Number.isFinite(southwest.longitude) ||
        !Number.isFinite(northeast.latitude) ||
        !Number.isFinite(northeast.longitude)) {
        return null;
    }
    return {
        southwest: { lat: Number(southwest.latitude), lng: Number(southwest.longitude) },
        northeast: { lat: Number(northeast.latitude), lng: Number(northeast.longitude) }
    };
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function clampNativeScale(scale) {
    return Math.max(MIN_NATIVE_SCALE, Math.min(MAX_NATIVE_SCALE, Math.round(scale)));
}
