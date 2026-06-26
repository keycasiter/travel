import { request } from '../../utils/api';
import { chinaProvinces } from '../../data/china-provinces';
import { findContainingMapFeature, findNearestRegion } from '../../utils/map-geometry';
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

  onFeatureTap(event: WechatMiniprogram.CustomEvent<{ name: string; code: string }>) {
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

  handleLocationSuccess(point: { lng: number; lat: number }) {
    const feature = findContainingMapFeature(chinaProvinces, point);
    const location: CurrentLocation = {
      ...point,
      label: feature ? feature.name : '当前位置'
    };

    let selectedRegionId = '';
    let locationStatus = feature
      ? `已定位到${feature.name}，地图已聚焦当前位置。`
      : `已定位到 ${point.lat.toFixed(2)}, ${point.lng.toFixed(2)}，地图已聚焦当前位置。`;

    try {
      const nearest = findNearestRegion(this.data.regions, point);
      if (nearest.distanceKm <= 120) {
        selectedRegionId = nearest.region.id;
        locationStatus = feature
          ? `已定位到${feature.name}，附近支持 ${nearest.region.name} 内容。`
          : `已定位到附近，附近支持 ${nearest.region.name} 内容。`;
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

  focusMapRegion(regionId: string) {
    const map = this.selectComponent('#inkMap') as { focusRegion?: (regionId: string) => void } | null;
    if (map?.focusRegion) {
      map.focusRegion(regionId);
    }
  },

  focusMapLocation(location: CurrentLocation) {
    const map = this.selectComponent('#inkMap') as { focusLocation?: (location: CurrentLocation, scale?: number) => void } | null;
    if (map?.focusLocation) {
      map.focusLocation(location, 1.75);
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
