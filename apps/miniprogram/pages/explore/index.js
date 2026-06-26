"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
Page({
    data: {
        regions: [],
        selectedRegionId: '',
        activeOverview: null,
        sheetVisible: false,
        locationStatus: '点击定位，将地图移动到你附近的城市灵感。'
    },
    onLoad() {
        this.bootstrap();
    },
    async bootstrap() {
        await this.login();
        await this.loadRegions();
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
            this.setData({ regions: regions.map(withMarkerPosition) });
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
    onLocate() {
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.setData({ locationStatus: `已定位到 ${res.latitude.toFixed(2)}, ${res.longitude.toFixed(2)}` });
            },
            fail: () => {
                this.setData({ locationStatus: '未授权定位，已保持全国探索视角。' });
            }
        });
    },
    closeSheet() {
        this.setData({ sheetVisible: false });
    },
    goPlan() {
        wx.switchTab({ url: '/pages/itinerary/index' });
    }
});
function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
    });
}
function withMarkerPosition(region) {
    const known = {
        'city-hangzhou': { left: 57, top: 45 },
        'city-beijing': { left: 49, top: 34 }
    };
    const position = known[region.id] || { left: 50, top: 45 };
    return { ...region, markerLeft: position.left, markerTop: position.top };
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
