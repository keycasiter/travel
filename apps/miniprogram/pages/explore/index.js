"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const china_provinces_1 = require("../../data/china-provinces");
const map_geometry_1 = require("../../utils/map-geometry");
Page({
    data: {
        regions: [],
        selectedRegionId: '',
        currentLocation: null,
        activeOverview: null,
        sheetVisible: false,
        locationStatus: '正在获取当前位置，用于定位附近旅行灵感。'
    },
    onLoad() {
        this.bootstrap();
    },
    async bootstrap() {
        await this.login();
        await this.loadRegions();
        this.requestLocation();
    },
    async login() {
        try {
            const login = await wxLogin();
            const result = await (0, api_1.request)('/api/v1/auth/wechat-login', 'POST', { code: login.code || 'dev-code' });
            wx.setStorageSync('userId', result.userId);
        }
        catch (error) {
            this.setData({ locationStatus: `本地 API 未连接：${messageOf(error)}` });
        }
    },
    async loadRegions() {
        try {
            const regions = await (0, api_1.request)('/api/v1/regions?level=city');
            this.setData({ regions });
        }
        catch (error) {
            this.setData({ locationStatus: `城市内容加载失败：${messageOf(error)}` });
        }
    },
    async onRegionTap(event) {
        const regionId = event.detail.regionId;
        this.setData({ selectedRegionId: regionId });
        try {
            const activeOverview = await (0, api_1.request)(`/api/v1/regions/${regionId}/overview`);
            this.setData({ activeOverview, sheetVisible: true });
        }
        catch (error) {
            this.setData({ locationStatus: `区域内容加载失败：${messageOf(error)}` });
        }
    },
    onFeatureTap(event) {
        const featureName = event.detail.name;
        if (!featureName) {
            return;
        }
        const supported = this.data.regions.some((region) => region.name.includes(featureName) || featureName.includes(region.name));
        this.setData({
            locationStatus: supported
                ? `已放大到${featureName}，可点击城市热点查看内容。`
                : `已放大到${featureName}，该地区灵感待完善，可搜索或选择已支持城市。`
        });
    },
    onLocate() {
        this.requestLocation();
    },
    requestLocation() {
        this.setData({ locationStatus: '正在获取当前位置...' });
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.handleLocationSuccess({ lng: res.longitude, lat: res.latitude });
            },
            fail: () => {
                this.setData({ locationStatus: '未授权定位，已保持全国探索视角；可手动搜索或选择已支持城市。' });
            }
        });
    },
    handleLocationSuccess(point) {
        const feature = (0, map_geometry_1.findContainingMapFeature)(china_provinces_1.chinaProvinces, point);
        const location = {
            ...point,
            label: feature ? feature.name : '当前位置'
        };
        let selectedRegionId = '';
        let locationStatus = feature
            ? `已定位到${feature.name}，地图已聚焦当前位置。`
            : `已定位到 ${point.lat.toFixed(2)}, ${point.lng.toFixed(2)}，地图已聚焦当前位置。`;
        try {
            const nearest = (0, map_geometry_1.findNearestRegion)(this.data.regions, point);
            if (nearest.distanceKm <= 120) {
                selectedRegionId = nearest.region.id;
                locationStatus = feature
                    ? `已定位到${feature.name}，附近支持 ${nearest.region.name} 内容。`
                    : `已定位到附近，附近支持 ${nearest.region.name} 内容。`;
            }
            else {
                locationStatus = `${locationStatus} 附近灵感待完善，可搜索或选择已支持城市。`;
            }
        }
        catch (error) {
            locationStatus = `${locationStatus} 城市内容仍在加载。`;
        }
        this.setData({ currentLocation: location, selectedRegionId, locationStatus });
        this.focusMapLocation(location);
    },
    closeSheet() {
        this.setData({ sheetVisible: false });
    },
    goPlan() {
        wx.switchTab({ url: '/pages/itinerary/index' });
    },
    goRegionMap() {
        const regionId = this.data.activeOverview?.region.id || this.data.selectedRegionId;
        if (!regionId) {
            this.setData({ locationStatus: '请先选择一个已支持城市。' });
            return;
        }
        wx.navigateTo({ url: `/pages/region-map/index?regionId=${encodeURIComponent(regionId)}` });
    },
    focusMapRegion(regionId) {
        const map = this.selectComponent('#inkMap');
        if (map?.focusRegion) {
            map.focusRegion(regionId);
        }
    },
    focusMapLocation(location) {
        const map = this.selectComponent('#inkMap');
        if (map?.focusLocation) {
            map.focusLocation(location, 1.75);
        }
    }
});
function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
    });
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
