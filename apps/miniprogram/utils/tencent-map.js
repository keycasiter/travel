"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAP_SEARCH_CATEGORIES = void 0;
exports.searchTencentPlaces = searchTencentPlaces;
const api_1 = require("./api");
exports.MAP_SEARCH_CATEGORIES = [
    { id: 'landmark', label: '地标', keyword: '地标 建筑' },
    { id: 'scenery', label: '景观', keyword: '名胜古迹 景区 公园' },
    { id: 'food', label: '美食', keyword: '餐厅 小吃街 美食' },
    { id: 'transport', label: '交通', keyword: '地铁站 公交站 汽车站 机场 火车站' },
    { id: 'inspiration', label: '灵感', keyword: '景点 美食 地标' }
];
function searchTencentPlaces(options) {
    const keyword = options.keyword.trim();
    if (!keyword) {
        return Promise.resolve([]);
    }
    const radiusMeters = clampInteger(options.radiusMeters || 6000, 500, 20000);
    const pageSize = clampInteger(options.pageSize || 20, 1, 20);
    const query = toQueryString({
        keyword,
        lat: options.center.lat,
        lng: options.center.lng,
        radiusMeters,
        pageSize
    });
    return (0, api_1.request)(`/api/v1/map/places/search?${query}`);
}
function clampInteger(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(Math.round(value), min), max);
}
function toQueryString(params) {
    return Object.keys(params)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
        .join('&');
}
