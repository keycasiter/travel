"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const city_hotspots_1 = require("./city-hotspots");
const MAP_HERO_IMAGE = '/assets/maps/home-map-mobile.jpg';
const MIN_HERO_SCALE = 1;
const MAX_HERO_SCALE = 1.35;
const DEFAULT_CITY_SCALE = 1.18;
const MAX_PAN_RPX = 160;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragging = false;
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
        heroScale: MIN_HERO_SCALE,
        heroOffsetX: 0,
        heroOffsetY: 0,
        cityHotspots: city_hotspots_1.CITY_HOTSPOTS,
        discoveryChips: city_hotspots_1.DISCOVERY_CHIPS,
        activeDiscoveryId: 'inspiration',
        searchKeyword: '',
        selectedCityId: '',
        selectedCityCard: null,
        calibrationAvailable: false,
        calibrationEnabled: false,
        calibrationPoint: null
    },
    lifetimes: {
        attached() {
            this.setData({ calibrationAvailable: isCalibrationAvailable() });
        }
    },
    observers: {
        selectedRegionId(regionId) {
            if (regionId && regionId !== this.data.selectedCityId) {
                this.focusRegion(regionId);
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
                wx.showToast({ title: '输入想找的城市', icon: 'none' });
                return;
            }
            const matched = findCityByKeyword(keyword, getRegions(this.data.regions));
            if (!matched) {
                wx.showToast({ title: '先支持 8 个种子城市', icon: 'none' });
                return;
            }
            this.focusRegion(matched.id);
        },
        tapDiscoveryChip(event) {
            const chipId = String(event.currentTarget.dataset.id || '');
            if (!isDiscoveryId(chipId)) {
                return;
            }
            const selectedCityId = String(this.data.selectedCityId || '');
            this.setData({ activeDiscoveryId: chipId });
            if (selectedCityId) {
                this.setData({ selectedCityCard: buildSelectedCityCard(selectedCityId, chipId) });
                return;
            }
            wx.showToast({ title: '先点一个城市', icon: 'none' });
        },
        tapCityHotspot(event) {
            const cityId = String(event.currentTarget.dataset.id || '');
            this.focusRegion(cityId);
        },
        enterCityDetail(event) {
            const cityId = String(event.currentTarget.dataset.id || this.data.selectedCityId || '');
            if (!cityId) {
                return;
            }
            this.triggerEvent('regiontap', { regionId: cityId });
        },
        goPlan(event) {
            const cityId = String(event.currentTarget.dataset.id || this.data.selectedCityId || '');
            if (cityId) {
                wx.setStorageSync('pendingDestinationRegionId', cityId);
            }
            wx.switchTab({ url: '/pages/itinerary/index' });
        },
        closeCityCard() {
            this.setData({ selectedCityCard: null, selectedCityId: '' });
        },
        zoomHeroMap(event) {
            const delta = Number(event.currentTarget.dataset.delta || 0);
            const nextScale = clampScale(Number(this.data.heroScale) + delta * 0.08);
            this.setData({ heroScale: nextScale });
        },
        resetHeroMap() {
            this.setData({
                heroScale: MIN_HERO_SCALE,
                heroOffsetX: 0,
                heroOffsetY: 0,
                selectedCityId: '',
                selectedCityCard: null
            });
        },
        toggleCalibrationMode() {
            const calibrationEnabled = !this.data.calibrationEnabled;
            this.setData({
                calibrationEnabled,
                calibrationPoint: null,
                heroScale: MIN_HERO_SCALE,
                heroOffsetX: 0,
                heroOffsetY: 0
            });
        },
        markCalibrationPoint(event) {
            if (!this.data.calibrationEnabled) {
                return;
            }
            const touch = firstChangedTouch(event);
            if (!touch) {
                return;
            }
            const query = this.createSelectorQuery();
            query
                .select('.hero-map-stage')
                .boundingClientRect((rect) => {
                const box = rect;
                if (!box?.width || !box.height) {
                    return;
                }
                const x = clampPercent(((touch.clientX - box.left) / box.width) * 100);
                const y = clampPercent(((touch.clientY - box.top) / box.height) * 100);
                const snippet = `x: ${x}, y: ${y}`;
                this.setData({
                    calibrationPoint: {
                        x,
                        y,
                        left: `${x}%`,
                        top: `${y}%`,
                        snippet
                    }
                });
                console.info(`[home-map-calibration] ${snippet}`);
            })
                .exec();
        },
        copyCalibrationPoint() {
            const point = this.data.calibrationPoint;
            if (!point) {
                wx.showToast({ title: '先点地图取坐标', icon: 'none' });
                return;
            }
            wx.setClipboardData({ data: point.snippet });
        },
        onMapTouchStart(event) {
            const touch = firstTouch(event);
            if (!touch) {
                return;
            }
            dragging = true;
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            dragOriginX = Number(this.data.heroOffsetX || 0);
            dragOriginY = Number(this.data.heroOffsetY || 0);
        },
        onMapTouchMove(event) {
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
        onMapTouchEnd() {
            dragging = false;
        },
        focusRegion(regionId) {
            const city = findCityById(regionId);
            if (!city) {
                return;
            }
            this.setData({
                heroScale: DEFAULT_CITY_SCALE,
                heroOffsetX: clampPan((50 - city.x) * 5),
                heroOffsetY: clampPan((50 - city.y) * 5),
                selectedCityId: city.id,
                selectedCityCard: buildSelectedCityCard(city.id, this.data.activeDiscoveryId),
                searchKeyword: city.name
            });
        },
        focusLocation(_location) {
            const selectedRegionId = String(this.data.selectedRegionId || '');
            if (selectedRegionId) {
                this.focusRegion(selectedRegionId);
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
    const chip = city_hotspots_1.DISCOVERY_CHIPS.find((item) => item.id === discoveryId) || city_hotspots_1.DISCOVERY_CHIPS[city_hotspots_1.DISCOVERY_CHIPS.length - 1];
    if (!city) {
        return null;
    }
    return {
        ...city,
        activeDiscoveryLabel: chip.label,
        activeDiscoveryNote: city.notes[chip.id]
    };
}
function isDiscoveryId(value) {
    return city_hotspots_1.DISCOVERY_CHIPS.some((item) => item.id === value);
}
function firstTouch(event) {
    const touches = event.touches || [];
    return touches.length > 0 ? touches[0] : null;
}
function firstChangedTouch(event) {
    const touches = event.changedTouches || event.touches || [];
    return touches.length > 0 ? touches[0] : null;
}
function clampScale(scale) {
    return Math.max(MIN_HERO_SCALE, Math.min(MAX_HERO_SCALE, Number(scale.toFixed(2))));
}
function clampPan(value) {
    return Math.max(-MAX_PAN_RPX, Math.min(MAX_PAN_RPX, Math.round(value)));
}
function clampPercent(value) {
    return Number(Math.max(0, Math.min(100, value)).toFixed(2));
}
function isCalibrationAvailable() {
    try {
        return wx.getAccountInfoSync().miniProgram.envVersion !== 'release';
    }
    catch (_error) {
        return true;
    }
}
