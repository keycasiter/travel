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
        searchResults: []
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
            this.setData({ searchKeyword: String(event.detail.value || '') });
        },
        submitSearch() {
            const keyword = String(this.data.searchKeyword || '').trim();
            if (!keyword) {
                wx.showToast({ title: '输入想找的地点', icon: 'none' });
                return;
            }
            this.runPlaceSearch(keyword, '');
        },
        tapSearchCategory(event) {
            const categoryId = String(event.currentTarget.dataset.id || '');
            const category = tencent_map_1.MAP_SEARCH_CATEGORIES.find((item) => item.id === categoryId);
            if (!category) {
                return;
            }
            this.setData({ searchKeyword: category.label });
            this.runPlaceSearch(category.keyword, category.id);
        },
        async runPlaceSearch(keyword, activeCategoryId) {
            const center = { lng: Number(this.data.longitude), lat: Number(this.data.latitude) };
            if (!isValidSearchCenter(center)) {
                wx.showToast({ title: '地图中心不可用', icon: 'none' });
                return;
            }
            wx.showLoading({ title: '搜索中' });
            try {
                const searchResults = await (0, tencent_map_1.searchTencentPlaces)({ keyword, center, radiusMeters: 6000, pageSize: 20 });
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
                }
                this.setData(nextData);
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
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function clampNativeScale(scale) {
    return Math.max(MIN_NATIVE_SCALE, Math.min(MAX_NATIVE_SCALE, Math.round(scale)));
}
