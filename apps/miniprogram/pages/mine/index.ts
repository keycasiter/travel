import { API_BASE_URL } from '../../utils/config';
import { request } from '../../utils/api';
import type { Itinerary } from '../../utils/types';

Page({
  data: {
    apiBaseUrl: API_BASE_URL,
    userId: '',
    itineraryCount: 0,
    status: '查看授权状态、已保存行程和本地开发配置。'
  },

  onShow() {
    this.loadMine();
  },

  async loadMine() {
    const userId = wx.getStorageSync('userId') as number | '';
    if (!userId) {
      this.setData({ userId: '', itineraryCount: 0, status: '尚未建立本地用户身份。' });
      return;
    }
    try {
      const itineraries = await request<Itinerary[]>('/api/v1/itineraries');
      this.setData({ userId: String(userId), itineraryCount: itineraries.length, status: '本地用户身份已建立。' });
    } catch (error) {
      this.setData({ userId: String(userId), status: error instanceof Error ? error.message : String(error) });
    }
  }
});
