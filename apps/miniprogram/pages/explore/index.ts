import { request } from '../../utils/api';
import { findNearestRegion } from '../../utils/map-geometry';
import type { LoginResult, Region, RegionOverview } from '../../utils/types';

Page({
  data: {
    regions: [] as Region[],
    selectedRegionId: '',
    activeOverview: null as RegionOverview | null,
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
      const result = await request<LoginResult>('/api/v1/auth/wechat-login', 'POST', { code: login.code || 'dev-code' });
      wx.setStorageSync('userId', result.userId);
    } catch (error) {
      this.setData({ locationStatus: `本地 API 未连接：${messageOf(error)}` });
    }
  },

  async loadRegions() {
    try {
      const regions = await request<Region[]>('/api/v1/regions?level=city');
      this.setData({ regions });
    } catch (error) {
      this.setData({ locationStatus: `城市内容加载失败：${messageOf(error)}` });
    }
  },

  async onRegionTap(event: WechatMiniprogram.CustomEvent<{ regionId: string }>) {
    const regionId = event.detail.regionId;
    this.setData({ selectedRegionId: regionId });
    try {
      const activeOverview = await request<RegionOverview>(`/api/v1/regions/${regionId}/overview`);
      this.setData({ activeOverview, sheetVisible: true });
    } catch (error) {
      this.setData({ locationStatus: `区域内容加载失败：${messageOf(error)}` });
    }
  },

  onLocate() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        try {
          const nearest = findNearestRegion(this.data.regions, { lng: res.longitude, lat: res.latitude });
          const status =
            nearest.distanceKm <= 120
              ? `已定位到附近，地图已聚焦 ${nearest.region.name}。`
              : `附近灵感待完善，已先聚焦离你最近的 ${nearest.region.name}。`;
          this.setData({ selectedRegionId: nearest.region.id, locationStatus: status });
          this.focusMapRegion(nearest.region.id);
        } catch (error) {
          this.setData({ locationStatus: `已定位到 ${res.latitude.toFixed(2)}, ${res.longitude.toFixed(2)}，城市内容仍在加载。` });
        }
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
  },

  focusMapRegion(regionId: string) {
    const map = this.selectComponent('#inkMap') as { focusRegion?: (regionId: string) => void } | null;
    if (map?.focusRegion) {
      map.focusRegion(regionId);
    }
  }
});

function wxLogin(): Promise<WechatMiniprogram.LoginSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
