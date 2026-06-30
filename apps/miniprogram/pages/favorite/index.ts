import { request } from '../../utils/api';
import { ensureUserId } from '../../utils/auth';
import type { Favorite } from '../../utils/types';

interface FavoriteView extends Favorite {
  displayTitle: string;
  displaySummary: string;
  displayBadge: string;
}

Page({
  data: {
    favorites: [] as FavoriteView[],
    status: '沉淀想去的片区、景点、路线和精选攻略。'
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    try {
      await ensureUserId();
      const favorites = await request<Favorite[]>('/api/v1/favorites');
      this.setData({
        favorites: favorites.map(toFavoriteView),
        status: favorites.length ? '杭州收藏内容' : '还没有收藏。去探索地图中收藏杭州景点、攻略或片区。'
      });
    } catch (error) {
      this.setData({ status: error instanceof Error ? error.message : String(error) });
    }
  }
});

function toFavoriteView(favorite: Favorite): FavoriteView {
  const meta = FAVORITE_COPY[favorite.targetId] || {
    title: favorite.targetId,
    summary: '杭州 MVP 收藏内容，可继续加入行程或作为攻略参考。',
    badge: favorite.targetType
  };
  return {
    ...favorite,
    displayTitle: meta.title,
    displaySummary: meta.summary,
    displayBadge: meta.badge
  };
}

const FAVORITE_COPY: Record<string, { title: string; summary: string; badge: string }> = {
  'city-hangzhou': { title: '杭州', summary: '杭州先行版完整城市内容，含片区、点位、攻略和行程闭环。', badge: '城市' },
  'poi-hangzhou-westlake': { title: '西湖苏堤', summary: '清晨或傍晚慢走最稳，适合作为杭州第一段湖线。', badge: '景点' },
  'poi-hangzhou-lingyin': { title: '灵隐寺', summary: '杭州山寺线核心点位，建议早出发并预留半日。', badge: '景点' },
  'poi-hangzhou-longjing-village': { title: '龙井村', summary: '茶田、茶歇和慢游片区，适合接在灵隐之后。', badge: '茶线' },
  'poi-hangzhou-hubin': { title: '湖滨夜景', summary: '适合第一晚收尾，餐饮、商圈和西湖夜景衔接方便。', badge: '夜景' },
  'guide-hangzhou-48h': { title: '杭州 48 小时慢游精选攻略', summary: '两天一夜杭州核心路线，覆盖西湖、湖滨、南山路和灵隐。', badge: '攻略' },
  'guide-hangzhou-westlake-walk': { title: '西湖半日不绕湖路线', summary: '避免全天绕湖，把体力留给湖滨夜景和第二天山寺线。', badge: '攻略' },
  'guide-hangzhou-lingyin-longjing': { title: '灵隐龙井半日山寺茶线', summary: '灵隐、飞来峰、龙井村和九溪的半日组合建议。', badge: '攻略' },
  'guide-hangzhou-food-avoidance': { title: '杭州餐饮住宿与避坑提示', summary: '湖滨、武林、凤起路住宿和西湖餐饮排队避坑。', badge: '攻略' },
  'guide-hangzhou-rainy-day': { title: '杭州雨天替代方案', summary: '雨天用博物馆、运河街区、湖滨商圈和茶馆替换户外段。', badge: '攻略' }
};
