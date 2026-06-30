import { request } from '../../utils/api';
import { ensureUserId } from '../../utils/auth';
import type { Poi, RegionOverview, TravelService } from '../../utils/types';

const HANGZHOU_REGION_ID = 'city-hangzhou';

interface NativeMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  width: number;
  height: number;
  callout: {
    content: string;
    color: string;
    fontSize: number;
    borderRadius: number;
    bgColor: string;
    padding: number;
    display: 'ALWAYS' | 'BYCLICK';
  };
}

interface MapPoint {
  latitude: number;
  longitude: number;
}

Page({
  data: {
    regionId: '',
    regionName: '',
    longitude: 116.3972,
    latitude: 39.9163,
    scale: 16,
    markers: [] as NativeMapMarker[],
    includePoints: [] as MapPoint[],
    hasIncludePoints: false,
    pois: [] as Poi[],
    selectedPoi: null as Poi | null,
    transportServices: [] as TravelService[],
    statusText: '正在加载街道地图...'
  },

  onLoad(options: Record<string, string | undefined>) {
    const regionId = options.regionId || '';
    if (!regionId) {
      this.setData({ statusText: '缺少城市信息，无法打开地图。' });
      return;
    }
    this.setData({ regionId });
    this.loadOverview(regionId);
  },

  async loadOverview(regionId: string) {
    try {
      const overview = await request<RegionOverview>(`/api/v1/regions/${regionId}/overview`);
      const pois = overview.pois.filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng));
      const selectedPoi = pois[0] || null;
      const center = selectedPoi
        ? { latitude: selectedPoi.lat, longitude: selectedPoi.lng }
        : { latitude: overview.region.centerLat, longitude: overview.region.centerLng };

      this.setData({
        regionName: overview.region.name,
        latitude: center.latitude,
        longitude: center.longitude,
        scale: 16,
        pois,
        selectedPoi,
        markers: buildMarkers(pois),
        includePoints: [],
        hasIncludePoints: false,
        transportServices: overview.services.filter((service) => service.type === 'transport'),
        statusText: pois.length > 0 ? `${overview.region.name}街道地图` : `${overview.region.name}暂无点位数据`
      });
    } catch (error) {
      this.setData({ statusText: `地图内容加载失败：${messageOf(error)}` });
    }
  },

  onMarkerTap(event: WechatMiniprogram.CustomEvent<{ markerId: number }>) {
    const markerId = Number(event.detail.markerId || 0);
    const selectedPoi = this.data.pois[markerId - 1];
    if (!selectedPoi) {
      return;
    }
    this.setData({
      selectedPoi,
      latitude: selectedPoi.lat,
      longitude: selectedPoi.lng,
      scale: 19,
      includePoints: [],
      hasIncludePoints: false,
      statusText: selectedPoi.name
    });
  },

  zoomToStreet() {
    const selectedPoi = this.data.selectedPoi;
    if (!selectedPoi) {
      this.setData({ scale: 20, includePoints: [], hasIncludePoints: false });
      return;
    }
    this.setData({
      latitude: selectedPoi.lat,
      longitude: selectedPoi.lng,
      scale: 20,
      includePoints: [],
      hasIncludePoints: false,
      statusText: `${selectedPoi.name}附近`
    });
  },

  showAllPois() {
    const firstPoi = this.data.pois[0];
    if (!firstPoi) {
      return;
    }
    this.setData({
      latitude: firstPoi.lat,
      longitude: firstPoi.lng,
      scale: 13,
      includePoints: this.data.pois.map((poi) => ({ latitude: poi.lat, longitude: poi.lng })),
      hasIncludePoints: true,
      statusText: `${this.data.regionName}点位总览`
    });
  },

  locateMe() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 19,
          includePoints: [],
          hasIncludePoints: false,
          statusText: '已定位到当前位置'
        });
      },
      fail: () => {
        this.setData({ statusText: '未授权定位，已保留当前地图视角。' });
      }
    });
  },

  openTraffic() {
    const selectedPoi = this.data.selectedPoi;
    if (!selectedPoi) {
      this.setData({ statusText: '请先选择一个点位。' });
      return;
    }
    wx.openLocation({
      latitude: selectedPoi.lat,
      longitude: selectedPoi.lng,
      name: selectedPoi.name,
      address: selectedPoi.summary,
      scale: 18
    });
  },

  async saveSelectedPoi() {
    const selectedPoi = this.data.selectedPoi;
    if (!selectedPoi) {
      this.setData({ statusText: '请先选择一个点位。' });
      return;
    }
    try {
      await ensureUserId();
      await request('/api/v1/favorites', 'POST', { targetType: 'poi', targetId: selectedPoi.id });
      this.setData({ statusText: `已收藏：${selectedPoi.name}` });
    } catch (error) {
      this.setData({ statusText: `收藏失败：${messageOf(error)}` });
    }
  },

  addSelectedPoiToItinerary() {
    const selectedPoi = this.data.selectedPoi;
    if (!selectedPoi) {
      this.setData({ statusText: '请先选择一个点位。' });
      return;
    }
    wx.setStorageSync('pendingDestinationRegionId', HANGZHOU_REGION_ID);
    wx.setStorageSync('pendingItineraryPlace', {
      id: selectedPoi.id,
      title: selectedPoi.name,
      address: selectedPoi.summary,
      category: selectedPoi.type,
      location: {
        lat: selectedPoi.lat,
        lng: selectedPoi.lng
      }
    });
    wx.switchTab({ url: '/pages/itinerary/index' });
  },

  goBack() {
    wx.navigateBack();
  }
});

function buildMarkers(pois: Poi[]): NativeMapMarker[] {
  return pois.map((poi, index) => ({
    id: index + 1,
    latitude: poi.lat,
    longitude: poi.lng,
    title: poi.name,
    width: 28,
    height: 34,
    callout: {
      content: poi.name,
      color: '#22322d',
      fontSize: 13,
      borderRadius: 4,
      bgColor: '#fffdf8',
      padding: 6,
      display: index === 0 ? 'ALWAYS' : 'BYCLICK'
    }
  }));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
