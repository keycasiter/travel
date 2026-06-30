"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const map_geometry_1 = require("../../utils/map-geometry");
const HANGZHOU_REGION_ID = 'city-hangzhou';
Page({
    data: {
        regions: [],
        selectedRegionId: '',
        currentLocation: null,
        activeOverview: null,
        sheetVisible: false
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
            wx.showToast({ title: `本地 API 未连接：${messageOf(error)}`, icon: 'none' });
        }
    },
    async loadRegions() {
        try {
            const regions = await (0, api_1.request)('/api/v1/regions?level=city');
            this.setData({ regions });
        }
        catch (error) {
            wx.showToast({ title: `城市内容加载失败：${messageOf(error)}`, icon: 'none' });
        }
    },
    async onRegionTap(event) {
        const regionId = event.detail.regionId;
        if (regionId !== HANGZHOU_REGION_ID) {
            wx.showToast({ title: '城市待完善，先体验杭州', icon: 'none' });
            return;
        }
        this.setData({ selectedRegionId: regionId });
        try {
            const activeOverview = await (0, api_1.request)(`/api/v1/regions/${regionId}/overview`);
            this.setData({ activeOverview, sheetVisible: true });
        }
        catch (error) {
            wx.showToast({ title: `区域内容加载失败：${messageOf(error)}`, icon: 'none' });
        }
    },
    onLocate() {
        this.requestLocation();
    },
    requestLocation() {
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.handleLocationSuccess({ lng: res.longitude, lat: res.latitude });
            },
            fail: () => {
                wx.showToast({ title: '未授权定位，可手动搜索', icon: 'none' });
            }
        });
    },
    handleLocationSuccess(point) {
        const location = {
            ...point,
            label: '当前位置'
        };
        let selectedRegionId = '';
        try {
            const nearest = (0, map_geometry_1.findNearestRegion)(this.data.regions, point);
            if (nearest.distanceKm <= 120) {
                selectedRegionId = nearest.region.id;
            }
        }
        catch (error) {
            selectedRegionId = '';
        }
        this.setData({ currentLocation: location, selectedRegionId });
    },
    closeSheet() {
        this.setData({ sheetVisible: false });
    },
    goPlan() {
        wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
        wx.switchTab({ url: '/pages/itinerary/index' });
    },
    goRegionMap() {
        const regionId = this.data.activeOverview?.region.id || this.data.selectedRegionId;
        if (!regionId) {
            wx.showToast({ title: '请先选择城市', icon: 'none' });
            return;
        }
        wx.navigateTo({ url: `/pages/region-map/index?regionId=${encodeURIComponent(regionId)}` });
    },
    async saveFavorite(event) {
        const targetType = String(event.currentTarget.dataset.type || 'region');
        const targetId = String(event.currentTarget.dataset.id || HANGZHOU_REGION_ID);
        try {
            await (0, api_1.request)('/api/v1/favorites', 'POST', { targetType, targetId });
            wx.showToast({ title: '已收藏', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: `收藏失败：${messageOf(error)}`, icon: 'none' });
        }
    },
    addPoiToItinerary(event) {
        const poi = findPoiById(this.data.activeOverview?.pois || [], String(event.currentTarget.dataset.id || ''));
        if (!poi) {
            wx.showToast({ title: '点位信息缺失', icon: 'none' });
            return;
        }
        wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
        wx.setStorageSync('pendingItineraryPlace', {
            id: poi.id,
            title: poi.name,
            address: poi.summary,
            category: poi.type,
            location: {
                lat: poi.lat,
                lng: poi.lng
            }
        });
        wx.switchTab({ url: '/pages/itinerary/index' });
    },
    async addGuideToFavorite(event) {
        const guide = findGuideById(this.data.activeOverview?.guides || [], String(event.currentTarget.dataset.id || ''));
        if (!guide) {
            wx.showToast({ title: '攻略信息缺失', icon: 'none' });
            return;
        }
        try {
            await (0, api_1.request)('/api/v1/favorites', 'POST', { targetType: 'guide', targetId: guide.id });
            wx.showToast({ title: '攻略已收藏', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: `收藏失败：${messageOf(error)}`, icon: 'none' });
        }
    },
    focusMapRegion(regionId) {
        const map = this.selectComponent('#inkMap');
        if (map?.focusRegion) {
            map.focusRegion(regionId);
        }
    },
});
function findPoiById(pois, id) {
    return pois.find((poi) => poi.id === id) || null;
}
function findGuideById(guides, id) {
    return guides.find((guide) => guide.id === id) || null;
}
function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
    });
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
