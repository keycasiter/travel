"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGeoBounds = computeGeoBounds;
exports.createViewportProjector = createViewportProjector;
exports.projectRegionMarkers = projectRegionMarkers;
exports.findNearestRegion = findNearestRegion;
exports.distanceKm = distanceKm;
exports.forEachTuple = forEachTuple;
function computeGeoBounds(features) {
    const bounds = {
        minLng: Number.POSITIVE_INFINITY,
        maxLng: Number.NEGATIVE_INFINITY,
        minLat: Number.POSITIVE_INFINITY,
        maxLat: Number.NEGATIVE_INFINITY
    };
    for (const feature of features) {
        forEachTuple(feature, (point) => extendBounds(bounds, point));
    }
    if (!Number.isFinite(bounds.minLng) || !Number.isFinite(bounds.minLat)) {
        throw new Error('China map data has no coordinates');
    }
    return bounds;
}
function createViewportProjector(bounds, viewport) {
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 1);
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 1);
    const safeWidth = Math.max(viewport.width - viewport.padding * 2, 1);
    const safeHeight = Math.max(viewport.height - viewport.padding * 2, 1);
    const baseScale = Math.min(safeWidth / lngSpan, safeHeight / latSpan);
    const mapWidth = lngSpan * baseScale;
    const mapHeight = latSpan * baseScale;
    const baseX = (viewport.width - mapWidth) / 2 - bounds.minLng * baseScale;
    const baseY = (viewport.height - mapHeight) / 2 + bounds.maxLat * baseScale;
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    return {
        bounds,
        viewport,
        project(point) {
            const rawX = baseX + point.lng * baseScale;
            const rawY = baseY - point.lat * baseScale;
            return {
                x: centerX + (rawX - centerX) * viewport.scale + viewport.offsetX,
                y: centerY + (rawY - centerY) * viewport.scale + viewport.offsetY
            };
        }
    };
}
function projectRegionMarkers(regions, projector) {
    return regions
        .filter((region) => Number.isFinite(region.centerLng) && Number.isFinite(region.centerLat))
        .map((region) => {
        const point = projector.project({ lng: region.centerLng, lat: region.centerLat });
        return {
            ...region,
            x: point.x,
            y: point.y,
            left: (point.x / projector.viewport.width) * 100,
            top: (point.y / projector.viewport.height) * 100
        };
    });
}
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
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function forEachTuple(feature, visit) {
    if (feature.rings) {
        for (const ring of feature.rings) {
            for (const point of ring) {
                visit(point);
            }
        }
    }
    if (feature.lines) {
        for (const line of feature.lines) {
            for (const point of line) {
                visit(point);
            }
        }
    }
}
function extendBounds(bounds, point) {
    bounds.minLng = Math.min(bounds.minLng, point[0]);
    bounds.maxLng = Math.max(bounds.maxLng, point[0]);
    bounds.minLat = Math.min(bounds.minLat, point[1]);
    bounds.maxLat = Math.max(bounds.maxLat, point[1]);
}
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
