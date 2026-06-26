"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNearestRegion = findNearestRegion;
exports.distanceKm = distanceKm;
function findNearestRegion(regions, point) {
    let nearest = null;
    for (const region of regions) {
        if (!Number.isFinite(region.centerLng) || !Number.isFinite(region.centerLat)) {
            continue;
        }
        const distance = distanceKm(point, { lng: region.centerLng, lat: region.centerLat });
        if (!nearest || distance < nearest.distanceKm) {
            nearest = { region, distanceKm: distance };
        }
    }
    if (!nearest) {
        throw new Error('No regions with valid coordinates');
    }
    return nearest;
}
function distanceKm(a, b) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
