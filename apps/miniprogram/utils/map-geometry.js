"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGeoBounds = computeGeoBounds;
exports.createViewportProjector = createViewportProjector;
exports.clampMapScale = clampMapScale;
exports.createFocusedViewport = createFocusedViewport;
exports.projectRegionMarkers = projectRegionMarkers;
exports.findNearestRegion = findNearestRegion;
exports.findContainingMapFeature = findContainingMapFeature;
exports.findMapFeatureAtViewportPoint = findMapFeatureAtViewportPoint;
exports.distanceKm = distanceKm;
exports.forEachTuple = forEachTuple;
const MIN_MAP_SCALE = 0.78;
const MAX_MAP_SCALE = 2.35;
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
        },
        unproject(point) {
            const rawX = centerX + (point.x - viewport.offsetX - centerX) / viewport.scale;
            const rawY = centerY + (point.y - viewport.offsetY - centerY) / viewport.scale;
            return {
                lng: (rawX - baseX) / baseScale,
                lat: (baseY - rawY) / baseScale
            };
        }
    };
}
function clampMapScale(scale) {
    return Math.max(MIN_MAP_SCALE, Math.min(MAX_MAP_SCALE, scale));
}
function createFocusedViewport(bounds, viewport, point, scale, anchorYRatio = 0.48) {
    const nextScale = clampMapScale(scale);
    const projector = createViewportProjector(bounds, {
        ...viewport,
        scale: nextScale,
        offsetX: 0,
        offsetY: 0
    });
    const projected = projector.project(point);
    return {
        ...viewport,
        scale: nextScale,
        offsetX: viewport.width * 0.5 - projected.x,
        offsetY: viewport.height * anchorYRatio - projected.y
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
function findContainingMapFeature(features, point) {
    for (const feature of features) {
        if (!feature.rings) {
            continue;
        }
        for (const ring of feature.rings) {
            if (isPointInRing(point, ring)) {
                return feature;
            }
        }
    }
    return null;
}
function findMapFeatureAtViewportPoint(features, bounds, viewport, point) {
    const projector = createViewportProjector(bounds, viewport);
    return findContainingMapFeature(features, projector.unproject(point));
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
function isPointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
