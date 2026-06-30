import { request } from '../../utils/api';
import { ensureUserId } from '../../utils/auth';
import type { Itinerary, ItineraryDetail, Region, ShareView, WeatherSummary } from '../../utils/types';

const HANGZHOU_REGION_ID = 'city-hangzhou';

interface PendingItineraryPlace {
  id: string;
  title: string;
  address: string;
  category: string;
  location: {
    lat: number;
    lng: number;
  };
}

Page({
  data: {
    destinations: [] as Region[],
    destinationNames: ['杭州'] as string[],
    selectedDestinationIndex: 0,
    selectedDestinationId: HANGZHOU_REGION_ID,
    days: 2,
    preferencesText: '城市漫步,历史文化',
    currentItinerary: null as ItineraryDetail | null,
    itineraries: [] as Itinerary[],
    weather: null as WeatherSummary | null,
    pendingPlace: null as PendingItineraryPlace | null,
    status: '杭州先行版：选择天数和偏好，生成可执行自由行计划。'
  },

  onLoad() {
    this.loadInitialData();
  },

  onShow() {
    this.consumePendingDestination();
    this.consumePendingPlace();
  },

  async loadInitialData() {
    await Promise.all([this.loadDestinations(), this.loadItineraries()]);
    this.consumePendingDestination();
    this.consumePendingPlace();
  },

  consumePendingPlace() {
    const pendingPlace = wx.getStorageSync('pendingItineraryPlace') as PendingItineraryPlace | '';
    if (!pendingPlace || !pendingPlace.id) {
      return;
    }
    wx.removeStorageSync('pendingItineraryPlace');
    const preference = `想去:${pendingPlace.title}`;
    const preferences = this.data.preferencesText.split(',').map((item) => item.trim()).filter(Boolean);
    const preferencesText = preferences.includes(preference) ? this.data.preferencesText : [...preferences, preference].join(',');
    this.setData({
      pendingPlace,
      preferencesText,
      status: `已加入待规划点位：${pendingPlace.title}`
    });
  },

  consumePendingDestination() {
    const pendingDestination = wx.getStorageSync('pendingDestinationRegionId') as string | '';
    if (!pendingDestination) {
      return;
    }
    wx.removeStorageSync('pendingDestinationRegionId');
    if (pendingDestination !== HANGZHOU_REGION_ID) {
      this.setData({ status: '该城市攻略待完善，已切回杭州先行版。' });
      return;
    }
    this.setData({
      selectedDestinationId: HANGZHOU_REGION_ID,
      selectedDestinationIndex: 0,
      status: '已选择杭州，可继续生成行程。'
    });
  },

  async loadDestinations() {
    try {
      const allDestinations = await request<Region[]>('/api/v1/regions?level=city');
      const destinations = allDestinations.filter((item) => item.id === HANGZHOU_REGION_ID);
      this.setData({
        destinations,
        destinationNames: destinations.map((item) => item.name),
        selectedDestinationId: destinations[0]?.id || HANGZHOU_REGION_ID
      });
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  async loadItineraries() {
    try {
      await ensureUserId();
      const itineraries = await request<Itinerary[]>('/api/v1/itineraries');
      this.setData({ itineraries });
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  onDestinationChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const selectedDestinationIndex = Number(event.detail.value);
    const selected = this.data.destinations[selectedDestinationIndex];
    this.setData({
      selectedDestinationIndex,
      selectedDestinationId: selected?.id || HANGZHOU_REGION_ID
    });
  },

  onDaysInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const days = Math.max(1, Math.min(14, Number(event.detail.value) || 1));
    this.setData({ days });
  },

  onPreferencesInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ preferencesText: event.detail.value });
  },

  async generate() {
    const preferences = this.data.preferencesText.split(',').map((item) => item.trim()).filter(Boolean);
    try {
      await ensureUserId();
      const currentItinerary = await request<ItineraryDetail>('/api/v1/itineraries/generate', 'POST', {
        destinationRegionId: this.data.selectedDestinationId,
        days: this.data.days,
        preferences
      });
      const weather = await request<WeatherSummary>(`/api/v1/weather/summary?regionId=${this.data.selectedDestinationId}`);
      this.setData({ currentItinerary, weather, status: '行程已生成，可按天执行。' });
      await this.loadItineraries();
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  async toggleDone(event: WechatMiniprogram.TouchEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const done = event.currentTarget.dataset.done === 'true';
    try {
      await request(`/api/v1/itinerary-items/${id}`, 'PATCH', { done });
      await this.reloadCurrent();
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  async addNote(event: WechatMiniprogram.TouchEvent) {
    const id = Number(event.currentTarget.dataset.id);
    const result = await wxShowModal('行程备注', '写下现场提醒或调整原因');
    if (!result.confirm) {
      return;
    }
    try {
      await request(`/api/v1/itinerary-items/${id}`, 'PATCH', { note: result.content || '' });
      await this.reloadCurrent();
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  async createShare() {
    const itineraryId = this.data.currentItinerary?.itinerary.id;
    if (!itineraryId) {
      return;
    }
    try {
      await ensureUserId();
      const share = await request<ShareView>(`/api/v1/itineraries/${itineraryId}/share`, 'POST');
      wx.navigateTo({ url: `/pages/share/index?shareCode=${share.shareCode}` });
    } catch (error) {
      this.setData({ status: messageOf(error) });
    }
  },

  async reloadCurrent() {
    const itineraryId = this.data.currentItinerary?.itinerary.id;
    if (!itineraryId) {
      return;
    }
    const currentItinerary = await request<ItineraryDetail>(`/api/v1/itineraries/${itineraryId}`);
    this.setData({ currentItinerary });
  }
});

function wxShowModal(title: string, placeholderText: string): Promise<WechatMiniprogram.ShowModalSuccessCallbackResult & { content?: string }> {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText,
      success: (res) => resolve(res as WechatMiniprogram.ShowModalSuccessCallbackResult & { content?: string })
    });
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
