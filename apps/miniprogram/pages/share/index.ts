import { request } from '../../utils/api';
import type { ItineraryDetail, ShareView } from '../../utils/types';

Page({
  data: {
    shareCode: '',
    share: null as ShareView | null,
    status: '加载分享行程'
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ shareCode: query.shareCode || '' });
    if (query.shareCode) {
      this.loadShare(query.shareCode);
    }
  },

  async loadShare(shareCode: string) {
    try {
      const share = await request<ShareView>(`/api/v1/shares/${shareCode}`);
      this.setData({ share, status: '只读行程已加载' });
    } catch (error) {
      this.setData({ status: error instanceof Error ? error.message : String(error) });
    }
  },

  async copyShare() {
    if (!this.data.shareCode) {
      return;
    }
    try {
      await request<ItineraryDetail>(`/api/v1/shares/${this.data.shareCode}/copy`, 'POST');
      wx.switchTab({ url: '/pages/itinerary/index' });
    } catch (error) {
      this.setData({ status: error instanceof Error ? error.message : String(error) });
    }
  }
});
