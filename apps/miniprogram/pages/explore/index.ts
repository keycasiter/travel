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
        this.setData({ locationStatus: '未授权定位，已保持地图浏览视角；可手动搜索或选择已支持城市。' });
      }
    });
  },

  handleLocationSuccess(point: { lng: number; lat: number }) {
    const location: CurrentLocation = {
      ...point,
      label: '当前位置'
    };

    let selectedRegionId = '';
    let locationStatus = `已定位到 ${point.lat.toFixed(2)}, ${point.lng.toFixed(2)}，地图已聚焦当前位置。`;

    try {
      const nearest = findNearestRegion(this.data.regions, point);
      if (nearest.distanceKm <= 120) {
        selectedRegionId = nearest.region.id;
        locationStatus = `已定位到当前位置，附近支持 ${nearest.region.name} 内容。`;
      } else {
        locationStatus = `${locationStatus} 附近灵感待完善，可搜索或选择已支持城市。`;
      }
    } catch (error) {
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
