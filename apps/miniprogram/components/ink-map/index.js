"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_LONGITUDE = 104.1954;
const DEFAULT_LATITUDE = 35.8617;
const DEFAULT_SCALE = 4;
const CITY_SCALE = 10;
const LOCATION_SCALE = 14;
const MIN_NATIVE_SCALE = 4;
const MAX_NATIVE_SCALE = 20;
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
        focusRegion(regionId) {
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
        focusLocation(location, scale = LOCATION_SCALE) {
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
                includePoints,
                hasIncludePoints: includePoints.length > 0
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
function clampNativeScale(scale) {
    return Math.max(MIN_NATIVE_SCALE, Math.min(MAX_NATIVE_SCALE, Math.round(scale)));
}
