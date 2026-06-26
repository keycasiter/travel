import { request } from './api';

export const MAP_SEARCH_CATEGORIES = [
  { id: 'landmark', label: '地标', keyword: '地标', categories: ['旅游景点', '文化场馆'] },
  { id: 'scenery', label: '景观', keyword: '景点', categories: ['旅游景点', '文化场馆'] },
  { id: 'food', label: '美食', keyword: '美食', categories: ['美食'] },
  { id: 'transport', label: '交通', keyword: '交通', categories: ['交通设施'] },
  { id: 'inspiration', label: '灵感', keyword: '灵感', categories: ['旅游景点', '文化场馆', '美食'] }
] as const;

export type MapSearchCategory = (typeof MAP_SEARCH_CATEGORIES)[number];
export type MapSearchCategoryId = MapSearchCategory['id'];

export interface MapSearchCenter {
  lng: number;
  lat: number;
}

export interface MapViewport {
  southwest: MapSearchCenter;
  northeast: MapSearchCenter;
}

export interface TencentPoi {
  id: string;
  title: string;
  address: string;
  category: string;
  location: MapSearchCenter;
  distance?: number;
}

interface SearchTencentPlacesOptions {
  keyword: string;
  center?: MapSearchCenter;
  viewport?: MapViewport | null;
  categories?: readonly string[];
  radiusMeters?: number;
  pageSize?: number;
}

interface SuggestTencentPlacesOptions {
  keyword: string;
  center?: MapSearchCenter;
  categories?: readonly string[];
  pageSize?: number;
}

export function searchTencentPlaces(options: SearchTencentPlacesOptions): Promise<TencentPoi[]> {
  const keyword = options.keyword.trim();
  if (!keyword) {
    return Promise.resolve([]);
  }

  const pageSize = clampInteger(options.pageSize || 20, 1, 20);
  const queryParams: Record<string, string | number | undefined> = {
    keyword,
    pageSize,
    categories: categoriesToParam(options.categories)
  };

  if (options.viewport) {
    queryParams.boundary = 'rectangle';
    queryParams.swLat = options.viewport.southwest.lat;
    queryParams.swLng = options.viewport.southwest.lng;
    queryParams.neLat = options.viewport.northeast.lat;
    queryParams.neLng = options.viewport.northeast.lng;
  } else if (options.center) {
    const radiusMeters = clampInteger(options.radiusMeters || 1000, 100, 1000);
    queryParams.boundary = 'nearby';
    queryParams.lat = options.center.lat;
    queryParams.lng = options.center.lng;
    queryParams.radiusMeters = radiusMeters;
  } else {
    return Promise.resolve([]);
  }

  return request<TencentPoi[]>(`/api/v1/map/places/search?${toQueryString(queryParams)}`);
}

export function suggestTencentPlaces(options: SuggestTencentPlacesOptions): Promise<TencentPoi[]> {
  const keyword = options.keyword.trim();
  if (!keyword) {
    return Promise.resolve([]);
  }

  const pageSize = clampInteger(options.pageSize || 20, 1, 20);
  const query = toQueryString({
    keyword,
    lat: options.center?.lat,
    lng: options.center?.lng,
    categories: categoriesToParam(options.categories),
    pageSize
  });

  return request<TencentPoi[]>(`/api/v1/map/places/suggest?${query}`);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.round(value), min), max);
}

function categoriesToParam(categories?: readonly string[]): string | undefined {
  const values = (categories || []).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  return values.length > 0 ? values.join(',') : undefined;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
}
