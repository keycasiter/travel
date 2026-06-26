import { request } from '../../utils/api';
import { findNearestRegion } from '../../utils/map-geometry';
import type { LoginResult, Region, RegionOverview } from '../../utils/types';

interface CurrentLocation {
  lng: number;
  lat: number;
  label: string;
}

Page({
  data: {
    regions: [] as Region[],
    selectedRegionId: '',
    currentLocation: null as CurrentLocation | null,
    activeOverview: null as RegionOverview | null,
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
      const result = await request<LoginResult>('/api/v1/auth/wechat-login', 'POST', { code: login.code || 'dev-code' });
      wx.setStorageSync('userId', result.userId);
    } catch (error) {
      wx.showToast({ title: `本地 API 未连接：${messageOf(error)}`, icon: 'none' });
    }
  },

  async loadRegions() {
    try {
      const regions = await request<Region[]>('/api/v1/regions?level=city');
      this.setData({ regions });
    } catch (error) {
      wx.showToast({ title: `城市内容加载失败：${messageOf(error)}`, icon: 'none' });
    }
  },

  async onRegionTap(event: WechatMiniprogram.CustomEvent<{ regionId: string }>) {
    const regionId = event.detail.regionId;
    this.setData({ selectedRegionId: regionId });
    try {
      const activeOverview = await request<RegionOverview>(`/api/v1/regions/${regionId}/overview`);
      this.setData({ activeOverview, sheetVisible: true });
    } catch (error) {
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

  handleLocationSuccess(point: { lng: number; lat: number }) {
    const location: CurrentLocation = {
      ...point,
      label: '当前位置'
    };

    let selectedRegionId = '';

    try {
      const nearest = findNearestRegion(this.data.regions, point);
      if (nearest.distanceKm <= 120) {
        selectedRegionId = nearest.region.id;
      }
    } catch (error) {
      selectedRegionId = '';
    }

    this.setData({ currentLocation: location, selectedRegionId });
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
      wx.showToast({ title: '请先选择城市', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/region-map/index?regionId=${encodeURIComponent(regionId)}` });
  },

  focusMapRegion(regionId: string) {
    const map = this.selectComponent('#inkMap') as { focusRegion?: (regionId: string) => void } | null;
    if (map?.focusRegion) {
      map.focusRegion(regionId);
    }
  },

  focusMapLocation(location: CurrentLocation) {
    const map = this.selectComponent('#inkMap') as { focusLocation?: (location: CurrentLocation, scale?: number) => void } | null;
    if (map?.focusLocation) {
      map.focusLocation(location, 14);
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
