"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const auth_1 = require("../../utils/auth");
const city_hotspots_1 = require("./city-hotspots");
const home_map_layers_1 = require("./home-map-layers");
const MAP_HERO_IMAGE = '/assets/maps/home-map-mobile.jpg';
const MAP_CITY_FOCUS_IMAGE = '/assets/maps/home-map-hangzhou-focus.jpg';
const MAP_AREA_DETAIL_IMAGE = '/assets/maps/home-map-hangzhou-areas.png';
const MAP_POI_DETAIL_IMAGE = '/assets/maps/home-map-hangzhou-poi-detail.png';
const HANGZHOU_REGION_ID = 'city-hangzhou';
const MIN_HERO_SCALE = 1;
const MAX_HERO_SCALE = home_map_layers_1.HOME_MAP_ZOOM_LEVELS.poiMax;
const DEFAULT_CITY_SCALE = 1.12;
const DEFAULT_AREA_SCALE = 1.22;
const DEFAULT_POI_SCALE = 1.38;
const ZOOM_STEP = 0.12;
const MAX_PAN_RPX = 220;
const HANGZHOU_FALLBACK_LOCATION = { lat: 30.2741, lng: 120.1551 };
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragging = false;
let pinching = false;
let pinchStartDistance = 0;
let pinchStartScale = MIN_HERO_SCALE;
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
        heroImage: MAP_HERO_IMAGE,
        cityFocusImage: MAP_CITY_FOCUS_IMAGE,
        areaDetailImage: MAP_AREA_DETAIL_IMAGE,
        poiDetailImage: MAP_POI_DETAIL_IMAGE,
        heroScale: MIN_HERO_SCALE,
        heroOffsetX: 0,
        heroOffsetY: 0,
        cityHotspots: city_hotspots_1.CITY_HOTSPOTS,
        discoveryChips: city_hotspots_1.DISCOVERY_CHIPS,
        activeDiscoveryId: 'inspiration',
        searchKeyword: '',
        layerFilterKeyword: '',
        semanticLayer: 'national',
        visualDepthLevel: 'national',
        detailElements: (0, home_map_layers_1.getDetailElements)('national'),
        layerItems: [],
        selectedCityId: '',
        selectedCityCard: null,
        selectedMapItem: null
    },
    observers: {
        selectedRegionId(regionId) {
            if (regionId && regionId !== this.data.selectedCityId) {
                this.focusRegion(regionId, false);
            }
        }
    },
    methods: {
        locate() {
            this.triggerEvent('locate');
        },
        handleSearchInput(event) {
            this.setData({ searchKeyword: String(event.detail.value || '') });
        },
        submitSearch() {
            const keyword = String(this.data.searchKeyword || '').trim();
            if (!keyword) {
                wx.showToast({ title: '输入想找的杭州内容', icon: 'none' });
                return;
            }
            const localItem = (0, home_map_layers_1.findHomeMapItem)(keyword);
            if (localItem) {
                this.focusMapItem(localItem, false);
                this.setData({ searchKeyword: localItem.title, layerFilterKeyword: keyword });
                return;
            }
            const matchedCity = findCityByKeyword(keyword, getRegions(this.data.regions));
            if (matchedCity) {
                this.focusRegion(matchedCity.id, false);
                if (!matchedCity.mvpReady) {
                    wx.showToast({ title: '城市待完善，先体验杭州', icon: 'none' });
                }
                return;
            }
            wx.showToast({ title: '杭州内容里暂未找到', icon: 'none' });
        },
        tapDiscoveryChip(event) {
            const chipId = String(event.currentTarget.dataset.id || '');
            if (!isDiscoveryId(chipId)) {
                return;
            }
            const nextScale = Math.max(Number(this.data.heroScale || MIN_HERO_SCALE), chipId === 'inspiration' ? home_map_layers_1.HOME_MAP_ZOOM_LEVELS.areaMin : home_map_layers_1.HOME_MAP_ZOOM_LEVELS.poiMin);
            const semanticLayer = (0, home_map_layers_1.getSemanticLayer)(nextScale);
            const visualDepthLevel = (0, home_map_layers_1.getVisualDepthLevel)(nextScale);
            this.setData({
                activeDiscoveryId: chipId,
                heroScale: nextScale,
                heroOffsetX: focusOffsetX(home_map_layers_1.HANGZHOU_CITY_MAP_ITEM),
                heroOffsetY: focusOffsetY(home_map_layers_1.HANGZHOU_CITY_MAP_ITEM),
                selectedCityId: HANGZHOU_REGION_ID,
                selectedCityCard: null,
                selectedMapItem: null,
                layerFilterKeyword: '',
                semanticLayer,
                visualDepthLevel,
                detailElements: (0, home_map_layers_1.getDetailElements)(visualDepthLevel),
                layerItems: (0, home_map_layers_1.getLayerItems)(semanticLayer, chipId)
            });
        },
        tapCityHotspot(event) {
            const cityId = String(event.currentTarget.dataset.id || '');
            this.focusRegion(cityId, true);
        },
        tapLayerMarker(event) {
            const itemId = String(event.currentTarget.dataset.id || '');
            const item = findLayerItemById(itemId, this.data.layerItems) || (0, home_map_layers_1.findHomeMapItem)(itemId);
            if (!item) {
                return;
            }
            this.focusMapItem(item, true);
        },
        enterCityDetail(event) {
            const selected = this.data.selectedMapItem;
            const cityId = resolveCityRegionId(String(event.currentTarget.dataset.id || selected?.targetId || this.data.selectedCityId || ''));
            if (!cityId) {
                return;
            }
            if (!isMvpCity(cityId)) {
                wx.showToast({ title: '城市待完善，先体验杭州', icon: 'none' });
                return;
            }
            this.triggerEvent('regiontap', { regionId: HANGZHOU_REGION_ID });
        },
        goPlan(event) {
            const cityId = resolveCityRegionId(String(event.currentTarget.dataset.id || this.data.selectedCityId || HANGZHOU_REGION_ID));
            if (cityId && !isMvpCity(cityId)) {
                wx.showToast({ title: '城市待完善，先规划杭州', icon: 'none' });
                return;
            }
            wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
            wx.switchTab({ url: '/pages/itinerary/index' });
        },
        goPlanWithSelectedItem() {
            const selected = this.data.selectedMapItem;
            if (!selected) {
                wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
                wx.switchTab({ url: '/pages/itinerary/index' });
                return;
            }
            wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
            if (selected.kind === 'poi' && selected.targetType !== 'transport') {
                const location = getMapItemLocation(selected);
                wx.setStorageSync('pendingItineraryPlace', {
                    id: selected.targetId,
                    title: selected.title,
                    address: selected.summary,
                    category: selected.categoryLabel,
                    location
                });
            }
            wx.switchTab({ url: '/pages/itinerary/index' });
        },
        openStreetMapWithSelectedItem() {
            const selected = this.data.selectedMapItem;
            const regionId = selected?.regionId || HANGZHOU_REGION_ID;
            wx.navigateTo({ url: `/pages/region-map/index?regionId=${encodeURIComponent(resolveCityRegionId(regionId) || HANGZHOU_REGION_ID)}` });
        },
        saveSelectedMapItem() {
            const selected = this.data.selectedMapItem;
            if (!selected) {
                return;
            }
            (0, auth_1.ensureUserId)()
                .then(() => (0, api_1.request)('/api/v1/favorites', 'POST', {
                targetType: selected.targetType === 'transport' ? 'region' : selected.targetType,
                targetId: selected.targetType === 'transport' ? HANGZHOU_REGION_ID : selected.targetId
            }))
                .then(() => {
                wx.showToast({ title: '已收藏', icon: 'success' });
            })
                .catch((error) => {
                wx.showToast({ title: `收藏失败：${messageOf(error)}`, icon: 'none' });
            });
        },
        closeCityCard() {
            this.closeMapSheet();
        },
        closeMapSheet() {
            this.setData({ selectedCityCard: null, selectedMapItem: null });
        },
        zoomHeroMap(event) {
            const delta = Number(event.currentTarget.dataset.delta || 0);
            this.applyHeroScale(Number(this.data.heroScale || MIN_HERO_SCALE) + delta * ZOOM_STEP);
        },
        onMapTouchStart(event) {
            const touches = event.touches || [];
            if (touches.length >= 2) {
                pinching = true;
                dragging = false;
                pinchStartDistance = touchDistance(touches[0], touches[1]);
                pinchStartScale = Number(this.data.heroScale || MIN_HERO_SCALE);
                return;
            }
            const touch = firstTouch(event);
            if (!touch) {
                return;
            }
            dragging = true;
            pinching = false;
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            dragOriginX = Number(this.data.heroOffsetX || 0);
            dragOriginY = Number(this.data.heroOffsetY || 0);
        },
        onMapTouchMove(event) {
            const touches = event.touches || [];
            if (pinching && touches.length >= 2 && pinchStartDistance > 0) {
                const nextDistance = touchDistance(touches[0], touches[1]);
                const nextScale = pinchStartScale * (nextDistance / pinchStartDistance);
                this.applyHeroScale(nextScale);
                return;
            }
            if (!dragging) {
                return;
            }
            const touch = firstTouch(event);
            if (!touch) {
                return;
            }
            const deltaX = (touch.clientX - dragStartX) * 2;
            const deltaY = (touch.clientY - dragStartY) * 2;
            this.setData({
                heroOffsetX: clampPan(dragOriginX + deltaX),
                heroOffsetY: clampPan(dragOriginY + deltaY)
            });
        },
        onMapTouchEnd(event) {
            const touches = event.touches || [];
            if (touches.length < 2) {
                pinching = false;
            }
            dragging = false;
        },
        focusRegion(regionId, showSheet = false) {
            const city = findCityById(regionId);
            if (!city) {
                return;
            }
            const nextScale = city.id === HANGZHOU_REGION_ID ? DEFAULT_CITY_SCALE : MIN_HERO_SCALE;
            const semanticLayer = (0, home_map_layers_1.getSemanticLayer)(nextScale);
            const visualDepthLevel = (0, home_map_layers_1.getVisualDepthLevel)(nextScale);
            const mapItem = cityToMapItem(city, this.data.activeDiscoveryId);
            this.setData({
                heroScale: nextScale,
                heroOffsetX: city.id === HANGZHOU_REGION_ID ? focusOffsetX(home_map_layers_1.HANGZHOU_CITY_MAP_ITEM) : focusOffsetX(mapItem),
                heroOffsetY: city.id === HANGZHOU_REGION_ID ? focusOffsetY(home_map_layers_1.HANGZHOU_CITY_MAP_ITEM) : focusOffsetY(mapItem),
                selectedCityId: city.id,
                selectedCityCard: showSheet ? buildSelectedCityCard(city.id, this.data.activeDiscoveryId) : null,
                selectedMapItem: showSheet ? buildMapSheet(mapItem, this.data.activeDiscoveryId) : null,
                layerFilterKeyword: '',
                semanticLayer,
                visualDepthLevel,
                detailElements: city.id === HANGZHOU_REGION_ID ? (0, home_map_layers_1.getDetailElements)(visualDepthLevel) : [],
                layerItems: city.id === HANGZHOU_REGION_ID ? (0, home_map_layers_1.getLayerItems)(semanticLayer, this.data.activeDiscoveryId) : [],
                searchKeyword: city.name
            });
        },
        focusMapItem(item, showSheet = true) {
            const targetScale = item.kind === 'poi' ? DEFAULT_POI_SCALE : item.kind === 'area' ? DEFAULT_AREA_SCALE : DEFAULT_CITY_SCALE;
            const nextScale = Math.max(Number(this.data.heroScale || MIN_HERO_SCALE), targetScale);
            const semanticLayer = (0, home_map_layers_1.getSemanticLayer)(nextScale);
            const visualDepthLevel = (0, home_map_layers_1.getVisualDepthLevel)(nextScale);
            const activeDiscoveryId = this.data.activeDiscoveryId;
            this.setData({
                heroScale: nextScale,
                heroOffsetX: focusOffsetX(item),
                heroOffsetY: focusOffsetY(item),
                selectedCityId: HANGZHOU_REGION_ID,
                selectedCityCard: item.kind === 'city' && showSheet ? buildSelectedCityCard(HANGZHOU_REGION_ID, activeDiscoveryId) : null,
                selectedMapItem: showSheet ? buildMapSheet(item, activeDiscoveryId) : null,
                semanticLayer,
                visualDepthLevel,
                detailElements: (0, home_map_layers_1.getDetailElements)(visualDepthLevel),
                layerItems: (0, home_map_layers_1.getLayerItems)(semanticLayer, activeDiscoveryId, String(this.data.layerFilterKeyword || ''))
            });
        },
        applyHeroScale(rawScale) {
            const heroScale = clampScale(rawScale);
            const semanticLayer = (0, home_map_layers_1.getSemanticLayer)(heroScale);
            const visualDepthLevel = (0, home_map_layers_1.getVisualDepthLevel)(heroScale);
            const activeDiscoveryId = this.data.activeDiscoveryId;
            this.setData({
                heroScale,
                semanticLayer,
                visualDepthLevel,
                detailElements: (0, home_map_layers_1.getDetailElements)(visualDepthLevel),
                layerItems: (0, home_map_layers_1.getLayerItems)(semanticLayer, activeDiscoveryId, String(this.data.layerFilterKeyword || ''))
            });
        },
        focusLocation(_location) {
            const selectedRegionId = String(this.data.selectedRegionId || '');
            if (selectedRegionId) {
                this.focusRegion(selectedRegionId, false);
            }
        }
    }
});
function getRegions(rawRegions) {
    return Array.isArray(rawRegions) ? rawRegions.filter(isValidRegion) : [];
}
function isValidRegion(region) {
    const item = region;
    return !!item && typeof item.id === 'string' && typeof item.name === 'string';
}
function findCityByKeyword(keyword, regions) {
    const normalized = keyword.toLowerCase();
    return (city_hotspots_1.CITY_HOTSPOTS.find((city) => {
        const region = regions.find((item) => item.id === city.id);
        return (city.name.includes(keyword) ||
            city.tags.some((tag) => tag.includes(keyword)) ||
            city.id.toLowerCase().includes(normalized) ||
            !!region?.name.includes(keyword));
    }) || null);
}
function findCityById(regionId) {
    return city_hotspots_1.CITY_HOTSPOTS.find((city) => city.id === regionId) || null;
}
function buildSelectedCityCard(cityId, discoveryId) {
    const city = findCityById(cityId);
    const chip = findDiscoveryChip(discoveryId);
    if (!city) {
        return null;
    }
    return {
        ...city,
        activeDiscoveryLabel: chip.label,
        activeDiscoveryNote: city.notes[chip.id]
    };
}
function buildMapSheet(item, discoveryId) {
    const chip = findDiscoveryChip(discoveryId);
    const city = item.kind === 'city' ? findCityById(item.targetId) : null;
    const ready = item.kind !== 'city' || city?.mvpReady === true;
    return {
        ...item,
        activeDiscoveryLabel: item.kind === 'city' ? chip.label : item.categoryLabel,
        note: item.kind === 'city' && city ? city.notes[chip.id] : item.actionHint,
        mvpReady: ready,
        statusLabel: item.kind === 'city' ? city?.statusLabel || '待完善' : '杭州先行版',
        mvpNotice: item.kind === 'city' ? city?.mvpNotice || '城市内容待完善。' : '杭州本地内容已接入探索、行程和街道地图。',
        primaryActionLabel: item.kind === 'poi' ? '加入行程' : '规划杭州行程'
    };
}
function cityToMapItem(city, discoveryId) {
    const chip = findDiscoveryChip(discoveryId);
    const hangzhouBase = city.id === HANGZHOU_REGION_ID ? home_map_layers_1.HANGZHOU_CITY_MAP_ITEM : null;
    return {
        id: city.id,
        kind: 'city',
        title: city.name,
        subtitle: city.mood,
        summary: hangzhouBase?.summary || city.summary,
        x: city.x,
        y: city.y,
        category: discoveryId,
        categoryLabel: chip.label,
        tags: city.tags,
        targetType: 'region',
        targetId: city.id,
        regionId: city.id,
        duration: city.recommendedDays,
        actionHint: city.notes[chip.id]
    };
}
function findLayerItemById(itemId, items) {
    return items.find((item) => item.id === itemId) || null;
}
function findDiscoveryChip(discoveryId) {
    return city_hotspots_1.DISCOVERY_CHIPS.find((item) => item.id === discoveryId) || city_hotspots_1.DISCOVERY_CHIPS[city_hotspots_1.DISCOVERY_CHIPS.length - 1];
}
function isMvpCity(cityId) {
    return findCityById(cityId)?.mvpReady === true;
}
function isDiscoveryId(value) {
    return city_hotspots_1.DISCOVERY_CHIPS.some((item) => item.id === value);
}
function resolveCityRegionId(regionId) {
    if (!regionId) {
        return '';
    }
    if (regionId === HANGZHOU_REGION_ID || regionId.startsWith('area-hangzhou') || regionId.startsWith('poi-hangzhou')) {
        return HANGZHOU_REGION_ID;
    }
    return regionId;
}
function firstTouch(event) {
    const touches = event.touches || [];
    return touches.length > 0 ? touches[0] : null;
}
function touchDistance(first, second) {
    const deltaX = first.clientX - second.clientX;
    const deltaY = first.clientY - second.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
function clampScale(scale) {
    return Math.max(MIN_HERO_SCALE, Math.min(MAX_HERO_SCALE, Number(scale.toFixed(2))));
}
function clampPan(value) {
    return Math.max(-MAX_PAN_RPX, Math.min(MAX_PAN_RPX, Math.round(value)));
}
function focusOffsetX(item) {
    return clampPan((50 - item.x) * 6);
}
function focusOffsetY(item) {
    return clampPan((50 - item.y) * 6);
}
function getMapItemLocation(item) {
    const known = KNOWN_POI_LOCATIONS[item.targetId];
    return known || HANGZHOU_FALLBACK_LOCATION;
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
const KNOWN_POI_LOCATIONS = {
    'poi-hangzhou-westlake': { lat: 30.2444, lng: 120.1436 },
    'poi-hangzhou-broken-bridge': { lat: 30.2586, lng: 120.1499 },
    'poi-hangzhou-leifeng-pagoda': { lat: 30.2335, lng: 120.1488 },
    'poi-hangzhou-quyuan': { lat: 30.2524, lng: 120.1339 },
    'poi-hangzhou-zhejiang-museum-gushan': { lat: 30.2522, lng: 120.1451 },
    'poi-hangzhou-lingyin': { lat: 30.2401, lng: 120.1023 },
    'poi-hangzhou-feilai-peak': { lat: 30.2397, lng: 120.0984 },
    'poi-hangzhou-longjing-village': { lat: 30.2186, lng: 120.0927 },
    'poi-hangzhou-jiuxi': { lat: 30.2035, lng: 120.1079 },
    'poi-hangzhou-hubin': { lat: 30.2558, lng: 120.1655 },
    'poi-hangzhou-wulin-night-market': { lat: 30.2727, lng: 120.1635 },
    'poi-hangzhou-hefang-street': { lat: 30.2416, lng: 120.1772 },
    'poi-hangzhou-southern-song-street': { lat: 30.2479, lng: 120.1754 },
    'poi-hangzhou-xiaohezhi-street': { lat: 30.3138, lng: 120.1398 },
    'poi-hangzhou-gongchen-bridge': { lat: 30.3192, lng: 120.1378 },
    'poi-hangzhou-xixi-wetland': { lat: 30.2668, lng: 120.0647 }
};
