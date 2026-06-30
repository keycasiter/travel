import { request } from '../../utils/api';
import { ensureUserId } from '../../utils/auth';
import { findNearestRegion } from '../../utils/map-geometry';
import type { Guide, Poi, Region, RegionOverview } from '../../utils/types';

const HANGZHOU_REGION_ID = 'city-hangzhou';

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
    return;
  },

  async loadRegions(): Promise<Region[]> {
    try {
      const regions = await request<Region[]>('/api/v1/regions?level=city');
      this.setData({ regions });
      return regions;
    } catch (error) {
      wx.showToast({ title: `城市内容加载失败：${messageOf(error)}`, icon: 'none' });
      return [];
    }
  },

  async ensureRegionsLoaded(): Promise<Region[]> {
    if (this.data.regions.length > 0) {
      return this.data.regions;
    }
    return this.loadRegions();
  },

  async onRegionTap(event: WechatMiniprogram.CustomEvent<{ regionId: string }>) {
    const regionId = event.detail.regionId;
    if (regionId !== HANGZHOU_REGION_ID) {
      wx.showToast({ title: '城市待完善，先体验杭州', icon: 'none' });
      return;
    }
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
      isHighAccuracy: true,
      highAccuracyExpireTime: 3000,
      success: async (res) => {
        await this.ensureRegionsLoaded();
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

  async saveFavorite(event: WechatMiniprogram.TouchEvent) {
    const targetType = String(event.currentTarget.dataset.type || 'region');
    const targetId = String(event.currentTarget.dataset.id || HANGZHOU_REGION_ID);
    try {
      await ensureUserId();
      await request('/api/v1/favorites', 'POST', { targetType, targetId });
      wx.showToast({ title: '已收藏', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: `收藏失败：${messageOf(error)}`, icon: 'none' });
    }
  },

  addPoiToItinerary(event: WechatMiniprogram.TouchEvent) {
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

  async addGuideToFavorite(event: WechatMiniprogram.TouchEvent) {
    const guide = findGuideById(this.data.activeOverview?.guides || [], String(event.currentTarget.dataset.id || ''));
    if (!guide) {
      wx.showToast({ title: '攻略信息缺失', icon: 'none' });
      return;
    }
    try {
      await ensureUserId();
      await request('/api/v1/favorites', 'POST', { targetType: 'guide', targetId: guide.id });
      wx.showToast({ title: '攻略已收藏', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: `收藏失败：${messageOf(error)}`, icon: 'none' });
    }
  },

  focusMapRegion(regionId: string) {
    const map = this.selectComponent('#inkMap') as { focusRegion?: (regionId: string) => void } | null;
    if (map?.focusRegion) {
      map.focusRegion(regionId);
    }
  },

});

function findPoiById(pois: Poi[], id: string): Poi | null {
  return pois.find((poi) => poi.id === id) || null;
}

function findGuideById(guides: Guide[], id: string): Guide | null {
  return guides.find((guide) => guide.id === id) || null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
