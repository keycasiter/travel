export interface Region {
  id: string;
  name: string;
  level: string;
  parentId?: string;
  centerLat: number;
  centerLng: number;
  enabled: boolean;
  sortOrder: number;
}

export interface TravelService {
  id: string;
  regionId: string;
  type: string;
  title: string;
  summary: string;
  tips: string[];
}

export interface Poi {
  id: string;
  regionId: string;
  type: string;
  name: string;
  summary: string;
  lat: number;
  lng: number;
  tags: string[];
  durationMinutes: number;
  costLevel: number;
  hotScore: number;
}

export interface Guide {
  id: string;
  regionId: string;
  title: string;
  content: string;
  tags: string[];
  coverUrl: string;
  official: boolean;
}

export interface RegionOverview {
  region: Region;
  services: TravelService[];
  pois: Poi[];
  guides: Guide[];
}

export interface LoginResult {
  userId: number;
  token: string;
}
