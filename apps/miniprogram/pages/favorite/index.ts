import { request } from '../../utils/api';
import type { Favorite } from '../../utils/types';

Page({
  data: {
    favorites: [] as Favorite[],
    status: '沉淀想去的片区、景点、路线和精选攻略。'
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    try {
      const favorites = await request<Favorite[]>('/api/v1/favorites');
      this.setData({ favorites, status: favorites.length ? '已收藏内容' : '还没有收藏。去探索地图中收藏景点、攻略或片区。' });
    } catch (error) {
      this.setData({ status: error instanceof Error ? error.message : String(error) });
    }
  }
});
