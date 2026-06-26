import { TENCENT_MAP_KEY, TENCENT_MAP_SEARCH_URL } from './config';

export const MAP_SEARCH_CATEGORIES = [
  { id: 'landmark', label: '地标', keyword: '地标 建筑' },
  { id: 'scenery', label: '景观', keyword: '名胜古迹 景区 公园' },
  { id: 'food', label: '美食', keyword: '餐厅 小吃街 美食' },
  { id: 'transport', label: '交通', keyword: '地铁站 公交站 汽车站 机场 火车站' },
  { id: 'inspiration', label: '灵感', keyword: '景点 美食 地标' }
] as const;

export type MapSearchCategory = (typeof MAP_SEARCH_CATEGORIES)[number];
export type MapSearchCategoryId = MapSearchCategory['id'];

export interface MapSearchCenter {
  lng: number;
  lat: number;
}

export interface TencentPoi {
  id: string;
  title: string;
  address: string;
  category: string;
  location: MapSearchCenter;
  distance?: number;
}

interface TencentPlaceSearchResponse {
  status: number;
  message?: string;
  data?: TencentPlace[];
}

interface TencentPlace {
  id?: string;
  title?: string;
  address?: string;
  category?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  _distance?: number;
}

interface SearchTencentPlacesOptions {
  keyword: string;
  center: MapSearchCenter;
  radiusMeters?: number;
  pageSize?: number;
}

export function searchTencentPlaces(options: SearchTencentPlacesOptions): Promise<TencentPoi[]> {
  const keyword = options.keyword.trim();
  if (!keyword) {
    return Promise.resolve([]);
  }

  if (!TENCENT_MAP_KEY) {
    return Promise.reject(new Error('腾讯地图 Key 未配置'));
  }

  const radiusMeters = clampInteger(options.radiusMeters || 6000, 500, 20000);
  const pageSize = clampInteger(options.pageSize || 20, 1, 20);

  return new Promise<TencentPoi[]>((resolve, reject) => {
    wx.request<TencentPlaceSearchResponse>({
      url: TENCENT_MAP_SEARCH_URL,
      data: {
        key: TENCENT_MAP_KEY,
        keyword,
        boundary: `nearby(${options.center.lat},${options.center.lng},${radiusMeters})`,
        page_size: pageSize,
        page_index: 1,
        orderby: '_distance'
      },
      success: (res) => {
        const body = res.data;
        if (res.statusCode >= 400) {
          reject(new Error(`腾讯地图搜索失败：HTTP ${res.statusCode}`));
          return;
        }
        if (!body || body.status !== 0) {
          reject(new Error(body?.message || `腾讯地图搜索失败：${body?.status ?? 'unknown'}`));
          return;
        }
        resolve(normalizePlaces(body.data || []));
      },
      fail: (error) => reject(error)
    });
  });
}

function normalizePlaces(places: TencentPlace[]): TencentPoi[] {
  return places
    .filter((place) => isFiniteNumber(place.location?.lat) && isFiniteNumber(place.location?.lng))
    .map((place, index) => {
      const lat = Number(place.location?.lat);
      const lng = Number(place.location?.lng);
      return {
        id: String(place.id || `${place.title || 'poi'}-${index}-${lat}-${lng}`),
        title: String(place.title || '未命名地点'),
        address: String(place.address || ''),
        category: String(place.category || ''),
        location: { lat, lng },
        distance: isFiniteNumber(place._distance) ? Number(place._distance) : undefined
      };
    });
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.round(value), min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
