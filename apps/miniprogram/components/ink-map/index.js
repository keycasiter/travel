"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const china_provinces_1 = require("../../data/china-provinces");
const map_geometry_1 = require("../../utils/map-geometry");
const CHINA_VIEW_BOUNDS = (0, map_geometry_1.computeChinaViewBounds)(china_provinces_1.chinaProvinces);
Component({
    properties: {
        regions: {
            type: Array,
            value: []
        },
        selectedRegionId: {
            type: String,
            value: ''
        },
        currentLocation: {
            type: Object,
            value: {}
        }
    },
    data: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        displayRegions: [],
        displayCurrentLocation: null,
        isInteracting: false,
        touchState: null
    },
    lifetimes: {
        ready() {
            this.drawInkMap();
        }
    },
    observers: {
        regions() {
            this.drawInkMap();
        },
        selectedRegionId() {
            this.drawInkMap();
        },
        currentLocation() {
            this.drawInkMap();
        }
    },
    methods: {
        drawInkMap(updateMarkers = true) {
            const runtime = getRuntime(this);
            runtime.needsMarkerUpdate = runtime.needsMarkerUpdate || updateMarkers;
            if (runtime.drawTimer !== null || runtime.drawInFlight) {
                runtime.drawQueued = true;
                return;
            }
            runtime.drawTimer = setTimeout(() => {
                runtime.drawTimer = null;
                this.flushInkMapDraw();
            }, updateMarkers ? 0 : 16);
        },
        flushInkMapDraw() {
            const runtime = getRuntime(this);
            runtime.drawInFlight = true;
            this.resolveCanvasRuntime((resolved) => {
                const shouldUpdateMarkers = runtime.needsMarkerUpdate;
                runtime.needsMarkerUpdate = false;
                drawBackground(resolved.ctx, resolved.width, resolved.height);
                const projector = (0, map_geometry_1.createViewportProjector)(CHINA_VIEW_BOUNDS, {
                    width: resolved.width,
                    height: resolved.height,
                    padding: Math.max(resolved.width * 0.075, 24),
                    scale: this.data.scale,
                    offsetX: this.data.offsetX,
                    offsetY: this.data.offsetY
                });
                drawChinaLayer(resolved.ctx, projector.project, china_provinces_1.chinaProvinces, !shouldUpdateMarkers);
                if (shouldUpdateMarkers) {
                    this.updateRegionMarkers(resolved.width, resolved.height);
                }
                runtime.drawInFlight = false;
                if (runtime.drawQueued) {
                    const nextNeedsMarkerUpdate = runtime.needsMarkerUpdate;
                    runtime.drawQueued = false;
                    this.drawInkMap(nextNeedsMarkerUpdate);
                }
            });
        },
        resolveCanvasRuntime(callback) {
            const runtime = getRuntime(this);
            if (runtime.canvas && runtime.ctx && runtime.width > 0 && runtime.height > 0) {
                callback(runtime);
                return;
            }
            const query = this.createSelectorQuery();
            query.select('#inkCanvas').fields({ node: true, size: true }).exec((res) => {
                const canvas = res?.[0]?.node;
                if (!canvas) {
                    runtime.drawInFlight = false;
                    return;
                }
                const width = Number(res[0].width || 320);
                const height = Number(res[0].height || 520);
                const pixelRatio = getPixelRatio();
                const canvasKey = `${width}:${height}:${pixelRatio}`;
                if (runtime.canvasKey !== canvasKey) {
                    canvas.width = width * pixelRatio;
                    canvas.height = height * pixelRatio;
                    runtime.canvasKey = canvasKey;
                }
                const ctx = canvas.getContext('2d');
                ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                ctx.clearRect(0, 0, width, height);
                runtime.canvas = canvas;
                runtime.ctx = ctx;
                runtime.width = width;
                runtime.height = height;
                runtime.pixelRatio = pixelRatio;
                callback(runtime);
            });
        },
        updateRegionMarkers(width, height) {
            const projector = (0, map_geometry_1.createViewportProjector)(CHINA_VIEW_BOUNDS, {
                width,
                height,
                padding: Math.max(width * 0.075, 24),
                scale: this.data.scale,
                offsetX: this.data.offsetX,
                offsetY: this.data.offsetY
            });
            const regions = this.data.regions || [];
            const markers = (0, map_geometry_1.projectRegionMarkers)(regions, projector).map((marker) => ({
                ...marker,
                markerLeft: marker.left,
                markerTop: marker.top,
                markerVisible: marker.left > -8 && marker.left < 108 && marker.top > -8 && marker.top < 108
            }));
            const currentLocation = this.data.currentLocation || null;
            let displayCurrentLocation = null;
            if (isValidLocation(currentLocation)) {
                const point = projector.project({ lng: currentLocation.lng, lat: currentLocation.lat });
                const markerLeft = (point.x / width) * 100;
                const markerTop = (point.y / height) * 100;
                displayCurrentLocation = {
                    ...currentLocation,
                    markerLeft,
                    markerTop,
                    markerVisible: markerLeft > -8 && markerLeft < 108 && markerTop > -8 && markerTop < 108
                };
            }
            this.setData({ displayRegions: markers, displayCurrentLocation });
        },
        tapRegion(event) {
            const regionId = String(event.currentTarget.dataset.id || '');
            if (regionId) {
                this.triggerEvent('regiontap', { regionId });
            }
        },
        tapMap(event) {
            const touch = event.changedTouches[0];
            if (!touch) {
                return;
            }
            const query = this.createSelectorQuery();
            query.select('#inkCanvas').boundingClientRect().exec((res) => {
                const rect = res?.[0];
                if (!rect) {
                    return;
                }
                const width = Number(rect.width || 320);
                const height = Number(rect.height || 520);
                const viewport = {
                    width,
                    height,
                    padding: Math.max(width * 0.075, 24),
                    scale: this.data.scale,
                    offsetX: this.data.offsetX,
                    offsetY: this.data.offsetY
                };
                const feature = (0, map_geometry_1.findMapFeatureAtViewportPoint)(china_provinces_1.chinaProvinces, CHINA_VIEW_BOUNDS, viewport, {
                    x: touch.clientX - Number(rect.left || 0),
                    y: touch.clientY - Number(rect.top || 0)
                });
                if (!feature?.center) {
                    return;
                }
                this.triggerEvent('featuretap', { name: feature.name, code: feature.code });
                this.focusLocation({ lng: feature.center[0], lat: feature.center[1], label: feature.name }, Math.max(this.data.scale, 1.68));
            });
        },
        locate() {
            this.triggerEvent('locate');
        },
        focusRegion(regionId) {
            const regions = this.data.regions || [];
            const region = regions.find((item) => item.id === regionId);
            if (!region) {
                return;
            }
            this.focusLocation({ lng: region.centerLng, lat: region.centerLat, label: region.name }, 1.45);
        },
        focusLocation(location, scale = 1.7) {
            const query = this.createSelectorQuery();
            query.select('#inkCanvas').fields({ size: true }).exec((res) => {
                const width = Number(res?.[0]?.width || 320);
                const height = Number(res?.[0]?.height || 520);
                const viewport = (0, map_geometry_1.createFocusedViewport)(CHINA_VIEW_BOUNDS, {
                    width,
                    height,
                    padding: Math.max(width * 0.075, 24),
                    scale: this.data.scale,
                    offsetX: this.data.offsetX,
                    offsetY: this.data.offsetY
                }, location, scale);
                this.setData({
                    scale: viewport.scale,
                    offsetX: viewport.offsetX,
                    offsetY: viewport.offsetY
                }, () => this.drawInkMap());
            });
        },
        zoomBy(event) {
            const delta = Number(event.currentTarget.dataset.delta || 0);
            this.setData({ scale: (0, map_geometry_1.clampMapScale)(this.data.scale + delta * 0.28) }, () => this.drawInkMap());
        },
        resetView() {
            this.setData({ scale: 1, offsetX: 0, offsetY: 0 }, () => this.drawInkMap());
        },
        touchStart(event) {
            const touches = event.touches;
            if (touches.length === 1) {
                this.setData({
                    isInteracting: true,
                    touchState: {
                        startX: touches[0].clientX,
                        startY: touches[0].clientY,
                        startDistance: 0,
                        startOffsetX: this.data.offsetX,
                        startOffsetY: this.data.offsetY,
                        startScale: this.data.scale
                    }
                });
                return;
            }
            if (touches.length >= 2) {
                this.setData({
                    isInteracting: true,
                    touchState: {
                        startX: touches[0].clientX,
                        startY: touches[0].clientY,
                        startDistance: distance(touches[0], touches[1]),
                        startOffsetX: this.data.offsetX,
                        startOffsetY: this.data.offsetY,
                        startScale: this.data.scale
                    }
                });
            }
        },
        touchMove(event) {
            const state = this.data.touchState;
            if (!state) {
                return;
            }
            const touches = event.touches;
            if (touches.length === 1) {
                this.data.offsetX = state.startOffsetX + touches[0].clientX - state.startX;
                this.data.offsetY = state.startOffsetY + touches[0].clientY - state.startY;
                this.drawInkMap(false);
                return;
            }
            if (touches.length >= 2 && state.startDistance > 0) {
                const next = distance(touches[0], touches[1]);
                this.data.scale = (0, map_geometry_1.clampMapScale)(state.startScale * (next / state.startDistance));
                this.drawInkMap(false);
            }
        },
        touchEnd() {
            this.setData({
                scale: this.data.scale,
                offsetX: this.data.offsetX,
                offsetY: this.data.offsetY,
                isInteracting: false,
                touchState: null
            }, () => this.drawInkMap());
        }
    }
});
function distance(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
function isValidLocation(location) {
    return !!location && Number.isFinite(location.lng) && Number.isFinite(location.lat);
}
function getRuntime(instance) {
    const host = instance;
    if (!host.__inkMapRuntime) {
        host.__inkMapRuntime = {
            width: 0,
            height: 0,
            pixelRatio: 1,
            canvasKey: '',
            drawTimer: null,
            drawInFlight: false,
            drawQueued: false,
            needsMarkerUpdate: false
        };
    }
    return host.__inkMapRuntime;
}
function getPixelRatio() {
    const wxApi = wx;
    if (wxApi.getWindowInfo) {
        return Math.min(wxApi.getWindowInfo().pixelRatio || 1, 2);
    }
    return Math.min(wxApi.getSystemInfoSync().pixelRatio || 1, 2);
}
function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fbf6e8');
    gradient.addColorStop(0.55, '#f2ead8');
    gradient.addColorStop(1, '#e3d4b8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#91a48f';
    ctx.beginPath();
    ctx.ellipse(width * 0.26, height * 0.68, width * 0.34, height * 0.08, -0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#b89159';
    ctx.beginPath();
    ctx.ellipse(width * 0.75, height * 0.3, width * 0.28, height * 0.07, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawChinaLayer(ctx, project, features, fastMode = false) {
    if (!fastMode) {
        drawFilledFeatures(ctx, project, features, 14, 16, 'rgba(79, 68, 43, 0.18)', 'rgba(79, 68, 43, 0)');
        drawFilledFeatures(ctx, project, features, 7, 8, 'rgba(62, 97, 78, 0.22)', 'rgba(62, 97, 78, 0)');
    }
    drawFilledFeatures(ctx, project, features, 0, 0, 'rgba(42, 103, 88, 0.92)', 'rgba(245, 238, 220, 0.5)');
    if (!fastMode) {
        drawLineFeatures(ctx, project, features);
    }
}
function drawFilledFeatures(ctx, project, features, offsetX, offsetY, fillStyle, strokeStyle) {
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = offsetX === 0 ? 0.8 : 0;
    ctx.shadowColor = offsetX === 0 ? 'rgba(31, 54, 49, 0.18)' : 'transparent';
    ctx.shadowBlur = offsetX === 0 ? 18 : 0;
    for (const feature of features) {
        if (!feature.rings) {
            continue;
        }
        for (const ring of feature.rings) {
            drawRingPath(ctx, project, ring, offsetX, offsetY);
            ctx.fill();
            if (offsetX === 0) {
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}
function drawLineFeatures(ctx, project, features) {
    ctx.save();
    ctx.strokeStyle = 'rgba(42, 103, 88, 0.6)';
    ctx.lineWidth = 1.2;
    if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([5, 6]);
    }
    for (const feature of features) {
        if (!feature.lines) {
            continue;
        }
        for (const line of feature.lines) {
            drawOpenPath(ctx, project, line);
            ctx.stroke();
        }
    }
    ctx.restore();
}
function drawRingPath(ctx, project, ring, offsetX, offsetY) {
    ctx.beginPath();
    ring.forEach((tuple, index) => {
        const point = project({ lng: tuple[0], lat: tuple[1] });
        if (index === 0) {
            ctx.moveTo(point.x + offsetX, point.y + offsetY);
            return;
        }
        ctx.lineTo(point.x + offsetX, point.y + offsetY);
    });
    ctx.closePath();
}
function drawOpenPath(ctx, project, line) {
    ctx.beginPath();
    line.forEach((tuple, index) => {
        const point = project({ lng: tuple[0], lat: tuple[1] });
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
            return;
        }
        ctx.lineTo(point.x, point.y);
    });
}
