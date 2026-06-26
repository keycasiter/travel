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

export interface Itinerary {
  id: number;
  userId: number;
  destinationRegionId: string;
  title: string;
  days: number;
  status: string;
  budgetCents: number;
  shareCode?: string;
}

export interface ItineraryDay {
  id: number;
  itineraryId: number;
  dayIndex: number;
  summary: string;
}

export interface ItineraryItem {
  id: number;
  dayId: number;
  poiId: string;
  sortOrder: number;
  startHint: string;
  durationMinutes: number;
  transportHint: string;
  note: string;
  done: boolean;
}

export interface ItineraryItemDetail {
  item: ItineraryItem;
  poi: Poi;
}

export interface ItineraryDayDetail {
  day: ItineraryDay;
  items: ItineraryItemDetail[];
}

export interface ItineraryDetail {
  itinerary: Itinerary;
  days: ItineraryDayDetail[];
}

export interface Favorite {
  id: number;
  userId: number;
  targetType: string;
  targetId: string;
}

export interface WeatherSummary {
  regionId: string;
  summary: string;
  temperatureRange: string;
  tips: string[];
}

export interface ShareSnapshot {
  title: string;
  destinationRegionId: string;
  budgetCents: number;
  days: Array<{
    dayIndex: number;
    summary: string;
    items: Array<{
      poiId: string;
      startHint: string;
      durationMinutes: number;
      transportHint: string;
      note: string;
    }>;
  }>;
}

export interface ShareView {
  shareCode: string;
  snapshot: ShareSnapshot;
}
