"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAP_SEARCH_CATEGORIES = void 0;
exports.searchTencentPlaces = searchTencentPlaces;
exports.suggestTencentPlaces = suggestTencentPlaces;
const api_1 = require("./api");
exports.MAP_SEARCH_CATEGORIES = [
    { id: 'landmark', label: '地标', keyword: '地标', categories: ['旅游景点', '文化场馆'] },
    { id: 'scenery', label: '景观', keyword: '景点', categories: ['旅游景点', '文化场馆'] },
    { id: 'food', label: '美食', keyword: '美食', categories: ['美食'] },
    { id: 'transport', label: '交通', keyword: '交通', categories: ['交通设施'] },
    { id: 'inspiration', label: '灵感', keyword: '灵感', categories: ['旅游景点', '文化场馆', '美食'] }
];
function searchTencentPlaces(options) {
    const keyword = options.keyword.trim();
    if (!keyword) {
        return Promise.resolve([]);
    }
    const pageSize = clampInteger(options.pageSize || 20, 1, 20);
    const queryParams = {
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
    }
    else if (options.center) {
        const radiusMeters = clampInteger(options.radiusMeters || 1000, 100, 1000);
        queryParams.boundary = 'nearby';
        queryParams.lat = options.center.lat;
        queryParams.lng = options.center.lng;
        queryParams.radiusMeters = radiusMeters;
    }
    else {
        return Promise.resolve([]);
    }
    return (0, api_1.request)(`/api/v1/map/places/search?${toQueryString(queryParams)}`);
}
function suggestTencentPlaces(options) {
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
    return (0, api_1.request)(`/api/v1/map/places/suggest?${query}`);
}
function clampInteger(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(Math.round(value), min), max);
}
function categoriesToParam(categories) {
    const values = (categories || []).map((item) => item.trim()).filter(Boolean).slice(0, 5);
    return values.length > 0 ? values.join(',') : undefined;
}
function toQueryString(params) {
    return Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== '')
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
        .join('&');
}
